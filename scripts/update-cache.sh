#!/usr/bin/env bash
set -euo pipefail

API_BASE="http://localhost:8080/api/v2"
METADATA_FILE="src/assets/data/metadata.json"
ENDPOINTS_FILE="src/assets/data/endpoint.json"
CONTAINER_NAME="starlite-api"
API_DIR="./api"          # adjust if the Gradle project lives elsewhere
JAVA_PID=""

# ---------------------------------------------------------------------------
# build + start api — via Docker if available, otherwise via Gradle + java
# ---------------------------------------------------------------------------
if command -v docker >/dev/null 2>&1; then
  echo "Docker found. Building api image..."
  BUILD_LOG=$(mktemp)
  if ! docker compose build api > "$BUILD_LOG" 2>&1; then
    echo "API build failed — aborting before attempting to run the jar." >&2
    echo "---- build output ----" >&2
    cat "$BUILD_LOG" >&2
    rm -f "$BUILD_LOG"
    exit 1
  fi
  rm -f "$BUILD_LOG"
  echo "Build succeeded."

  docker run --rm -d -p 8080:8080 --name "$CONTAINER_NAME" starlite-api >/dev/null

  cleanup() {
    echo "Stopping API..."
    docker stop -t 2 "$CONTAINER_NAME" >/dev/null 2>&1 \
      || docker kill "$CONTAINER_NAME" >/dev/null 2>&1 \
      || true
  }
  trap cleanup EXIT INT TERM
else
  echo "Docker not found. Falling back to Gradle build + java run..."

  if [ ! -x "$API_DIR/gradlew" ]; then
    echo "No Gradle wrapper found at $API_DIR/gradlew — cannot build the API." >&2
    echo "Install Docker, or ensure a Gradle wrapper is present in $API_DIR." >&2
    exit 1
  fi

  if ! command -v java >/dev/null 2>&1; then
    echo "java is not installed — cannot run the built jar." >&2
    echo "Install a JDK (e.g. via sdkman, apt, or brew), or install Docker instead." >&2
    exit 1
  fi

  GRADLE_LOG=$(mktemp)
  if ! (cd "$API_DIR" && ./gradlew build -x test) > "$GRADLE_LOG" 2>&1; then
    echo "Gradle build failed — aborting before attempting to run the jar." >&2
    echo "---- gradle output ----" >&2
    cat "$GRADLE_LOG" >&2
    rm -f "$GRADLE_LOG"
    exit 1
  fi
  rm -f "$GRADLE_LOG"
  echo "Gradle build succeeded."

  JAR_FILE=$(find "$API_DIR"/build/libs -maxdepth 1 -name "*.jar" ! -name "*-plain.jar" | head -n1)
  if [ -z "$JAR_FILE" ]; then
    echo "No jar found in $API_DIR/build/libs after build." >&2
    exit 1
  fi

  echo "Starting api from $JAR_FILE..."
  java -jar "$JAR_FILE" --server.port=8080 &
  JAVA_PID=$!

  cleanup() {
    if [ -n "$JAVA_PID" ] && kill -0 "$JAVA_PID" 2>/dev/null; then
      echo "Stopping API (pid $JAVA_PID)..."
      kill "$JAVA_PID"
      wait "$JAVA_PID" 2>/dev/null || true
    fi
  }
  trap cleanup EXIT INT TERM
fi

# ---------------------------------------------------------------------------
# await for api to be ready
# ---------------------------------------------------------------------------
echo "Waiting for API to become healthy..."
ready=false
for _ in $(seq 1 60); do
  if curl -sf "$API_BASE/actuator/health" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 2
done

if [ "$ready" != true ]; then
  echo "API failed to become healthy in time" >&2
  exit 1
fi
echo "API is up."

# ---------------------------------------------------------------------------
# start job
# ---------------------------------------------------------------------------
echo "Starting export job..."
start_response=$(curl -s -w '\n%{http_code}' -X POST "$API_BASE/exports/start")
http_code=$(echo "$start_response" | tail -n1)
body=$(echo "$start_response" | sed '$d')

