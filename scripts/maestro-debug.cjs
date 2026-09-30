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

const p = spawn(javaExe, args, {
  windowsHide: true,
  env: { ...process.env, MAESTRO_SKIP_UPDATE_CHECK: 'true' },
});
let out = '',
  err = '';
p.stdout.on('data', (d) => (out += d));
p.stderr.on('data', (d) => (err += d));
p.on('error', (e) => console.log('SPAWN ERR', e));
p.on('exit', (code, sig) => console.log('EXIT', code, sig));

setTimeout(
  () =>
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
    ),
  3000,
);
setTimeout(
  () =>
    p.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n',
    ),
  5000,
);
setTimeout(() => {
  p.kill();
  console.log('=== STDOUT (' + out.length + ' bytes) ===');
  console.log(out);
  console.log('=== STDERR (' + err.length + ' bytes) ===');
  console.log(err);
}, 30000);
