// Fix maestro MCP entry in ~/.claude.json
// The Windows path contains backslashes which bash mangles —
// so we build it programmatically instead.
const fs = require('fs');

const configPath = 'C:/Users/joyda/.claude.json';
const javaExe =
  'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.17.10-hotspot\\bin\\java.exe';
const classpath = 'C:\\maestro\\lib\\*';

const j = JSON.parse(fs.readFileSync(configPath, 'utf8'));
delete j.mcpServers.maestro;
j.mcpServers.maestro = {
  command: javaExe,
  args: [
    '-classpath',
    classpath,
    'maestro.cli.AppKt',
    'mcp',
    '--no-viewer',
  ],
  env: { MAESTRO_SKIP_UPDATE_CHECK: 'true' },
  timeoutMs: 300000,
};
fs.writeFileSync(configPath, JSON.stringify(j, null, 2));

// Verify
const j2 = JSON.parse(fs.readFileSync(configPath, 'utf8'));
console.log('command :', j2.mcpServers.maestro.command);
console.log('args    :', JSON.stringify(j2.mcpServers.maestro.args, null, 2));
