# 🌠 Starlite GUI

> Web app for searching course offerings University of Hawaiʻi and generating schedules

## Features

- **Search Courses**: browse/filter courses by number, CRN, days, times, format,
  instructor, keywords, and more; view section seat counts and meeting times.
- **Build Schedule**: add specific courses (optionally restricted to certain
  CRNs), set a minimum buffer time and blocked-off time ranges, then generate
  every valid conflict-free schedule and page through them with a weekly
  calendar view.

## Quickstart

Requires [Docker](https://docs.docker.com/engine/install/)

```bash
docker compose up
```

The starlite gui will be available at `http://localhost` after a few moments.

## Local Deployment

This app expects a running instance of the [starlite-api](https://github.com/dlg1206/starlite-api) at `http://localhost:8080`. Follow the [api readme](https://github.com/dlg1206/starlite-api#quickstart-guide) for details.

1. Clone the repo with submodules

```bash
git clone --recurse-submodules https://github.com/dlg1206/starlite
```

2. Install dependencies

```bash
npm install
```

3. Launch dev server

```bash
npm start
```

The starlite gui will be available at `http://localhost:4200`
