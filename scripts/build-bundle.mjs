import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = join(root, 'backend');
const frontendDir = join(root, 'frontend');
const cliDir = join(root, 'cli');
const bundleDir = join(root, 'bundle');
const frontendBuildDir = join(frontendDir, 'dist', 'snip-frontend', 'browser');
const shouldPush = process.argv.includes('--push');
const commitTrailer = 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>';

function windowsShellQuote(value) {
  const text = String(value);
  if (/^[A-Za-z0-9._:/\\-]+$/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '\\"')}"`;
}

function commandSpec(command, args) {
  if (process.platform === 'win32' && (command === 'npm' || command === 'npx')) {
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', [command, ...args].map(windowsShellQuote).join(' ')],
    };
  }

  return { command, args };
}

function run(command, args, cwd = root, options = {}) {
  const spec = commandSpec(command, args);
  const result = spawnSync(spec.command, spec.args, {
    cwd,
    env: process.env,
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const rendered = [command, ...args].join(' ');
    throw new Error(`Command failed in ${cwd}: ${rendered}`);
  }

  return options.capture ? String(result.stdout).trim() : '';
}

function git(args, cwd = root, options = {}) {
  return run('git', args, cwd, options);
}

function hasStagedDiff(cwd) {
  const result = spawnSync('git', ['diff', '--cached', '--quiet', '--exit-code'], {
    cwd,
    stdio: 'ignore',
  });
  return result.status !== 0;
}

function ensureGitIdentity(cwd) {
  const hasName = spawnSync('git', ['config', 'user.name'], { cwd, stdio: 'ignore' }).status === 0;
  const hasEmail = spawnSync('git', ['config', 'user.email'], { cwd, stdio: 'ignore' }).status === 0;

  if (!hasName) {
    git(['config', 'user.name', 'Snip Bundle Bot'], cwd);
  }
  if (!hasEmail) {
    git(['config', 'user.email', 'snip-bundle@example.invalid'], cwd);
  }
}

function checkoutBundleBranch() {
  git(['submodule', 'update', '--init', 'bundle']);
  git(['fetch', 'origin', 'bundle'], bundleDir);

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], bundleDir, { capture: true });
  if (branch === 'bundle') {
    return;
  }

  const localBranch = spawnSync('git', ['rev-parse', '--verify', 'bundle'], {
    cwd: bundleDir,
    stdio: 'ignore',
  }).status === 0;

  if (localBranch) {
    git(['checkout', 'bundle'], bundleDir);
  } else {
    git(['checkout', '-b', 'bundle', 'origin/bundle'], bundleDir);
  }
}

function emptyBundleDirectory() {
  for (const entry of readdirSync(bundleDir, { withFileTypes: true })) {
    if (entry.name === '.git') {
      continue;
    }
    rmSync(join(bundleDir, entry.name), { force: true, recursive: true });
  }
}

function writeBundleFiles() {
  emptyBundleDirectory();

  cpSync(join(backendDir, 'server.js'), join(bundleDir, 'server.js'));
  cpSync(join(cliDir, 'cli.js'), join(bundleDir, 'cli.js'));
  cpSync(frontendBuildDir, join(bundleDir, 'public'), { recursive: true });

  writeFileSync(join(bundleDir, '.env'), 'PUBLIC_DIR=./public\n');
  writeFileSync(
    join(bundleDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'snip-bundle',
        version: '1.0.0',
        private: true,
        scripts: {
          start: 'bun server.js',
        },
        bin: {
          snip: './cli.js',
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(bundleDir, 'Dockerfile'),
    'FROM oven/bun:1-alpine\nCOPY . .\nENV PORT=3000\nEXPOSE 3000\nCMD bun server.js\n',
  );
  writeFileSync(join(bundleDir, '.dockerignore'), '.git\n.gitmodules\nnode_modules\n');
  writeFileSync(
    join(bundleDir, 'railway.json'),
    `${JSON.stringify(
      {
        build: {
          builder: 'DOCKERFILE',
          dockerfilePath: 'Dockerfile',
        },
      },
      null,
      2,
    )}\n`,
  );
}

function commitIfChanged(cwd, message) {
  ensureGitIdentity(cwd);
  git(['add', '-A'], cwd);

  if (!hasStagedDiff(cwd)) {
    console.log(`Nothing to commit in ${cwd}.`);
    return false;
  }

  git(['commit', '-m', message, '-m', commitTrailer], cwd);
  return true;
}

function commitSuperprojectIfChanged() {
  ensureGitIdentity(root);
  git(['add', '.gitmodules', 'backend', 'frontend', 'cli', 'bundle']);

  if (!hasStagedDiff(root)) {
    console.log('Nothing to commit in the superproject.');
    return false;
  }

  git(['commit', '-m', 'Update generated bundle submodule']);
  return true;
}

console.log('Updating source submodules to branch tips...');
git(['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli']);
checkoutBundleBranch();

console.log('Installing frontend dependencies...');
run('npm', ['install'], frontendDir);

console.log('Building frontend...');
run('npx', ['ng', 'build'], frontendDir);

const frontendIndex = join(frontendBuildDir, 'index.html');
if (!existsSync(frontendIndex)) {
  throw new Error(`Frontend build missing expected file: ${frontendIndex}`);
}

console.log('Assembling generated bundle...');
mkdirSync(bundleDir, { recursive: true });
writeBundleFiles();

const bundleChanged = commitIfChanged(bundleDir, 'Build generated bundle');
const superprojectChanged = commitSuperprojectIfChanged();

if (shouldPush) {
  console.log('Pushing bundle branch...');
  git(['push', 'origin', 'HEAD:bundle'], bundleDir);

  console.log('Pushing main branch...');
  git(['push', 'origin', 'HEAD:main']);
} else {
  console.log('Run again with --push to publish bundle and main.');
}

if (!bundleChanged && !superprojectChanged) {
  console.log('Bundle is up to date; nothing changed.');
}
