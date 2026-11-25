// Unit checks for the Learning Deck's content and key art: every question is answerable, every choice list is sound,
// addresses are safe, and every glyph draws cleanly in every look.
import { Resvg } from "@resvg/resvg-js";
import { FX, PICKABLE, keySvg } from "../shared/icons.js";
import { LEARN_FX, LEARN_PICKABLE } from "../plugins/learning/art.js";
import { FEATURES, GROUPS, SITE_LOOKS } from "../plugins/learning/catalogue.mjs";
import { FACTS, LEVELS, SITES, SPELLING, SUBJECT_IDS, WORDS, makeQuestion, ownWords, rng, siteUrl, todayKey, wordList, wordOfDay } from "../plugins/learning/content.js";

let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { (ok ? pass++ : fail++); if (!ok || process.env.VERBOSE) console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); };

/* ---------------- questions */
const solve = (t) => {
	const m = /^(\d+) ([×÷+−]) (\d+)$/.exec(t);
	if (!m) return undefined;
	const [a, op, b] = [Number(m[1]), m[2], Number(m[3])];
	return op === "×" ? a * b : op === "÷" ? a / b : op === "+" ? a + b : a - b;
};
const bad = [];
for (const subject of SUBJECT_IDS) for (const [level] of LEVELS) for (const choices of [2, 3, 4]) for (let i = 0; i < 400; i++) {
	const q = makeQuestion({ subject, level, choices, random: rng(i * 7919 + choices) });
	const why = [];
	if (q.choices.length !== choices) why.push(`${q.choices.length} choices`);
	if (new Set(q.choices).size !== q.choices.length) why.push("repeated choice");
	if (!q.choices.includes(q.answer)) why.push("answer missing");
	if (!q.speak) why.push("nothing to say");
	if (q.subject === "clock") {
		if (!q.clock || q.clock.h < 1 || q.clock.h > 12 || q.clock.m < 0 || q.clock.m > 59) why.push("bad clock");
	} else if (q.subject === "spell") {
		if (!q.word || q.text.replace("_", q.answer) !== q.word) why.push(`missing letter wrong: ${q.text} / ${q.word}`);
	} else {
		const v = solve(q.text);
		if (v === undefined || String(v) !== q.answer) why.push(`wrong answer ${q.text} = ${q.answer}`);
		if (!Number.isInteger(v) || v < 0) why.push("not a whole number");
		if (q.choices.some((c) => !/^\d+$/.test(c))) why.push("negative or odd choice");
	}
	if (why.length) bad.push(`${subject}/${level}/${choices}: ${why.join(", ")}`);
}
check("every generated question is correct and its choices are sound (21,600 questions)", !bad.length, bad.slice(0, 3).join(" | "));

const easyMath = Array.from({ length: 300 }, (_, i) => makeQuestion({ subject: "math", level: "easy", random: rng(i) }));
check("easy plus and minus stays within 20", easyMath.every((q) => q.text.split(" ").every((p) => !/^\d+$/.test(p) || Number(p) <= 20) && Number(q.answer) <= 20));
const seven = Array.from({ length: 200 }, (_, i) => makeQuestion({ subject: "times", table: "7", random: rng(i) }));
check("a chosen times table is respected", seven.every((q) => q.text.split(" × ").includes("7")));
const divs = Array.from({ length: 200 }, (_, i) => makeQuestion({ subject: "divide", level: "medium", random: rng(i) }));
check("division always comes out whole", divs.every((q) => Number.isInteger(solve(q.text))));
check("unknown subjects fall back to plus and minus", makeQuestion({ subject: "nonsense", random: rng(1) }).subject === "math");
check("same seed gives the same question", JSON.stringify(makeQuestion({ subject: "times", random: rng(42) })) === JSON.stringify(makeQuestion({ subject: "times", random: rng(42) })));
const own = Array.from({ length: 100 }, (_, i) => makeQuestion({ subject: "spell", words: ["giraffe", "rainbow"], random: rng(i) }));
check("missing-letter questions use your own words", own.every((q) => ["giraffe", "rainbow"].includes(q.word)));

