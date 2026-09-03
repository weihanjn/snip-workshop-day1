#!/usr/bin/env node

const { spawn } = require('node:child_process');

const API_ORIGIN = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/+$/, '');

function usage() {
  return `Usage:
  snip add <url>     Create a short link and print its short URL
  snip ls            List links as a code/hits/url table
  snip open <code>   Open a short code's target URL in your browser

Environment:
  SNIP_API           Backend base URL (default: http://localhost:3000)`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isHttpUrl(value) {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function request(path, options = {}) {
  try {
    return await fetch(`${API_ORIGIN}${path}`, options);
  } catch {
    fail(`Could not reach Snip backend at ${API_ORIGIN}.`);
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function add(url) {
  if (!isHttpUrl(url)) {
    fail('Please provide a valid URL starting with http:// or https://.');
  }

  const response = await request('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const body = await readJson(response);

  if (!response.ok) {
    fail(body && body.error ? body.error : `Snip backend returned HTTP ${response.status}.`);
  }

  if (!body || typeof body.shortUrl !== 'string') {
    fail('Snip backend returned an unexpected response.');
  }

  console.log(body.shortUrl);
}

async function list() {
  const response = await request('/api/links');
  const links = await readJson(response);

  if (!response.ok) {
    fail(links && links.error ? links.error : `Snip backend returned HTTP ${response.status}.`);
  }

  if (!Array.isArray(links)) {
    fail('Snip backend returned an unexpected response.');
  }

  if (links.length === 0) {
    console.log('No links yet.');
    return;
  }

  const rows = links.map((link) => ({
    code: String(link.code || ''),
    hits: String(link.hits ?? ''),
    url: String(link.url || ''),
  }));
  const widths = {
    code: Math.max('CODE'.length, ...rows.map((row) => row.code.length)),
    hits: Math.max('HITS'.length, ...rows.map((row) => row.hits.length)),
  };

  console.log(`${'CODE'.padEnd(widths.code)}  ${'HITS'.padStart(widths.hits)}  URL`);
  for (const row of rows) {
    console.log(`${row.code.padEnd(widths.code)}  ${row.hits.padStart(widths.hits)}  ${row.url}`);
  }
}

function openTarget(target) {
  const platform = process.platform;
  let command;
  let args;

  if (platform === 'win32') {
    command = 'rundll32';
    args = ['url.dll,FileProtocolHandler', target];
  } else if (platform === 'darwin') {
    command = 'open';
    args = [target];
  } else {
    command = 'xdg-open';
    args = [target];
  }

  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => fail(`Could not open browser for ${target}.`));
  child.unref();
}

async function open(code) {
  if (!code || code.includes('/')) {
    fail('Please provide a short code.');
  }

  const response = await request(`/${encodeURIComponent(code)}`, { redirect: 'manual' });

  if (response.status === 404) {
    fail(`Unknown short code: ${code}`);
  }

  if (response.status < 300 || response.status >= 400) {
    fail(`Snip backend returned HTTP ${response.status}.`);
  }

  const location = response.headers.get('location');
  if (!location) {
    fail('Snip backend did not return a redirect target.');
  }

  openTarget(location);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(usage());
    return;
  }

  if (command === 'add') {
    if (args.length !== 1) {
      fail('Usage: snip add <url>');
    }
    await add(args[0]);
    return;
  }

  if (command === 'ls') {
    if (args.length !== 0) {
      fail('Usage: snip ls');
    }
    await list();
    return;
  }

  if (command === 'open') {
    if (args.length !== 1) {
      fail('Usage: snip open <code>');
    }
    await open(args[0]);
    return;
  }

  fail(`Unknown command: ${command}\n\n${usage()}`);
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : 'Unexpected error.');
});
