import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
rmSync(output, { recursive: true, force: true });
mkdirSync(resolve(output, "src"), { recursive: true });
for (const path of ["index.html", "src/platform.js", "src/game.js"]) {
  copyFileSync(resolve(root, path), resolve(output, path));
}
console.log("NeonWings static build created at dist/");
