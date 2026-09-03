# Snip CLI

A zero-dependency Node CLI for the Snip URL shortener backend.

## Commands

```bash
snip add <url>    # create a short link and print shortUrl
snip ls           # list code/hits/url rows
snip open <code>  # ask the backend for the redirect, then open the target URL
snip help         # show usage
```

The CLI reads the backend base URL from `SNIP_API`, defaulting to `http://localhost:3000`.

Examples:

```bash
node cli.js add https://example.com
node cli.js ls
node cli.js open abc123
```
