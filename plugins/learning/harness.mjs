// Simulated Stream Deck: starts the built Learning Deck, drives every key and checks what it draws, says and opens.
// The plugin runs in dry-run mode, so speech, sounds and Windows commands are recorded instead of executed.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { strFromU8, unzipSync } from "fflate";

const root = dirname(fileURLToPath(import.meta.url));
const UUID = "com.windowstoolkit.learning";
const sd = join(root, `${UUID}.sdPlugin`);
const manifest = JSON.parse(readFileSync(join(sd, "manifest.json"), "utf8"));
const runDir = mkdtempSync(join(tmpdir(), "learningdeck-test-"));
const LOG = join(runDir, "dryrun.jsonl");
const DATA = join(runDir, "data");

const wss = new WebSocketServer({ port: 0 });
const port = wss.address().port;
const sent = [];
let sock;
const waiters = [];
wss.on("connection", (s) => {
	sock = s;
	s.on("message", (d) => {
		const m = JSON.parse(d.toString());
		sent.push(m);
		for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); w.res(m); }
	});
});
/** Waits for a plugin message sent after `from` (an index into `sent`). */
const waitFor = (pred, ms = 8000, from = 0) => new Promise((res, rej) => {
	const hit = sent.slice(from).find(pred);
	if (hit) return res(hit);
	const w = { pred, res };
	waiters.push(w);
	setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); rej(new Error("timeout waiting")); }, ms);
});
const send = (m) => sock.send(JSON.stringify(m));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const info = {
	application: { font: "Segoe UI", language: "en", platform: "windows", platformVersion: "10.0.22631", version: "7.1.0.21000" },
	colors: {}, devicePixelRatio: 2,
	devices: [{ id: "DEV1", name: "Stream Deck", size: { columns: 5, rows: 3 }, type: 0 }],
	plugin: { uuid: UUID, version: manifest.Version },
};
const proc = spawn(process.execPath, [join(sd, "bin/plugin.js"), "-port", String(port), "-pluginUUID", UUID, "-registerEvent", "registerPlugin", "-info", JSON.stringify(info)], {
	cwd: sd,
	env: { ...process.env, WINTOOLKIT_DRYRUN: "1", WINTOOLKIT_DRYRUN_LOG: LOG, LEARNINGDECK_DATA: DATA, LEARNINGDECK_MINUTE_MS: "2000" },
	stdio: ["ignore", "pipe", "pipe"],
});
let out = "";
proc.stdout.on("data", (d) => (out += d));
proc.stderr.on("data", (d) => (out += d));

