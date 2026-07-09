# 🌠 Starlite GUI

> Web app for searching course offerings University of Hawaiʻi and generating schedules

## Features

> Jump to [Quickstart](#quickstart) to get started

### Cross-Subject Course Search

<img src="assets/1_basic_search.png" width="750" height="503" alt="subject search">
<img src="assets/2_course_overview.png" width="750" height="469" alt="course overview">

- Search for multiple subjects for a campus and term and get details.

### Filtering Options

<img src="assets/3_keyword_search.png" width="750" height="302" alt="keyword search">

- Search in real time with keywords.

<img src="assets/4_advanced_search.png" width="750" height="537" alt="advanced search options">

- Or use advanced course filtering options.

### Schedule Generation

<img src="assets/5_schedule_seed.png" width="750" height="557" alt="course cart for schedules">
<img src="assets/6_schedules_preview.png" width="750" height="557" alt="preview of all possible schedules">

- Generate all possible schedules, with support for reserved blocks and class buffer times

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
