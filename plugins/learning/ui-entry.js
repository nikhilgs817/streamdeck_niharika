// Settings-panel data for Learning Deck, bundled to ui/features.js (loaded after icons.js and companion.js, before pi.js).
// The shared panel names this plugin's keys "comp-<id>", so the catalogue and preset looks are registered under those ids.
import { LEARN_FX, LEARN_PICKABLE } from "./art.js";
import { FEATURES, GROUPS } from "./catalogue.mjs";

const icons = window.WinToolkitIcons;
Object.assign(icons.FX, LEARN_FX);
for (const g of LEARN_PICKABLE) if (!icons.PICKABLE.includes(g)) icons.PICKABLE.unshift(g);
window.WinToolkitFeatures = { groups: GROUPS, features: FEATURES.map((f) => ({ ...f, id: "comp-" + f.id })) };
for (const f of FEATURES) icons.PRESET_ICONS["comp-" + f.id] = { glyph: f.glyph, theme: f.theme, label: f.label ?? f.name, style: "glass" };
