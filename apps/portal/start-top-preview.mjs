import { spawn, execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const portal = path.dirname(fileURLToPath(import.meta.url));
const api = path.resolve(portal, "../api");
const directory = path.resolve(portal, "../../.local-previews/top-navigation");
const database = path.join(directory, "preview.sqlite");
mkdirSync(directory, { recursive: true, mode: 0o700 });
if (!existsSync(database)) {
  const hint = "/tmp/ny-showroom-current";
  const source = process.env.NY_SOURCE_DATABASE ?? (existsSync(hint) ? path.join(readFileSync(hint, "utf8").trim(), "demo.sqlite") : "");
  if (!source || !existsSync(source)) throw new Error("The current preview database was not found. Set NY_SOURCE_DATABASE to its SQLite path.");
  execFileSync("python3", ["-c", "import sqlite3,sys; from urllib.parse import quote; source=sqlite3.connect('file:'+quote(sys.argv[1])+'?mode=ro',uri=True); target=sqlite3.connect(sys.argv[2]); source.backup(target); target.close(); source.close()", source, database]);
  chmodSync(database, 0o600);
  console.log("Created an isolated copy of the current preview database.");
} else console.log("Using the existing comparison database; its test changes are preserved.");
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach(child => child.kill("SIGTERM"));
  setTimeout(() => process.exit(code), 300).unref();
}
function launch(command, args, cwd, env) {
  const child = spawn(command, args, { cwd, env, stdio: "inherit" });
  children.push(child);
  child.on("error", error => { console.error(error.message); stop(1); });
  child.on("exit", code => { if (!stopping) stop(code ?? 1); });
  return child;
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
launch("php", ["artisan", "serve", "--host=127.0.0.1", "--port=8002", "--no-interaction"], api, {
  ...process.env, DB_CONNECTION: "sqlite", DB_DATABASE: database, DB_URL: "", NY_DEMO_API_ENABLED: "true", MAIL_MAILER: "array",
});
let ready = false;
for (let attempt = 0; attempt < 40 && !stopping; attempt++) {
  try { const response = await fetch("http://127.0.0.1:8002/api/demo/staff/team"); if (response.ok) { ready = true; break; } } catch {}
  await new Promise(resolve => setTimeout(resolve, 250));
}
if (!ready) { console.error("The comparison data service did not start."); stop(1); }
else {
  launch(process.execPath, [path.join(portal, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3002"], portal, {
    ...process.env, NY_WORKSPACE_LAYOUT: "top", API_BASE_URL: "http://127.0.0.1:8002",
  });
  console.log("Original layout: http://127.0.0.1:3000/\nTop-navigation comparison: http://127.0.0.1:3002/");
}
