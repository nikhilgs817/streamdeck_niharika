// Generates manifest.json, every static image, the bundled key layout and the settings-panel data from one table,
// so names, UUIDs and art never drift.
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FX, PRESET_ICONS } from "../../shared/icons.js";
import { buildProfile, copyUi, writeActionImages, writePluginIcons, writer } from "../../tools/common.mjs";
import { LEARN_FX } from "./art.js";
import { FEATURES, SITE_LOOKS } from "./catalogue.mjs";

const here = dirname(fileURLToPath(import.meta.url));
export const UUID = "com.windowstoolkit.learning";
const sd = join(here, `${UUID}.sdPlugin`);
export const VERSION = "1.0.0.0";
export const PRODUCT_NAME = "Learning Deck";
const write = writer(sd);

// Learning Deck draws its own glyphs inside the shared design system.
Object.assign(FX, LEARN_FX);
for (const f of FEATURES) PRESET_ICONS[f.id] = { glyph: f.glyph, theme: f.theme, label: f.label ?? f.name, style: "glass" };

/** [id, name in the action list, tooltip], in catalogue order. */
const ACTIONS = FEATURES.map((f) => [f.id, f.name, f.tip]);

rmSync(join(sd, "imgs"), { recursive: true, force: true });
writeActionImages(sd, FEATURES.map((f) => ({ id: f.id, kind: f.id })));
writePluginIcons(sd, { glyph: "lcap", theme: "azure", categoryGlyph: "lcap" });

/** The bundled 15-key layout (Stream Deck MK.2 / Original): quiz in the middle, reading and routines below. */
const site = (id) => ["site", { site: id, iconGlyph: SITE_LOOKS[id].glyph, iconTheme: SITE_LOOKS[id].theme, iconLabel: SITE_LOOKS[id].label }];
const grid = (rows) => Object.fromEntries(rows.flatMap((row, r) => row.map((v, c) => [`${c},${r}`, v]).filter(([, v]) => v)));
export const LAYOUT = grid([
	["back", ["question", { subject: "times", level: "medium" }], "stars", "word", "fact"],
	[["answer", { slot: "A" }], ["answer", { slot: "B" }], ["answer", { slot: "C" }], ["answer", { slot: "D" }], "spellbee"],
	["readme", "readtimer", ["taskdone", { task: "Practice" }], site("typing"), site("scratch")],
]);
export const PROFILE = "profiles/LearningDeck";
rmSync(join(sd, "profiles"), { recursive: true, force: true });
buildProfile({ sd, uuid: UUID, pluginName: PRODUCT_NAME, version: VERSION, profile: PROFILE, title: PRODUCT_NAME, layout: LAYOUT, actions: ACTIONS });

const manifest = {
	$schema: "https://schemas.elgato.com/streamdeck/plugins/manifest.json",
	Name: PRODUCT_NAME,
	Version: VERSION,
	Author: "Windows Toolkit",
	Description: "Learning keys for kids: maths, times tables, telling the time, spelling, a word of the day, fun facts, read-aloud, a reading timer, a star chart and kid-safe learning sites. Works offline, with no accounts and nothing collected.",
	UUID,
	Icon: "imgs/plugin/icon",
	Category: PRODUCT_NAME,
	CategoryIcon: "imgs/plugin/category",
	CodePath: "bin/plugin.js",
	PropertyInspectorPath: "ui/pi.html",
	SDKVersion: 2,
	Software: { MinimumVersion: "7.1" },
	OS: [{ Platform: "windows", MinimumVersion: "10" }],
	Nodejs: { Version: "20" },
	Profiles: [{ Name: PROFILE, DeviceType: 0, Readonly: false, DontAutoSwitchWhenInstalled: true, AutoInstall: true }],
	Actions: ACTIONS.map(([id, name, tip]) => ({
		Name: name,
		UUID: `${UUID}.${id}`,
		Icon: `imgs/actions/${id}`,
		Tooltip: tip,
		Controllers: ["Keypad"],
		States: [{ Image: `imgs/keys/${id}`, ShowTitle: false, TitleAlignment: "bottom" }],
	})),
};
copyUi(sd);
// The shared panel treats keys named in WinToolkitCompanion as this plugin's own ("comp-<id>") and defaults them to Glass.
write("ui/companion.js", `window.WinToolkitCompanion = ${JSON.stringify({ uuid: UUID, name: PRODUCT_NAME, commands: [] })};\n`);
write("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");
console.log(`Generated ${PRODUCT_NAME} manifest + ${ACTIONS.length} actions`);