let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { (ok ? pass++ : fail++); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); };
const dry = () => (existsSync(LOG) ? readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const said = (from = 0) => dry().slice(from).filter((c) => c.command === "say").map((c) => c.args[0]);
const svg = (img) => decodeURIComponent(String(img).replace(/^data:image\/svg\+xml;charset=utf8,/, ""));
const texts = (img) => [...svg(img).matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
const lastImage = (ctx) => [...sent].reverse().find((m) => m.event === "setImage" && m.context === ctx)?.payload.image ?? "";
/** Saved progress (saves are debounced by 250 ms, so give it a moment). */
const stars = async () => { await sleep(350); try { return JSON.parse(readFileSync(join(DATA, "progress.json"), "utf8")); } catch { return { today: 0, kept: 0, tasks: {} }; } };
const id = (a) => `${UUID}.${a}`;

const appear = async (action, ctx, settings = {}, column = 0, row = 0) => {
	const mark = sent.length;
	send({ event: "willAppear", action: id(action), context: ctx, device: "DEV1", payload: { settings, coordinates: { column, row }, controller: "Keypad", isInMultiAction: false, state: 0 } });
	return waitFor((m) => m.event === "setImage" && m.context === ctx, 8000, mark);
};
const down = (action, ctx, settings = {}) => send({ event: "keyDown", action: id(action), context: ctx, device: "DEV1", payload: { settings, coordinates: { column: 0, row: 0 }, isInMultiAction: false, state: 0 } });
const up = (action, ctx, settings = {}) => send({ event: "keyUp", action: id(action), context: ctx, device: "DEV1", payload: { settings, coordinates: { column: 0, row: 0 }, isInMultiAction: false, state: 0 } });
const tap = async (action, ctx, settings = {}, wait = 450) => { down(action, ctx, settings); await sleep(30); up(action, ctx, settings); await sleep(wait); };
const doubleTap = async (action, ctx, settings = {}) => { down(action, ctx, settings); up(action, ctx, settings); await sleep(80); down(action, ctx, settings); up(action, ctx, settings); await sleep(450); };
const hold = async (action, ctx, settings = {}, secs = 1) => { down(action, ctx, settings); await sleep(secs * 1000 + 200); up(action, ctx, settings); await sleep(150); };
/** Evaluates a quiz card like "7 × 2", "84 ÷ 7", "29 + 55" or "75 − 21". */
const solve = (t) => {
	const m = /^(\d+) ([×÷+−]) (\d+)$/.exec(t.trim());
	if (!m) return undefined;
	const [a, op, b] = [Number(m[1]), m[2], Number(m[3])];
	return String(op === "×" ? a * b : op === "÷" ? a / b : op === "+" ? a + b : a - b);
};

try {
	const reg = await waitFor((m) => m.event === "registerPlugin");
	check("plugin registers with Stream Deck", reg.uuid === UUID);
	const ids = manifest.Actions.map((a) => a.UUID.split(".").pop());
	check("manifest lists the 11 Learning Deck keys", manifest.Name === "Learning Deck" && ids.join() === "question,answer,spellbee,word,fact,readme,readtimer,stars,taskdone,site,back", ids.join());

	const archive = unzipSync(readFileSync(join(sd, "profiles/LearningDeck.streamDeckProfile")));
	const pages = Object.entries(archive).filter(([p]) => p.endsWith("/manifest.json")).map(([, b]) => JSON.parse(strFromU8(b)));
	const keys = pages.flatMap((p) => Object.values(p.Controllers?.[0]?.Actions ?? {}));
	check("bundled 15-key layout uses only Learning Deck keys", keys.length === 15 && keys.every((k) => k.UUID.startsWith(UUID + ".")), `${keys.length} keys`);
	check("layout has four answer keys A to D", ["A", "B", "C", "D"].every((s) => keys.some((k) => k.UUID === id("answer") && k.Settings?.slot === s)));

	// Every key draws in Glass by default.
	let n = 0;
	for (const a of ids) {
		const img = await appear(a, `look-${a}`, {}, n % 5, 3 + Math.floor(n / 5));
		n++;
		check(`${a} draws a key image`, svg(img.payload.image).startsWith("<svg"));
	}
	for (const a of ids) send({ event: "willDisappear", action: id(a), context: `look-${a}`, device: "DEV1", payload: { settings: {}, coordinates: { column: 0, row: 0 }, controller: "Keypad", isInMultiAction: false, state: 0 } });
	await sleep(200);

	/* ---------------- quiz */
	const Q = { subject: "times", level: "medium", speak: true, rate: "normal" };
	await appear("question", "q", Q, 1, 0);
	await appear("stars", "stars", { goal: 2 }, 2, 0);
	for (const [i, s] of ["A", "B", "C", "D"].entries()) await appear("answer", `ans-${s}`, { slot: s }, i, 1);
	await sleep(300);
	const qText = () => texts(lastImage("q")).join(" ");
	const choice = (s) => [...new Set(texts(lastImage(`ans-${s}`)).filter((t) => t !== s && !t.startsWith("Answer")))].join("");
	check("question card shows a times-table sum", /^\d+ × \d+/.test(qText()), qText());
	check("answer keys show four different choices", new Set(["A", "B", "C", "D"].map(choice)).size === 4, ["A", "B", "C", "D"].map(choice).join(","));

	let mark = dry().length;
	await tap("question", "q", Q);
	check("tapping the question reads it aloud", said(mark).some((t) => /^What is \d+ times \d+\?$/.test(t)), said(mark).join(" | "));

	// A wrong answer shakes and says try again; it earns no star.
	const answer = solve(qText().split(" ").slice(0, 3).join(" "));
	const right = ["A", "B", "C", "D"].find((s) => choice(s) === answer);
	const wrong = ["A", "B", "C", "D"].find((s) => s !== right);
	check("one answer key holds the right answer", !!right, `answer ${answer}`);
	mark = dry().length;
	let from = sent.length;
	await tap("answer", `ans-${wrong}`, { slot: wrong }, 600);
	const wrongImgs = sent.slice(from).filter((m) => m.event === "setImage" && m.context === `ans-${wrong}`);
	check("a wrong answer says try again", said(mark).some((t) => /try again|another go|look again/i.test(t)), said(mark).join(" | "));
	check("a wrong answer shakes (several frames)", wrongImgs.length >= 4, `${wrongImgs.length} frames`);
	await tap("answer", `ans-${right}`, { slot: right }, 300);
	check("the right answer after a wrong one earns no star", (await stars()).today === 0);
	check("the right answer turns green", svg(lastImage(`ans-${right}`)).includes("#34D66F"));
	await sleep(2200);

	// The next question: right first time earns a star.
	const answer2 = solve(qText().split(" ").slice(0, 3).join(" "));
	const right2 = ["A", "B", "C", "D"].find((s) => choice(s) === answer2);
	mark = dry().length;
	await tap("answer", `ans-${right2}`, { slot: right2 }, 600);
	check("a new question follows a right answer", !!right2, qText());
	check("right first time earns a star and praise", (await stars()).today === 1 && said(mark).length > 0, `${(await stars()).today} stars; ${said(mark).join(" | ")}`);
	check("star chart repaints with the new count", texts(lastImage("stars")).join(" ").includes("1"));

	// Double-tap changes the subject; hold skips.
	await sleep(2000);
	from = sent.length;
	await doubleTap("question", "q", Q);
	const setSubject = sent.slice(from).find((m) => m.event === "setSettings" && m.context === "q");
	check("double-tapping the question moves to the next subject", setSubject?.payload.subject === "divide", JSON.stringify(setSubject?.payload));
	await sleep(300);
	check("the card now shows a division", qText().includes("÷"), qText());
	mark = dry().length;
	from = sent.length;
	await hold("question", "q", { ...Q, subject: "divide" }, 1);
	await sleep(200);
	check("holding the question skips to a new one and reads it", sent.slice(from).some((m) => m.event === "setImage" && m.context === "q") && said(mark).some((t) => /divided by/.test(t)), said(mark).join(" | "));

	// Telling the time draws a clock.
	send({ event: "didReceiveSettings", action: id("question"), context: "q", device: "DEV1", payload: { settings: { ...Q, subject: "clock" }, coordinates: { column: 1, row: 0 }, isInMultiAction: false } });
	await sleep(400);
	check("clock questions draw a clock face", /<circle/.test(svg(lastImage("q"))) && ["A", "B", "C", "D"].every((s) => /\d+:\d\d/.test(choice(s))), ["A", "B", "C", "D"].map(choice).join(","));

	// Star goal message: goal is 2, one star so far.
	send({ event: "didReceiveSettings", action: id("question"), context: "q", device: "DEV1", payload: { settings: { ...Q, subject: "math", level: "easy" }, coordinates: { column: 1, row: 0 }, isInMultiAction: false } });
	await sleep(400);
	const a3 = solve(qText().split(" ").slice(0, 3).join(" "));
	const r3 = ["A", "B", "C", "D"].find((s) => choice(s) === a3);
	mark = dry().length;
	await tap("answer", `ans-${r3}`, { slot: r3 }, 500);
	check("reaching the star goal is celebrated", said(mark).some((t) => /star goal/.test(t)), said(mark).join(" | "));
	check("star chart shows the trophy at the goal", lastImage("stars") !== "" && (await stars()).today === 2);

	/* ---------------- flash cards: a question with no answer keys */
	for (const s of ["A", "B", "C", "D"]) send({ event: "willDisappear", action: id("answer"), context: `ans-${s}`, device: "DEV1", payload: { settings: { slot: s }, coordinates: { column: 0, row: 1 }, controller: "Keypad", isInMultiAction: false, state: 0 } });
	await sleep(2200);
	mark = dry().length;
	await tap("question", "q", { ...Q, subject: "times" });
	check("without answer keys a tap reveals the answer", said(mark).some((t) => /^The answer is \d+\.$/.test(t)), said(mark).join(" | "));

	/* ---------------- spelling bee */
	await appear("spellbee", "bee", { list: "grade2" }, 4, 1);
	mark = dry().length;
	await tap("spellbee", "bee", { list: "grade2" });
	const spellSaid = said(mark).join(" ");
	const word = /^Spell ([a-z]+)\./.exec(spellSaid)?.[1];
	check("spelling bee says a word to spell", !!word, spellSaid);
	check("spelling bee shows blanks, not the word", !texts(lastImage("bee")).some((t) => t.includes(word ?? "@")));
	const s0 = (await stars()).today;
	mark = dry().length;
	await tap("spellbee", "bee", { list: "grade2" });
	check("second tap spells it out letter by letter", said(mark).some((t) => t.startsWith([...word].join(", "))), said(mark).join(" | "));
	check("spelling earns a star", (await stars()).today === s0 + 1);
	check("the revealed word is shown", texts(lastImage("bee")).some((t) => t.includes(word)));
	mark = dry().length;
	await tap("spellbee", "bee", { list: "own", words: "giraffe, rainbow" });
	check("own spelling list is used", said(mark).some((t) => /Spell (giraffe|rainbow)\./.test(t)), said(mark).join(" | "));

	/* ---------------- word of the day + fun fact */
	await appear("word", "word", {}, 3, 0);
	const w1 = texts(lastImage("word")).join(" ");
	mark = dry().length;
	await tap("word", "word", {});
	check("word of the day shows a word and explains it", w1.length > 1 && said(mark).some((t) => t.includes(" means ")), said(mark).join(" | "));
	mark = dry().length;
	await hold("word", "word", {}, 1);
	check("holding word of the day gives a bonus word", said(mark).some((t) => t.startsWith("Bonus word!")), said(mark).join(" | "));
	await appear("word", "word2", { list: "own", words: "brave = ready to face something hard" }, 3, 2);
	mark = dry().length;
	await tap("word", "word2", { list: "own", words: "brave = ready to face something hard" });
	check("own words are used for word of the day", said(mark).some((t) => t.startsWith("brave. brave means ready to face something hard")), said(mark).join(" | "));

	await appear("fact", "fact", { topic: "space" }, 4, 0);
	mark = dry().length;
	await tap("fact", "fact", { topic: "space" });
	check("fun fact shows and reads a fact", said(mark).length === 1 && texts(lastImage("fact")).length > 0, said(mark).join(" | "));

	/* ---------------- read to me */
	await appear("readme", "read", {}, 0, 2);
	mark = dry().length;
	await tap("readme", "read", {}, 100);
	const reads = dry().slice(mark);
	check("read to me reads the copied text aloud", reads.some((c) => c.command === "clip-get") && said(mark).includes("hello world"), JSON.stringify(reads));
	check("read to me shows it is speaking", svg(lastImage("read")).length > 0);
	await sleep(800);

	/* ---------------- reading timer (a "minute" is 2 s in this test) */
	const T = { minutes: 1, chime: true, star: true };
	await appear("readtimer", "timer", T, 1, 2);
	check("reading timer starts at its full time", texts(lastImage("timer")).includes("0:02"), texts(lastImage("timer")).join(","));
	const s1 = (await stars()).today;
	mark = dry().length;
	await tap("readtimer", "timer", T, 100);
	await sleep(2800);
	const done = dry().slice(mark);
	check("timer chimes when time is up", done.some((c) => c.command === "sound" && c.args[0] === "chime"), JSON.stringify(done.map((c) => c.command)));
	check("finishing the timer earns a star and praise", (await stars()).today === s1 + 1 && said(mark).some((t) => /Great reading/.test(t)));
	await tap("readtimer", "timer", T);
	check("a tap after it finishes resets it", texts(lastImage("timer")).includes("0:02"), texts(lastImage("timer")).join(","));
	await tap("readtimer", "timer", T, 100);
	await sleep(500);
	await tap("readtimer", "timer", T, 100);
	const paused = texts(lastImage("timer")).join(",");
	await sleep(700);
	check("a second tap pauses the timer", texts(lastImage("timer")).join(",") === paused, paused);
	await hold("readtimer", "timer", T, 1);
	check("holding resets the timer", texts(lastImage("timer")).includes("0:02"));

	/* ---------------- task done */
	const TK = { task: "Piano", star: true };
	await appear("taskdone", "task", TK, 2, 2);
	const s2 = (await stars()).today;
	mark = dry().length;
	await tap("taskdone", "task", TK);
	check("ticking a task earns a star", (await stars()).today === s2 + 1 && (await stars()).tasks.task, JSON.stringify((await stars()).tasks));
	check("the task is spoken with its name", said(mark).some((t) => t.includes("Piano is done")));
	await tap("taskdone", "task", TK);
	check("a task only earns one star a day", (await stars()).today === s2 + 1);
	await hold("taskdone", "task", TK, 1);
	check("holding unticks the task", !(await stars()).tasks.task);

	/* ---------------- star chart */
	mark = dry().length;
	await tap("stars", "stars", { goal: 2 });
	check("star chart says the count", said(mark).some((t) => /You have \d+ stars/.test(t)), said(mark).join(" | "));
	await hold("stars", "stars", { goal: 2 }, 3);
	check("holding the star chart for 3 s resets it", (await stars()).today === 0 && (await stars()).kept === 0);

	/* ---------------- learning sites */
	await appear("site", "site", { site: "typing", open: "gestures" }, 3, 2);
	mark = dry().length;
	await tap("site", "site", { site: "typing", open: "gestures" });
	let calls = dry().slice(mark);
	check("tap opens the site on monitor 1", calls.some((c) => c.command === "url" && c.args[0] === "https://www.typingclub.com") && calls.some((c) => c.command === "place" && c.args[0] === "0"), JSON.stringify(calls));
	mark = dry().length;
	await doubleTap("site", "site", { site: "typing", open: "gestures" });
	calls = dry().slice(mark);
	check("double-tap opens it on monitor 2", calls.some((c) => c.command === "place" && c.args[0] === "1"), JSON.stringify(calls));
	mark = dry().length;
	await tap("site", "site", { site: "scratch", open: "any" });
	calls = dry().slice(mark);
	check("'wherever Windows puts it' skips placement", calls.some((c) => c.command === "url" && c.args[0] === "https://scratch.mit.edu/") && !calls.some((c) => c.command === "place"), JSON.stringify(calls));
	mark = dry().length;
	from = sent.length;
	await tap("site", "site", { site: "custom", url: "javascript:alert(1)" });
	check("unsafe custom addresses are refused", !dry().slice(mark).some((c) => c.command === "url") && sent.slice(from).some((m) => m.event === "showAlert"));
	mark = dry().length;
	await tap("site", "site", { site: "custom", url: "www.example.org/kids" });
	check("custom site adds https", dry().slice(mark).some((c) => c.command === "url" && c.args[0] === "https://www.example.org/kids"));

	/* ---------------- back + settings panel */
	await appear("back", "back", {}, 0, 0);
	from = sent.length;
	await tap("back", "back", {}, 200);
	check("back returns to the previous profile", sent.slice(from).some((m) => m.event === "switchToProfile" && m.device === "DEV1" && !m.payload?.profile));

	send({ event: "propertyInspectorDidAppear", action: id("word"), context: "word", device: "DEV1" });
	await sleep(100);
	from = sent.length;
	send({ event: "sendToPlugin", action: id("word"), context: "word", payload: { event: "getIcon", settings: { iconStyle: "neon" } } });
	const icon = await waitFor((m) => m.event === "sendToPropertyInspector" && m.payload?.event === "icon", 5000, from);
	check("settings panel preview renders the chosen look", svg(icon.payload.image).startsWith("<svg"));

	check("no errors were logged", !/\b(error|exception|TypeError)\b/i.test(out.replace(/onerror/g, "")), out.split("\n").filter((l) => /error|exception/i.test(l)).slice(0, 3).join(" / "));
} catch (e) {
	check("harness ran to the end", false, e.stack);
} finally {
	proc.kill();
	wss.close();
	rmSync(runDir, { recursive: true, force: true });
	console.log(`\n${pass} passed, ${fail} failed`);
	process.exitCode = fail ? 1 : 0;
}
