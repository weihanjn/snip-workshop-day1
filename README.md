# Snip — backend

A tiny URL shortener backend: a single-file [Bun](https://bun.sh) server
(`server.js`) with **zero npm dependencies**. Links are stored in an
in-memory `Map`, so data resets whenever the server restarts.

## Run

```bash
bun install   # nothing to install — no dependencies
bun run start # or: bun run server.js
```

The server listens on `PORT` (default `3000`).

## API

### `POST /api/links`

Request body:

```json
{ "url": "https://example.com" }
```

- `201` on success:

  ```json
  {
    "code": "aZ3kQ9",
    "url": "https://example.com",
    "shortUrl": "https://your-base-url/aZ3kQ9",
    "hits": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
  ```

- `400` if the body isn't valid JSON, or `url` isn't a valid `http(s)` URL.

### `GET /api/links`

Returns `200` with an array of all links, each in the shape above.

### `GET /:code`

Redirects (`302`) to the original URL and increments its `hits` counter.
Returns `404` if the code is unknown.

## Configuration (environment variables)

| Variable      | Default                              | Description                                                                 |
| ------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| `PORT`        | `3000`                                 | Port the server listens on.                                                  |
| `BASE_URL`    | `https://$RAILWAY_PUBLIC_DOMAIN`, else `http://localhost:$PORT` | Origin used to build `shortUrl` values.       |
| `PUBLIC_DIR`  | *(unset)*                               | When set, also serve static files from this folder. `/` serves `index.html`. An existing static file always wins over a same-named short code. |

## Notes

- Short codes are 6 random base62 characters (`A-Za-z0-9`).
- CORS is open (`Access-Control-Allow-Origin: *`) and `OPTIONS` preflight
  requests are handled, so a browser app on another origin can call this API.
