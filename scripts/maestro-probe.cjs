// Repro exact du spawn Node (child_process.spawn, pipes natifs).
const { spawn } = require("node:child_process");
const fs = require("node:fs");

function probe(label, cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, {
      windowsHide: true,
      env: { ...process.env, MAESTRO_SKIP_UPDATE_CHECK: "true" },
    });
    let buf = "";
    p.stdout.on("data", (d) => (buf += d));
    p.stderr.on("data", () => {});
    p.on("error", (e) => resolve({ label, err: e.code + " " + e.message }));
    setTimeout(() => {
      try {
        p.stdin.write(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: { name: "claude", version: "1.0" },
            },
          }) + "\n",
        );
      } catch (e) {}
    }, 6000);
    setTimeout(() => {
      try {
        p.stdin.write(
          JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) +
            "\n",
        );
      } catch (e) {}
    }, 10000);
    setTimeout(() => {
      p.kill();
      const ok = buf.includes('"protocolVersion"');
      fs.writeFileSync("/tmp/" + label.replace(/\W+/g, "_") + ".out", buf);
      resolve({
        label,
        ok,
        lines: buf.trim() ? buf.trim().split("\n").length : 0,
      });
    }, 16000);
  });
}

(async () => {
  const a = await probe(
    "A_bat_direct",
    "C:\\maestro\\bin\\maestro.bat",
    ["mcp", "--no-viewer"],
  );
  const b = await probe("B_cmd_wrapped", "cmd.exe", [
    "/d",
    "/s",
    "/c",
    "C:\\maestro\\bin\\maestro.bat",
    "mcp",
    "--no-viewer",
  ]);
  for (const r of [a, b]) {
    console.log(
      r.label +
        " -> " +
        (r.err
          ? "SPAWN ERREUR: " + r.err
          : r.ok
            ? "✅ RÉPOND (initialize + tools/list OK)"
            : "❌ SILENCIEUX (" + r.lines + " lignes de stdout)"),
    );
  }
})();
