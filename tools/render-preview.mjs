// Renders the Learning Deck keys for review and the README:
//   docs/images/looks.png  every key (and its states) in the five looks
//   docs/images/layout.png the bundled 15-key layout in Glass, mid-quiz
import { mkdirSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { FX, keySvg } from "../shared/icons.js";
import { LEARN_FX } from "../plugins/learning/art.js";
import { SITE_LOOKS } from "../plugins/learning/catalogue.mjs";

Object.assign(FX, LEARN_FX);
const PH = Number(process.env.PHASE ?? 0.18);
const q = { text: "7 × 8", answer: "56", choices: ["54", "56", "48", "63"] };
const keys = [
	["lquiz", "azure", "Times tables", {}],
	["lquiz", "azure", "Times tables", { text: q.text, answer: q.answer, state: "ask", streak: 3 }],
	["lquiz", "azure", "Times tables", { text: q.text, answer: q.answer, state: "right", streak: 4 }],
	["lquiz", "azure", "Tell the time", { clock: { h: 3, m: 40 }, answer: "3:40", state: "ask" }],
	["lanswer", "violet", "Answer A", { letter: "A", text: "54" }],
	["lanswer", "violet", "Answer B", { letter: "B", text: "56", state: "right" }],
	["lanswer", "violet", "Answer D", { letter: "D", text: "63", state: "wrong" }],
	["lbee", "gold", "Spelling", {}],
	["lbee", "gold", "Spelling", { text: "friend", letters: 6, state: "ask" }],
	["lword", "jade", "Word", { text: "curious" }],
	["lfact", "cosmic", "Fun Fact", { text: "3 hearts", topic: "animal" }],
	["lread", "sky", "Read to Me", { speaking: true, frac: 0.4 }],
	["ltimer", "sunset", "Reading", { text: "12:30", frac: 0.38, running: true }],
	["lstars", "midas", "Stars", { n: 4, goal: 10 }],
	["lstars", "midas", "Stars", { n: 10, goal: 10 }],
	["ltask", "lime", "Practice", { done: true }],
	[SITE_LOOKS.typing.glyph, SITE_LOOKS.typing.theme, SITE_LOOKS.typing.label, {}],
	[SITE_LOOKS.scratch.glyph, SITE_LOOKS.scratch.theme, SITE_LOOKS.scratch.label, {}],
	["back", "slate", "Back", {}],
];
const looks = [["glass", "Glass (default)"], ["mono", "Mono"], ["neon", "Neon"], ["vivid", "Vivid"], ["pro", "Pro"]];
const key = ([glyph, theme, label, data], style, x, y, s, id) => {
	const svg = keySvg({ glyph, theme, label, style, data, motion: { kind: glyph, phase: PH } });
	return `<g transform="translate(${x} ${y}) scale(${s / 144})"><clipPath id="${id}"><rect width="144" height="144" rx="16"/></clipPath><g clip-path="url(#${id})">${svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g></g>`;
};
const png = (file, w, h, body) => {
	writeFileSync(file, new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}">${body}</svg>`, { font: { loadSystemFonts: true }, fitTo: { mode: "width", value: w } }).render().asPng());
	console.log("Rendered " + file);
};
mkdirSync("docs/images", { recursive: true });

const S = 112, G = 10, L = 150;
let body = `<rect width="${L + keys.length * (S + G) + G}" height="${looks.length * (S + G) + G}" rx="18" fill="#0B0D14"/>`;
looks.forEach(([style, name], r) => {
	body += `<text x="20" y="${G + r * (S + G) + S / 2 + 6}" fill="#E8EDF6" font-size="17" font-weight="600" font-family="Segoe UI, Arial, sans-serif">${name}</text>`;
	keys.forEach((k, c) => (body += key(k, style, L + G + c * (S + G), G + r * (S + G), S, `k${r}_${c}`)));
});
png("docs/images/looks.png", L + keys.length * (S + G) + G, looks.length * (S + G) + G, body);

const deck = [
	[["back", "slate", "Back", {}], keys[1], ["lstars", "midas", "Stars", { n: 4, goal: 10 }], keys[9], keys[10]],
	[keys[4], ["lanswer", "violet", "Answer B", { letter: "B", text: "56" }], ["lanswer", "violet", "Answer C", { letter: "C", text: "48" }], ["lanswer", "violet", "Answer D", { letter: "D", text: "63" }], keys[7]],
	[["lread", "sky", "Read to Me", {}], ["ltimer", "sunset", "Reading", { text: "20:00" }], ["ltask", "lime", "Practice", {}], keys[16], keys[17]],
];
const D = 132, DG = 16;
let d = `<rect width="${5 * (D + DG) + DG + 40}" height="${3 * (D + DG) + DG + 40}" rx="28" fill="#15171C"/><rect x="14" y="14" width="${5 * (D + DG) + DG + 12}" height="${3 * (D + DG) + DG + 12}" rx="20" fill="#0A0B0F"/>`;
deck.forEach((row, r) => row.forEach((k, c) => (d += key(k, "glass", 20 + DG + c * (D + DG), 20 + DG + r * (D + DG), D, `d${r}_${c}`))));
png("docs/images/layout.png", 5 * (D + DG) + DG + 40, 3 * (D + DG) + DG + 40, d);
