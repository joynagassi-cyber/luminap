/**
 * cypress/tsconfig-paths — register tsconfig-paths so `import { ... } from
 * '@/…'` inside spec/support files resolves against the project's
 * `tsconfig.json` paths (`"@/*": ["./src/*"]`).
 *
 * Without this hook, `cypress run` fails with `Cannot find module '@/App'`
 * the moment a spec or support file uses an `@/` import — and the old
 * `cross-env TS_NODE_PROJECT=… tsx -r tsconfig-paths/register` chain is
 * broken on Windows (cmd.exe eats the `TS_NODE_PROJECT=` prefix and
 * `cross-env` is not installed). This hook keeps `cypress:run`
 * cross-platform by being a bare Node file with no shell prefix.
 *
 * Usage: `node -r ./cypress/tsconfig-paths-register.cjs node_modules/cypress/bin/cypress run`
 */
const path = require('node:path');
const fs = require('node:fs');

// Walk up to the nearest node_modules/tsconfig-paths; falls back to the
// project root's own node_modules.
const projectRoot = path.resolve(__dirname, '..');
const candidates = [
  path.join(projectRoot, 'node_modules/tsconfig-paths'),
  // tsconfig-paths may be hoisted to a workspace root under pnpm.
  ...(() => {
    const out = [];
    let dir = projectRoot;
    for (let i = 0; i < 5; i++) {
      out.push(path.join(dir, 'node_modules/tsconfig-paths'));
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return out;
  })(),
];
const mod = candidates.find((c) => fs.existsSync(c));
if (!mod) {
  console.error(
    '[cypress] tsconfig-paths not found — run `pnpm add -D tsconfig-paths` first.',
  );
  process.exit(1);
}

// tsconfig-paths expects a `baseUrl` + `paths` set; it reads `tsconfig.json`
// from `TS_NODE_PROJECT` (or `--project`), defaulting to cwd.
const register = require(mod).register;
const project =
  process.env.TS_NODE_PROJECT || path.join(projectRoot, 'tsconfig.json');
register({
  baseUrl: projectRoot,
  paths: {
    '@/*': ['./src/*'],
  },
  project,
  cwd: projectRoot,
});
