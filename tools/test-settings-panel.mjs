// Loads the built settings-panel scripts the way Stream Deck does (icons.js → companion.js → features.js) and checks
// that every Learning Deck key gets its own settings, its art and a Glass preview, without a browser.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ui = join("plugins/learning/com.windowstoolkit.learning.sdPlugin", "ui");
const manifest = JSON.parse(readFileSync(join(ui, "../manifest.json"), "utf8"));
// In a browser the page's global object is `window`; here the sandbox plays that part.
const W = vm.createContext({ console });
W.window = W;
for (const f of ["icons.js", "companion.js", "features.js"]) vm.runInContext(readFileSync(join(ui, f), "utf8"), W, { filename: f });

let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { (ok ? pass++ : fail++); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); };

const html = readFileSync(join(ui, "pi.html"), "utf8");
const order = ["icons.js", "companion.js", "features.js", "pi.js"].map((f) => html.indexOf(`src="${f}"`));
check("panel loads icons, companion, features, then the panel script", order.every((i, n) => i > 0 && (n === 0 || i > order[n - 1])), order.join(","));
check("panel knows this plugin is Learning Deck", W.WinToolkitCompanion?.uuid === manifest.UUID && W.WinToolkitCompanion?.name === "Learning Deck");
const feats = W.WinToolkitFeatures?.features ?? [];
const ids = manifest.Actions.map((a) => a.UUID.split(".").pop());
check("every key has a settings entry under its panel kind", ids.every((id) => feats.some((f) => f.id === "comp-" + id)), feats.map((f) => f.id).join(","));
const Icons = W.WinToolkitIcons;
check("learning glyphs are in the panel's icon picker", ["lquiz", "lanswer", "lbee", "lstars", "lcap"].every((g) => Icons.PICKABLE.includes(g) && typeof Icons.FX[g] === "function"));
const bad = ids.filter((id) => {
	const p = Icons.PRESET_ICONS["comp-" + id];
	if (!p || p.style !== "glass") return true;
	const svg = Icons.keySvg({ ...p, style: p.style });
	return !svg.startsWith("<svg") || /NaN|undefined/.test(svg);
});
check("every key previews in Glass by default", !bad.length, bad.join(","));
const q = feats.find((f) => f.id === "comp-question");
check("question settings offer subject, level, table and choices", ["subject", "level", "table", "choices", "words", "speak", "rate"].every((k) => q.fields.some((f) => f.key === k)));
const site = feats.find((f) => f.id === "comp-site");
check("site settings offer which screen and screen order", ["site", "url", "open", "order"].every((k) => site.fields.some((f) => f.key === k)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
