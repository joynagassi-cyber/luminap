// Probe: spawn java directly + maestro CLI, send MCP initialize + tools/list
const { spawn } = require('node:child_process');
const javaExe =
  'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.17.10-hotspot\\bin\\java.exe';

const args = [
  '-classpath',
  'C:\\maestro\\lib\\*',
  'maestro.cli.AppKt',
  'mcp',
  '--no-viewer',
];

function run(label) {
  return new Promise((resolve) => {
    const p = spawn(javaExe, args, {
      windowsHide: true,
      env: { ...process.env, MAESTRO_SKIP_UPDATE_CHECK: 'true' },
    });
    let buf = '';
    p.stdout.on('data', (d) => (buf += d));
    p.stderr.on('data', (d) => {
      const s = String(d);
      if (s.includes('Exception') || s.includes('Error')) {
        process.stderr.write(s);
      }
    });
    p.on('error', (e) =>
      resolve({ label, err: e.code + ' ' + e.message, ok: false }),
    );
    setTimeout(() => {
      try {
        p.stdin.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2025-03-26',
              capabilities: {},
              clientInfo: { name: 'claude', version: '1.0' },
            },
          }) + '\n',
        );
      } catch {}
    }, 4000);
    setTimeout(() => {
      try {
        p.stdin.write(
          JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) +
            '\n',
        );
      } catch {}
    }, 6000);
    setTimeout(() => {
      p.kill();
      const lines = buf.trim() ? buf.trim().split('\n') : [];
      const ok = buf.includes('"protocolVersion"');
      const toolCount = (buf.match(/"name":\s*"/g) || []).length;
      resolve({
        label,
        ok,
        toolCount,
        lines: lines.length,
        preview: buf.slice(0, 200).replace(/\n/g, '\\n'),
      });
    }, 15000);
  });
}

(async () => {
  const r = await run('java_direct');
  console.log(
    r.label +
      ' -> ' +
      (r.err
        ? 'SPAWN ERREUR: ' + r.err
        : r.ok
          ? `OK — ${r.toolCount} outils, ${r.lines} lignes`
          : 'SILENCIEUX'),
  );
  if (r.preview) console.log('preview:', r.preview);
})();
