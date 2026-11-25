// Learning Deck catalogue: one row per key. gen.mjs turns it into the manifest actions, key art, the settings
// panel's fields (ui/features.js) and features.json, which the plugin runtime (src/keys.ts) reads.
import { LEVELS, SITES, SUBJECTS } from "./content.js";

const rate = { key: "rate", label: "Voice speed", type: "select", def: "normal", options: [["slow", "Slow"], ["normal", "Normal"], ["fast", "A bit faster"]] };
const speak = (label = "Read it aloud") => ({ key: "speak", label, type: "check", def: true });
const star = (label) => ({ key: "star", label, type: "check", def: true });

export const GROUPS = [
	["quiz", "Quiz"],
	["words", "Words & reading"],
	["progress", "Stars & routines"],
	["explore", "Explore"],
];

export const FEATURES = [
	{
		id: "question", group: "quiz", name: "Question", glyph: "lquiz", theme: "azure",
		tip: "Shows a question. Answer with the A–D keys. Tap hears it again (or shows the answer when there are no answer keys), double-tap changes subject, hold for 1 second skips it.",
		fields: [
			{ key: "subject", label: "Subject", type: "select", def: "times", options: SUBJECTS },
			{ key: "level", label: "Level", type: "select", def: "medium", options: LEVELS },
			{ key: "table", label: "Times table", type: "select", def: "all", options: [["all", "Mixed (2 to 10)"], ...Array.from({ length: 11 }, (_, i) => [String(i + 2), `${i + 2} times table`])], hint: "Used for Times tables and Division." },
			{ key: "choices", label: "Answer keys", type: "select", def: "4", options: [["4", "4 choices (A to D)"], ["3", "3 choices (A to C)"], ["2", "2 choices (A and B)"]] },
			{ key: "words", label: "Own spelling words", type: "textarea", placeholder: "One word per line", hint: "Optional, for Missing letter. Leave empty to use the built-in grade 2 and 3 words." },
			speak("Read questions aloud"),
			rate,
		],
	},
	{
		id: "answer", group: "quiz", name: "Answer", glyph: "lanswer", theme: "violet",
		tip: "One answer choice for the Question key. A right answer turns green and earns a star on the first try; a wrong one shakes gently to try again.",
		fields: [{ key: "slot", label: "Choice", type: "select", def: "A", options: [["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]] }],
	},
	{
		id: "spellbee", group: "words", name: "Spelling Bee", glyph: "lbee", theme: "gold", label: "Spelling",
		tip: "Tap: hear a word to spell out loud or on paper. Tap again: see how it is spelled. Hold for 1 second: hear the word again.",
		fields: [
			{ key: "list", label: "Words", type: "select", def: "grade2", options: [["grade2", "Grade 2 words"], ["grade3", "Grade 3 words"], ["own", "My own list"]] },
			{ key: "words", label: "Own words", type: "textarea", placeholder: "One word per line", hint: "Used when Words is My own list, for example this week's spelling list from school." },
			star("Earn a star when the spelling is shown"),
			rate,
		],
	},
	{
		id: "word", group: "words", name: "Word of the Day", glyph: "lword", theme: "jade", label: "Word",
		tip: "A new word every day. Tap: hear the word, what it means and an example. Hold for 1 second: a bonus word.",
		fields: [
			{ key: "list", label: "Words", type: "select", def: "builtin", options: [["builtin", "Built-in words (50)"], ["own", "My own list"]] },
			{ key: "words", label: "Own words", type: "textarea", placeholder: "brave = ready to do something even when it feels scary", hint: "One per line, as word = what it means." },
			rate,
		],
	},
	{
		id: "fact", group: "explore", name: "Fun Fact", glyph: "lfact", theme: "cosmic",
		tip: "Tap: a new fun fact about space, animals, nature or the body, read aloud.",
		fields: [
			{ key: "topic", label: "Topics", type: "select", def: "all", options: [["all", "All topics"], ["space", "Space"], ["animal", "Animals"], ["earth", "Nature and weather"], ["body", "The human body"]] },
			speak("Read facts aloud"),
			rate,
		],
	},
	{
		id: "readme", group: "words", name: "Read to Me", glyph: "lread", theme: "sky", label: "Read to Me",
		tip: "Copy some text (Ctrl+C), then tap to hear it read aloud. Tap again to stop. Up to 2,000 characters.",
		fields: [rate],
	},
	{
		id: "readtimer", group: "progress", name: "Reading Timer", glyph: "ltimer", theme: "sunset", label: "Reading",
		tip: "Tap to start or pause. Hold for 1 second to reset. When the time is up it chimes and says well done.",
		fields: [
			{ key: "minutes", label: "Minutes", type: "number", def: 20, min: 1, max: 120 },
			{ key: "chime", label: "Chime and cheer at the end", type: "check", def: true },
			star("Earn a star when the time is up"),
		],
	},
	{
		id: "stars", group: "progress", name: "Star Chart", glyph: "lstars", theme: "midas", label: "Stars",
		tip: "Counts today's stars from right answers, spelling, reading and tasks. Shows a trophy when the goal is reached. Tap to hear the count. Hold for 3 seconds to reset (for grown-ups).",
		fields: [
			{ key: "goal", label: "Daily goal", type: "number", def: 10, min: 1, max: 50 },
			{ key: "reset", label: "Start again", type: "select", def: "daily", options: [["daily", "Every morning"], ["never", "Only when I reset it"]] },
		],
	},
	{
		id: "taskdone", group: "progress", name: "Task Done", glyph: "ltask", theme: "lime", label: "Task",
		tip: "A daily routine, like reading or practice. Tap when it is done to tick it and earn a star. It clears overnight. Hold for 1 second to untick.",
		fields: [
			{ key: "task", label: "Task", type: "text", def: "Practice", placeholder: "Practice piano", hint: "Shown on the key. Keep it short." },
			star("Earn a star when ticked"),
		],
	},
	{
		id: "site", group: "explore", name: "Learning Site", glyph: "lcap", theme: "ocean", label: "Learn",
		tip: "Opens a free learning site in the browser, on the screen you choose.",
		fields: [
			{ key: "site", label: "Site", type: "select", def: "typing", options: [...SITES.map(([id, name]) => [id, name]), ["custom", "Another site…"]] },
			{ key: "url", label: "Address", type: "text", placeholder: "https://…", hint: "Used for Another site. Only http and https addresses open." },
			{ key: "open", label: "Open on", type: "select", def: "gestures", options: [["gestures", "Tap screen 1 · double-tap 2 · hold 3"], ["1", "Always screen 1"], ["2", "Always screen 2"], ["3", "Always screen 3"], ["any", "Wherever Windows puts it"]] },
			{ key: "order", label: "Screen numbers", type: "select", def: "windows", options: [["windows", "As Windows numbers them"], ["left", "Left to right"], ["primary", "Main screen first"]] },
		],
	},
	{ id: "back", group: "explore", name: "Back", glyph: "back", theme: "slate", tip: "Goes back to your previous Stream Deck keys." },
];

/** Preset look for each learning site (glyph, theme, label). */
export const SITE_LOOKS = Object.fromEntries(SITES.map(([id, , , glyph, label]) => [id, { glyph: { keyboard: "keyboard", blocks: "lblocks", abc: "labc", abacus: "labacus", rocketkid: "rocket", globekid: "globe", puzzle: "lpuzzle" }[glyph] ?? "lcap", label }]));
SITE_LOOKS.typing.theme = "azure"; SITE_LOOKS.scratch.theme = "sunset"; SITE_LOOKS.codeorg.theme = "violet"; SITE_LOOKS.khankids.theme = "mint";
SITE_LOOKS.khan3.theme = "jade"; SITE_LOOKS.spaceplace.theme = "cosmic"; SITE_LOOKS.natgeo.theme = "gold"; SITE_LOOKS.pbs.theme = "candy";
