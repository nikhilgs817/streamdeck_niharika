// Checks that this repository's Design System 4 files are byte-identical to a Windows Toolkit checkout.
//   node tools/check-design.mjs [path to windows_toolkit]   (default ../windows_toolkit)
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FILES = ["shared/icons.js", "shared/icons-fx.js", "shared/app-design.js", "shared/brands/brand-keys.js", "shared/base.ts", "shared/motion.ts", "shared/ui/pi.html", "shared/ui/pi.js", "shared/ui/pi.css", "shared/ui/companion.js"];
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const toolkit = resolve(process.argv[2] ?? join(root, "..", "windows_toolkit"));
if (!existsSync(join(toolkit, "shared", "icons.js"))) {
	console.error(`No Windows Toolkit checkout at ${toolkit}. Clone https://github.com/nikhilgs817/windows_toolkit next to this repository, or pass its path.`);
	process.exit(2);
}
const drift = FILES.filter((f) => !readFileSync(join(root, f)).equals(readFileSync(join(toolkit, f))));
if (drift.length) { console.error(`Design System 4 differs from Windows Toolkit in: ${drift.join(", ")}`); process.exit(1); }
console.log(`Design System 4 matches Windows Toolkit (${FILES.length} files).`);