/* ---------------- word lists, words, facts, sites */
check("built-in spelling lists are clean lower-case words", Object.values(SPELLING).every((l) => l.length >= 30 && l.every((w) => /^[a-z]+$/.test(w))));
check("own spelling list is cleaned (commas, new lines, case, junk)", JSON.stringify(wordList("Giraffe, rainbow\n\n<b>bad</b>, x2y, ok")) === JSON.stringify(["giraffe", "rainbow", "ok"]), JSON.stringify(wordList("Giraffe, rainbow\n\n<b>bad</b>, x2y, ok")));
check("an empty own list falls back to grade 2", wordList("", "grade2").length === SPELLING.grade2.length);
check("50 built-in words, each with a meaning and an example", WORDS.length >= 50 && WORDS.every(([w, m, e]) => w && m && e && e.toLowerCase().includes(w.slice(0, 4))));
check("built-in words are unique", new Set(WORDS.map(([w]) => w)).size === WORDS.length);
check("own words read 'word = meaning' lines", JSON.stringify(ownWords("Brave = ready to face something hard\nno meaning\n= nothing")) === JSON.stringify([["brave", "ready to face something hard", ""]]));
const jan1 = new Date(2026, 0, 1, 9), jan2 = new Date(2026, 0, 2, 9), jan1late = new Date(2026, 0, 1, 23, 59);
check("word of the day is the same all day and changes at midnight", wordOfDay(WORDS, jan1) === wordOfDay(WORDS, jan1late) && wordOfDay(WORDS, jan1) !== wordOfDay(WORDS, jan2));
check("bonus words step to a different word", wordOfDay(WORDS, jan1, 7) !== wordOfDay(WORDS, jan1));
check("day keys use local dates", todayKey(jan1late) === "2026-01-01");
check("fun facts have a topic, a short headline and a spoken fact", FACTS.length >= 40 && FACTS.every(([t, h, f]) => ["space", "animal", "earth", "body"].includes(t) && h.length <= 22 && f.length > h.length), FACTS.filter(([, h]) => h.length > 22).map(([, h]) => h).join(", "));
check("every topic has at least 8 facts", ["space", "animal", "earth", "body"].every((t) => FACTS.filter(([x]) => x === t).length >= 8));
check("learning sites are https", SITES.every(([, , url]) => url.startsWith("https://")));
check("site addresses: only http and https are allowed", siteUrl("javascript:alert(1)") === undefined && siteUrl("file:///C:/Windows") === undefined && siteUrl("ms-settings:") === undefined && siteUrl("") === undefined);
check("site addresses: a bare domain gets https", siteUrl("pbskids.org") === "https://pbskids.org/" && siteUrl(" http://example.org ") === "http://example.org/");

/* ---------------- catalogue */
check("11 keys in four groups", FEATURES.length === 11 && GROUPS.length === 4 && FEATURES.every((f) => GROUPS.some(([id]) => id === f.group)));
check("every key has a name, tip, glyph and theme", FEATURES.every((f) => f.name && f.tip && f.glyph && f.theme));
check("every preset site has its own key look", SITES.every(([id]) => SITE_LOOKS[id]?.glyph && SITE_LOOKS[id]?.theme && SITE_LOOKS[id]?.label));
const fieldTypes = new Set(["number", "text", "select", "check", "textarea", "file", "folder", "secret"]);
check("settings use only field types the shared panel knows", FEATURES.every((f) => (f.fields ?? []).every((x) => fieldTypes.has(x.type) && x.key && x.label)));
check("select fields list their options and their default is one of them", FEATURES.every((f) => (f.fields ?? []).filter((x) => x.type === "select").every((x) => x.options?.length && (x.def === undefined || x.options.some(([v]) => v === x.def)))));

/* ---------------- art */
Object.assign(FX, LEARN_FX);
check("learning glyphs are added to the shared picker", LEARN_PICKABLE.length === Object.keys(LEARN_FX).length && LEARN_PICKABLE.every((g) => typeof FX[g] === "function"));
check("learning glyph names do not clash with the design system's", LEARN_PICKABLE.every((g) => !PICKABLE.includes(g)));
const STATES = {
	lquiz: [{}, { text: "7 × 8", answer: "56", state: "ask" }, { text: "7 × 8", answer: "56", state: "right" }, { text: "12345 + 67890", answer: "80235", state: "reveal" }, { clock: { h: 12, m: 55 }, answer: "12:55", state: "ask" }, { text: "pe_ple", answer: "o" }],
	lanswer: [{}, { letter: "A", text: "56" }, { letter: "B", text: "12:55", state: "right" }, { letter: "C", text: "o", state: "wrong", shake: -7 }, { letter: "D", state: "empty" }],
	lbee: [{}, { text: "beautiful", letters: 9, state: "ask" }, { text: "beautiful", letters: 9, state: "reveal" }],
	lword: [{}, { text: "magnificent" }],
	lfact: [{}, ...["space", "animal", "earth", "body"].map((topic) => ({ text: "A long headline!!", topic }))],
	lread: [{}, { speaking: true, frac: 0.5 }],
	ltimer: [{}, { text: "20:00", frac: 0 }, { text: "9:59", frac: 0.5, running: true }, { text: "0:01", frac: 0.99, paused: true }, { done: true }],
	lstars: [{}, { n: 0, goal: 10 }, { n: 7, goal: 10 }, { n: 12, goal: 10 }, { n: 99, goal: 50 }],
	ltask: [{}, { done: false }, { done: true }],
};
const problems = [];
let drawn = 0;
for (const glyph of LEARN_PICKABLE) for (const style of ["glass", "neon", "vivid", "mono", "pro"]) for (const data of STATES[glyph] ?? [{}]) for (const phase of [0, 0.5]) {
	const s = keySvg({ glyph, theme: "azure", label: "Test", style, data, motion: { kind: "test", phase } });
	if (/NaN|undefined|\[object/.test(s)) problems.push(`${glyph}/${style}: ${/NaN|undefined|\[object/.exec(s)[0]}`);
	try { new Resvg(s, { fitTo: { mode: "width", value: 72 } }).render(); drawn++; } catch (e) { problems.push(`${glyph}/${style}: ${e.message}`); }
}
check(`every learning glyph draws in all five looks (${drawn} images)`, !problems.length, problems.slice(0, 3).join(" | "));
const html = keySvg({ glyph: "lword", theme: "jade", label: "x", style: "glass", data: { text: "<script>&\"" } });
check("text on keys is escaped", !html.includes("<script>") && html.includes("&lt;script&gt;"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