if [ "$http_code" != "202" ]; then
  echo "Unexpected status starting export job: $http_code" >&2
  echo "$body" >&2
  exit 1
fi

job_id=$(echo "$body" | jq -r '.job_id')
poll_url=$(echo "$body" | jq -r '.poll_url')
echo "Job started: $job_id"

# ---------------------------------------------------------------------------
# progress bar with time elapsed and eta
# ---------------------------------------------------------------------------
start_time=$(date +%s)

format_duration() {
  local total_seconds=$1
  local mins=$(( total_seconds / 60 ))
  local secs=$(( total_seconds % 60 ))
  printf '%dm%02ds' "$mins" "$secs"
}

print_progress() {
  local completed=$1 total=$2 elapsed=$3
  local pct=0 eta="?" bar_len=40 filled=0

  if [ "$total" -gt 0 ]; then
    pct=$(( completed * 100 / total ))
    filled=$(( pct * bar_len / 100 ))
  fi

  if [ "$completed" -gt 0 ] && [ "$total" -gt 0 ]; then
    eta=$(format_duration $(( elapsed * (total - completed) / completed )))
  fi

  local bar
  bar=$(printf '%*s' "$filled" '' | tr ' ' '#')
  bar=$(printf '%-*s' "$bar_len" "$bar")

  printf '\r[%s] %3d%% | %d/%d | elapsed: %s | eta: %s   ' \
    "$bar" "$pct" "$completed" "$total" "$(format_duration "$elapsed")" "$eta"
}

status="NOT_STARTED"
while true; do
  resp=$(curl -sf "$poll_url")
  status=$(echo "$resp" | jq -r '.status')
  completed=$(echo "$resp" | jq -r '.completed // 0')
  total=$(echo "$resp" | jq -r '.total // 0')
  failed=$(echo "$resp" | jq -r '.failed // 0')
  now=$(date +%s)
  elapsed=$(( now - start_time ))

  print_progress "$completed" "$total" "$elapsed"

  case "$status" in
    COMPLETED)
      echo
      echo "Job completed. completed=$completed total=$total failed=$failed"
      break
      ;;
    FAILED)
      echo
      echo "Job failed:" >&2
      echo "$resp" | jq -r '.errors[]?' >&2
      exit 1
      ;;
    *)
      sleep 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# compare checksums
# ---------------------------------------------------------------------------
old_checksum=""
if [ -f "$METADATA_FILE" ]; then
  old_checksum=$(jq -r '.checksum // empty' "$METADATA_FILE")
fi

echo "Fetching latest metadata..."
curl -sf "$API_BASE/exports/latest/metadata" -o "$METADATA_FILE"
new_checksum=$(jq -r '.checksum' "$METADATA_FILE")

echo "old checksum: ${old_checksum:-<none>}"
echo "new checksum: $new_checksum"

# ---------------------------------------------------------------------------
# update cache if needed
# ---------------------------------------------------------------------------
cache_updated=false
if [ -z "$old_checksum" ] || [ "$old_checksum" != "$new_checksum" ]; then
  echo "Checksum changed, refreshing endpoint cache..."
  curl -sf "$API_BASE/exports/latest/endpoints" -o "$ENDPOINTS_FILE"
  cache_updated=true
else
  echo "Checksum unchanged, endpoint cache left as-is."
fi

# ---------------------------------------------------------------------------
# stop api (also handled by the EXIT trap, but explicit per the original script)
# ---------------------------------------------------------------------------
if command -v docker >/dev/null 2>&1; then
  docker stop -t 2 "$CONTAINER_NAME" >/dev/null 2>&1 \
    || docker kill "$CONTAINER_NAME" >/dev/null 2>&1 \
    || true
else
  if [ -n "$JAVA_PID" ] && kill -0 "$JAVA_PID" 2>/dev/null; then
    kill "$JAVA_PID"
    wait "$JAVA_PID" 2>/dev/null || true
  fi
fi
trap - EXIT INT TERM
