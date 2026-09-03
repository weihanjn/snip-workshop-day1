# Snip workshop

Snip is a tiny URL shortener organized as one backend and two clients:

- `backend/` - a Bun API server that stores links in memory.
- `frontend/` - an Angular app that creates and lists short links.
- `cli/` - a zero-dependency Node CLI for the same API.
- `bundle/` - generated release output that serves the frontend from the backend.

This `main` branch is an aggregator. Each folder is a Git submodule pointing at a different branch of this same repository.

## API contract

| Method | Path | Request | Success | Error |
| --- | --- | --- | --- | --- |
| `POST` | `/api/links` | `{ "url": "https://..." }` | `201 { code, url, shortUrl, hits, createdAt }` | `400 { error }` for invalid JSON or non-http(s) URL |
| `GET` | `/api/links` | - | `200` array of link objects | - |
| `GET` | `/:code` | - | `302` redirect to the original URL and increments `hits` | `404` when unknown |

Link objects use 6-character base62 codes, start with `hits: 0`, and store `createdAt` as an ISO timestamp.

## Branch-per-layer layout

| Superproject path | Tracked branch | Purpose |
| --- | --- | --- |
| `backend/` | `backend` | Bun URL shortener API |
| `frontend/` | `frontend` | Angular browser UI |
| `cli/` | `cli` | Node CLI client |
| `bundle/` | `bundle` | Generated deployable release output |

The `.gitmodules` file records each submodule path, URL, and branch.

## Clone

Use `--recurse-submodules` so the three project folders are populated immediately:

```bash
git clone --recurse-submodules https://github.com/weihanjn/snip-workshop-day1.git
cd snip-workshop-day1
```

A plain `git clone` checks out only the superproject. The `backend/`, `frontend/`, and `cli/` folders will be empty until you initialize submodules:

```bash
git submodule update --init --recursive
```

## Run

Start the backend first:

```bash
cd backend
bun start
```

Then start the Angular client in another terminal:

```bash
cd frontend
npm install
npx ng serve
```

Use the CLI from a third terminal:

```bash
cd cli
node cli.js add https://example.com
node cli.js ls
node cli.js open <code>
```

The frontend and CLI both default to the backend at `http://localhost:3000`.

## Generated bundle

The `bundle/` submodule is generated output. Do not hand-edit it. To rebuild it from the branch tips of `backend`, `frontend`, and `cli`, run:

```bash
node scripts/build-bundle.mjs
```

That assembles `bundle/` with the Bun server, CLI, frontend build in `public/`, `.env`, Dockerfile, `.dockerignore`, `railway.json`, and a release `package.json`. It safely reports nothing to commit when repeated without source changes.

To also publish the generated bundle branch and updated `main` pointers:

```bash
node scripts/build-bundle.mjs --push
```

## Updating submodules

Each submodule is its own checkout. Make and publish layer changes inside that folder first:

```bash
cd backend
git checkout backend
# edit files
git add .
git commit -m "Update backend"
git push
```

Then bump the submodule pointer in the superproject:

```bash
cd ..
git submodule update --remote backend
git add backend
git commit -m "Update backend submodule"
git push
```

Use the same flow for `frontend`, `cli`, and generated `bundle`: commit and push inside the submodule folder, then from the superproject run `git submodule update --remote <path>`, `git add <path>`, commit the pointer bump, and push.
