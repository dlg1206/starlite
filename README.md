# Starlite GUI
> Web app for searching course offerings University of Hawaiʻi and generating schedules

## Features
- **Search Courses**: browse/filter courses by number, CRN, days, times, format,
  instructor, keywords, and more; view section seat counts and meeting times.
- **Build Schedule**: add specific courses (optionally restricted to certain
  CRNs), set a minimum buffer time and blocked-off time ranges, then generate
  every valid conflict-free schedule and page through them with a weekly
  calendar view.

## Local Deployment

This app expects a running instance of the [starlite-api](https://github.com/dlg1206/starlite-api) at `http://localhost:8080`

Start the dev server with:

```bash
npm start   # ng serve
```

Then open `http://localhost:4200`.

To point at a different API host, edit `apiBaseUrl` in
`src/environments/environment.development.ts` (dev) or
`src/environments/environment.ts` (production build) — or serve this app
behind the same reverse proxy as the API and keep it as a relative `/api/v2`.
