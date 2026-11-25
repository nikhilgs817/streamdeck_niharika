// Learning Deck keys. Looks, motion, press ripple and per-key look settings come from the shared Design System 4
// (shared/base.ts, shared/icons.js); the learning art is in ../art.js and the questions, words and facts in ../content.js.
import streamDeck, { action, type Action, type KeyDownEvent, type KeyUpEvent, type WillAppearEvent, type WillDisappearEvent, type DidReceiveSettingsEvent } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { GestureAction, ToolkitAction, globals, log, type AnySettings, type Press } from "../../../shared/base.js";
import { FX, PRESET_ICONS, keySvg, svgDataUri } from "../../../shared/icons.js";
import { ps, type PsResult } from "../../../shared/ps.js";
import { LEARN_FX } from "../art.js";
import { FEATURES, SITE_LOOKS } from "../catalogue.mjs";
import { FACTS, PRAISE, SITES, SUBJECT_IDS, SUBJECT_SHORT, TRY_AGAIN, WORDS, makeQuestion, ownWords, siteUrl, wordList, wordOfDay } from "../content.js";
import { addStars, nextBonus, onProgress, progress, resetStars, rollOver, setTask, taskDone } from "./progress.js";
import { MAX_CHARS, say, speaking, stop } from "./speech.js";

export const UUID = "com.windowstoolkit.learning";
type S = AnySettings & JsonObject;
type Data = Record<string, unknown>;
type Feature = (typeof FEATURES)[number];
type Field = { key: string; def?: unknown };

Object.assign(FX, LEARN_FX);
for (const f of FEATURES) PRESET_ICONS[f.id] = { glyph: f.glyph, theme: f.theme, label: f.label ?? f.name, style: "glass" };

const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
const GREEN = ["#34D66F", "#0B8A43"];
const ok = (message = ""): PsResult => ({ status: "ok", message });

/* ------------------------------------------------------------------ base key */

/** Every Learning Deck key: shared looks, a 1-second hold, and live data drawn into the key art. */
abstract class LearnKey extends GestureAction<S> {
	protected abstract readonly def: Feature;
	protected get kind(): string { return this.def.id; }
	protected override readonly defaultHold: number = 1;
	#data = new Map<string, Data>();
	#colours = new Map<string, string[]>();
	#keys = new Map<string, { action: Action<S>; settings: S }>();
	#painting = "";

	/** A key setting, or its catalogue default. */
	protected setting(s: S, key: string): unknown {
		const v = s[key];
		if (v !== undefined && v !== "" && v !== null) return v;
		return ((this.def as { fields?: Field[] }).fields ?? []).find((f) => f.key === key)?.def;
	}
	protected data(id: string): Data { return this.#data.get(id) ?? {}; }
	/** Replaces a key's data (and optional state colours) and repaints it. */
	protected async show(id: string, data: Data, colours?: string[]): Promise<void> {
		this.#data.set(id, data);
		if (colours) this.#colours.set(id, colours); else this.#colours.delete(id);
		const k = this.#keys.get(id);
		if (k) await this.paint(k.action, k.settings);
	}
	/** Visible keys of this type, optionally on one device. */
	visible(device?: string): { action: Action<S>; settings: S }[] {
		return [...this.#keys.values()].filter((k) => !device || k.action.device.id === device);
	}
	protected settingsOf(id: string): S | undefined { return this.#keys.get(id)?.settings; }
	protected async repaintKeys(device?: string): Promise<void> {
		for (const k of this.visible(device)) { try { await this.paint(k.action, k.settings); } catch { /* key gone */ } }
	}
	/** Called when a key appears or its settings change. */
	protected prepare(_action: Action<S>, _s: S, _changed: boolean): void | Promise<void> {}

	override async onWillAppear(ev: WillAppearEvent<S>): Promise<void> {
		this.#keys.set(ev.action.id, { action: ev.action, settings: ev.payload.settings });
		await this.prepare(ev.action, ev.payload.settings, false);
		return super.onWillAppear(ev);
	}
	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<S>): Promise<void> {
		this.#keys.set(ev.action.id, { action: ev.action, settings: ev.payload.settings });
		await this.prepare(ev.action, ev.payload.settings, true);
		return super.onDidReceiveSettings(ev);
	}
	override onWillDisappear(ev: WillDisappearEvent<S>): void {
		this.#keys.delete(ev.action.id);
		this.#data.delete(ev.action.id);
		this.#colours.delete(ev.action.id);
		super.onWillDisappear(ev);
	}
	protected override async paint(a: Action<S>, s: S): Promise<void> {
		if (this.#keys.has(a.id)) this.#keys.set(a.id, { action: a, settings: s });
		this.#painting = a.id;
		return super.paint(a, s);
	}
	/** Label from the key's current state; `id` is the key being painted. */
	protected label(_s: S, _id: string): string | undefined { return undefined; }
	protected override dynamicLabel(s: S): string | undefined { return this.label(s, this.#painting); }

	override imageNow(s: S, id?: string): { image: string } {
		if (typeof s.iconImage === "string" && s.iconImage.startsWith("data:image/")) return super.imageNow(s, id) as { image: string };
		const key = id ?? this.#painting;
		this.#painting = key;
		const look = this.look(s);
		const style = look.style === "real" ? "glass" : look.style;
		const colours = this.#colours.get(key) ?? look.colours;
		return { image: svgDataUri(keySvg({ ...look, style, colours, motion: this.motion(s), press: this.pressPhase(key), data: this.data(key) })) };
	}
}

/** Keys that act on a single press, without waiting to see whether a double-tap follows. */
abstract class PressKey extends LearnKey {
	override async onKeyDown(ev: KeyDownEvent<S>): Promise<void> {
		await this.onPress(ev.action, ev.payload.settings, null);
	}
	override onKeyUp(_ev: KeyUpEvent<S>): void {}
}

const feature = (id: string): Feature => {
	const f = FEATURES.find((x) => x.id === id);
	if (!f) throw new Error(`No catalogue row for ${id}`);
	return f;
};

/* ------------------------------------------------------------------ quiz (Question + Answer A–D) */

type Question = ReturnType<typeof makeQuestion>;
type Quiz = { q: Question; settings: S; firstTry: boolean; solved: boolean; revealed: boolean; wrong: Set<string>; streak: number; next?: NodeJS.Timeout };
const quizzes = new Map<string, Quiz>();
let questionKey: QuestionKey | undefined;
let answerKey: AnswerKey | undefined;

const speakOn = (s: S) => s.speak !== false;
const rateOf = (s: S) => (typeof s.rate === "string" ? s.rate : "normal");

@action({ UUID: `${UUID}.question` })
export class QuestionKey extends LearnKey {
	protected readonly def = feature("question");
	constructor() { super(); questionKey = this; }

	protected override label(s: S): string {
		return SUBJECT_SHORT[String(this.setting(s, "subject")) as keyof typeof SUBJECT_SHORT] ?? "Question";
	}

	protected override async prepare(a: Action<S>, s: S, changed: boolean): Promise<void> {
		const quiz = quizzes.get(a.device.id);
		if (!quiz || changed) await newQuestion(a.device.id, s, false);
		else { quiz.settings = s; await this.paintQuiz(a.device.id); }
	}

	/** Draws the question and every answer key on a device. */
	async paintQuiz(device: string): Promise<void> {
		const quiz = quizzes.get(device);
		for (const k of this.visible(device)) {
			if (!quiz) { await this.show(k.action.id, {}); continue; }
			const state = quiz.solved ? "right" : quiz.revealed ? "reveal" : "ask";
			await this.show(k.action.id, { text: quiz.q.text, clock: quiz.q.clock, answer: quiz.q.answer, state, streak: quiz.streak });
		}
		await answerKey?.paintQuiz(device);
	}

	protected async onPress(a: Action<S>, s: S, press: Press): Promise<void> {
		const device = a.device.id;
		let quiz = quizzes.get(device);
		if (!quiz) { await newQuestion(device, s, true); return; }
		if (press === 2) { await newQuestion(device, s, true); return; }
		if (press === 1) {
			const now = String(this.setting(s, "subject"));
			const subject = SUBJECT_IDS[(SUBJECT_IDS.indexOf(now) + 1) % SUBJECT_IDS.length];
			const next = { ...s, subject } as S;
			await a.setSettings(next);
			await newQuestion(device, next, false);
			quiz = quizzes.get(device);
			if (quiz) say(`${SUBJECT_SHORT[subject as keyof typeof SUBJECT_SHORT]}. ${quiz.q.speak}`, rateOf(s));
			return;
		}
		// With answer keys on the deck a tap repeats the question; without them it works as flash cards.
		if ((answerKey?.count(device, quiz.q.choices.length) ?? 0) > 0 && !quiz.solved) {
			say(quiz.q.speak, rateOf(s));
			return;
		}
		if (!quiz.revealed && !quiz.solved) {
			quiz.revealed = true;
			say(`The answer is ${quiz.q.answer}.`, rateOf(s));
			await this.paintQuiz(device);
		} else await newQuestion(device, s, true);
	}
}

/** Makes a new question for a device and paints it. */
async function newQuestion(device: string, s: S, speak: boolean): Promise<void> {
	const old = quizzes.get(device);
	clearTimeout(old?.next);
	const setting = (k: string) => (questionKey as unknown as { setting(s: S, k: string): unknown }).setting(s, k);
	const subject = String(setting("subject"));
	const words = subject === "spell" && typeof s.words === "string" && s.words.trim() ? wordList(s.words) : undefined;
	let q = makeQuestion({ subject, level: String(setting("level")), table: String(setting("table")), words, choices: Number(setting("choices")) });
	// Never the same question twice in a row.
	for (let i = 0; i < 5 && old && q.text === old.q.text && q.answer === old.q.answer && !q.clock; i++) q = makeQuestion({ subject, level: String(setting("level")), table: String(setting("table")), words, choices: Number(setting("choices")) });
	quizzes.set(device, { q, settings: s, firstTry: true, solved: false, revealed: false, wrong: new Set(), streak: old?.streak ?? 0 });
	await questionKey?.paintQuiz(device);
	if (speak && speakOn(s)) say(q.speak, rateOf(s));
}

@action({ UUID: `${UUID}.answer` })
export class AnswerKey extends PressKey {
	protected readonly def = feature("answer");
	#shake = new Map<string, number>();
	constructor() { super(); answerKey = this; }

	#slot(s: S): string { const v = String(this.setting(s, "slot") ?? "A").toUpperCase(); return "ABCD".includes(v) && v.length === 1 ? v : "A"; }
	protected override label(s: S): string { return `Answer ${this.#slot(s)}`; }

	/** How many answer keys on this device can show one of `n` choices. */
	count(device: string, n: number): number {
		return this.visible(device).filter((k) => "ABCD".indexOf(this.#slot(k.settings)) < n).length;
	}

	protected override prepare(a: Action<S>): void { void this.paintQuiz(a.device.id); }

	async paintQuiz(device: string): Promise<void> {
		const quiz = quizzes.get(device);
		for (const k of this.visible(device)) {
			const slot = this.#slot(k.settings), i = "ABCD".indexOf(slot);
			const text = quiz?.q.choices[i];
			if (!quiz || text === undefined) { await this.show(k.action.id, { letter: slot, state: quiz ? "empty" : undefined }); continue; }
			const right = text === quiz.q.answer;
			const state = quiz.solved && right ? "right" : quiz.wrong.has(slot) ? "wrong" : quiz.revealed && right ? "right" : undefined;
			await this.show(k.action.id, { letter: slot, text, state, shake: this.#shake.get(k.action.id) ?? 0 }, state === "right" ? GREEN : undefined);
		}
	}

	protected async onPress(a: Action<S>, s: S): Promise<void> {
		const device = a.device.id, quiz = quizzes.get(device);
		const slot = this.#slot(s), choice = quiz?.q.choices["ABCD".indexOf(slot)];
		if (!quiz || choice === undefined) { if (!questionKey?.visible(device).length) say("Put a Question key on the deck first.", "normal"); return; }
		const qs = quiz.settings, rate = rateOf(qs);
		if (quiz.solved) return;
		if (choice === quiz.q.answer) {
			quiz.solved = true;
			let words = pick(PRAISE);
			if (quiz.firstTry) {
				quiz.streak += 1;
				const before = progress().today, today = addStars(1), goal = starGoal(device);
				if (before < goal && today >= goal) words += " You reached your star goal today!";
				else if (quiz.streak > 0 && quiz.streak % 5 === 0) words += ` ${quiz.streak} in a row!`;
			}
			if (speakOn(qs)) say(words, rate);
			await questionKey?.paintQuiz(device);
			quiz.next = setTimeout(() => void newQuestion(device, qs, true), 1800);
			return;
		}
		quiz.firstTry = false;
		quiz.streak = 0;
		quiz.wrong.add(slot);
		if (speakOn(qs)) say(pick(TRY_AGAIN), rate);
		// A gentle shake: about a third of a second.
		for (const dx of [-7, 7, -5, 5, -2, 0]) {
			this.#shake.set(a.id, dx);
			await this.paintQuiz(device);
			await new Promise((r) => setTimeout(r, 55));
		}
		this.#shake.delete(a.id);
	}
}

/* ------------------------------------------------------------------ Spelling Bee */

@action({ UUID: `${UUID}.spellbee` })
export class SpellingBeeKey extends LearnKey {
	protected readonly def = feature("spellbee");
	#word = new Map<string, { word: string; revealed: boolean }>();

	#list(s: S): string[] {
		const list = String(this.setting(s, "list"));
		return list === "own" ? wordList(s.words as string, "grade2") : wordList("", list === "grade3" ? "grade3" : "grade2");
	}
	protected override prepare(a: Action<S>, _s: S, changed: boolean): void {
		if (changed) this.#word.delete(a.id);
		void this.#paint(a.id);
	}
	async #paint(id: string): Promise<void> {
		const w = this.#word.get(id);
		await this.show(id, w ? { text: w.word, letters: w.word.replace(/[^a-z]/gi, "").length, state: w.revealed ? "reveal" : "ask" } : {});
	}
	protected async onPress(a: Action<S>, s: S, press: Press): Promise<void> {
		const rate = rateOf(s);
		let w = this.#word.get(a.id);
		if (press === 2 && w) { say(`${w.word}.`, rate); return; }
		if (!w || w.revealed) {
			const list = this.#list(s);
			let word = pick(list);
			for (let i = 0; i < 5 && w && word === w.word && list.length > 1; i++) word = pick(list);
			w = { word, revealed: false };
			this.#word.set(a.id, w);
			say(`Spell ${word}. ${word}.`, rate);
		} else {
			w.revealed = true;
			say(`${[...w.word].filter((c) => /[a-z]/i.test(c)).join(", ")}. ${w.word}.`, rate);
			if (s.star !== false) addStars(1);
		}
		await this.#paint(a.id);
	}
}

/* ------------------------------------------------------------------ Word of the Day */

@action({ UUID: `${UUID}.word` })
export class WordKey extends LearnKey {
	protected readonly def = feature("word");
	#offset = 0;

	#today(s: S): [string, string, string] {
		const own = String(this.setting(s, "list")) === "own" ? ownWords(s.words) : [];
		const list = (own.length ? own : WORDS) as [string, string, string][];
		return wordOfDay(list, new Date(), this.#offset ? progress().bonus * 7 : 0) as [string, string, string];
	}
	protected override prepare(a: Action<S>, s: S): void { void this.show(a.id, { text: this.#today(s)[0] }); }
	async refreshDay(): Promise<void> {
		this.#offset = 0;
		for (const k of this.visible()) await this.show(k.action.id, { text: this.#today(k.settings)[0] });
	}
	protected async onPress(a: Action<S>, s: S, press: Press): Promise<void> {
		if (press === 2) { nextBonus(); this.#offset = 1; }
		const [word, meaning, example] = this.#today(s);
		for (const k of this.visible()) await this.show(k.action.id, { text: this.#today(k.settings)[0] });
		say(`${press === 2 ? "Bonus word! " : ""}${word}. ${word} means ${meaning}.${example ? " " + example : ""}`, rateOf(s));
	}
}

/* ------------------------------------------------------------------ Fun Fact */

@action({ UUID: `${UUID}.fact` })
export class FactKey extends LearnKey {
	protected readonly def = feature("fact");
	#index = new Map<string, number>();

	#pool(s: S): number[] {
		const topic = String(this.setting(s, "topic"));
		const all = FACTS.map((_, i) => i);
		const some = all.filter((i) => FACTS[i][0] === topic);
		return some.length ? some : all;
	}
	#next(id: string, s: S): number {
		const pool = this.#pool(s), now = this.#index.get(id);
		let i = pick(pool);
		for (let n = 0; n < 6 && i === now && pool.length > 1; n++) i = pick(pool);
		this.#index.set(id, i);
		return i;
	}
	protected override prepare(a: Action<S>, s: S, changed: boolean): void {
		const i = !changed && this.#index.has(a.id) ? (this.#index.get(a.id) as number) : this.#next(a.id, s);
		void this.show(a.id, { text: FACTS[i][1], topic: FACTS[i][0] });
	}
	protected async onPress(a: Action<S>, s: S): Promise<void> {
		const i = this.#next(a.id, s);
		await this.show(a.id, { text: FACTS[i][1], topic: FACTS[i][0] });
		if (s.speak !== false) say(FACTS[i][2], rateOf(s));
	}
}

/* ------------------------------------------------------------------ Read to Me */

@action({ UUID: `${UUID}.readme` })
export class ReadToMeKey extends PressKey {
	protected readonly def = feature("readme");
	#reading?: { id: string; started: number; ms: number; ticker: NodeJS.Timeout };

	protected override label(_s: S, id: string): string | undefined { return this.#reading?.id === id ? "Stop" : undefined; }
	async #finish(): Promise<void> {
		const r = this.#reading;
		if (!r) return;
		this.#reading = undefined;
		clearInterval(r.ticker);
		await this.show(r.id, {});
	}
	protected async onPress(a: Action<S>, s: S): Promise<void> {
		if (this.#reading) { const mine = this.#reading.id === a.id; stop(); await this.#finish(); if (mine) return; }
		const clip = await ps.run("clip-get", [], 5000);
		const text = clip.status === "ok" ? clip.message.trim() : "";
		if (!text) { say("Copy some words first, then press me again.", rateOf(s)); if (a.isKey()) await a.showAlert(); return; }
		const ms = Math.max(1500, Math.min(text.length, MAX_CHARS) * 75);
		const started = Date.now();
		const ticker = setInterval(() => void this.show(a.id, { speaking: true, frac: Math.min(1, (Date.now() - started) / ms) }), 250);
		this.#reading = { id: a.id, started, ms, ticker };
		await this.show(a.id, { speaking: true, frac: 0 });
		say(text, rateOf(s), () => void this.#finish());
	}
}

/* ------------------------------------------------------------------ Reading Timer */

/** One minute; tests in dry-run mode may shorten it with LEARNINGDECK_MINUTE_MS. */
const MINUTE = process.env.WINTOOLKIT_DRYRUN === "1" && Number(process.env.LEARNINGDECK_MINUTE_MS) > 0 ? Number(process.env.LEARNINGDECK_MINUTE_MS) : 60_000;
type Timer = { endsAt?: number; left: number; total: number; done?: boolean; tick?: NodeJS.Timeout };
const mmss = (ms: number) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

@action({ UUID: `${UUID}.readtimer` })
export class ReadingTimerKey extends LearnKey {
	protected readonly def = feature("readtimer");
	#t = new Map<string, Timer>();

	#minutes(s: S): number { const m = Number(this.setting(s, "minutes")); return Math.round(Math.max(1, Math.min(120, Number.isFinite(m) ? m : 20))); }
	#state(id: string, s: S): Timer {
		let t = this.#t.get(id);
		if (!t) this.#t.set(id, (t = { left: this.#minutes(s) * MINUTE, total: this.#minutes(s) * MINUTE }));
		return t;
	}
	async #paint(id: string, t: Timer): Promise<void> {
		const left = t.endsAt ? t.endsAt - Date.now() : t.left;
		await this.show(id, t.done ? { done: true } : { text: mmss(left), frac: 1 - left / t.total, running: !!t.endsAt, paused: !t.endsAt && left < t.total });
	}
	protected override prepare(a: Action<S>, s: S, changed: boolean): void {
		const t = this.#state(a.id, s);
		if (changed && !t.endsAt) { t.total = t.left = this.#minutes(s) * MINUTE; t.done = false; }
		void this.#paint(a.id, t);
	}
	override onWillDisappear(ev: WillDisappearEvent<S>): void {
		// Keep counting while another page is shown; only the drawing stops.
		super.onWillDisappear(ev);
	}
	#run(a: Action<S>, s: S, t: Timer): void {
		clearInterval(t.tick);
		t.tick = setInterval(async () => {
			const left = (t.endsAt ?? 0) - Date.now();
			if (left > 0) { await this.#paint(a.id, t); return; }
			clearInterval(t.tick);
			t.endsAt = undefined; t.left = 0; t.done = true;
			await this.#paint(a.id, t);
			if (s.star !== false) addStars(1);
			if (s.chime !== false) {
				await ps.run("sound", ["chime", "80"]);
				say("Time is up. Great reading!", "normal");
			}
		}, 500);
	}
	protected async onPress(a: Action<S>, s: S, press: Press): Promise<void> {
		const t = this.#state(a.id, s);
		if (press === 2 || t.done) {
			clearInterval(t.tick);
			this.#t.set(a.id, { left: this.#minutes(s) * MINUTE, total: this.#minutes(s) * MINUTE });
			await this.#paint(a.id, this.#state(a.id, s));
			return;
		}
		if (t.endsAt) { t.left = t.endsAt - Date.now(); t.endsAt = undefined; clearInterval(t.tick); }
		else { t.endsAt = Date.now() + t.left; this.#run(a, s, t); }
		await this.#paint(a.id, t);
	}
}

/* ------------------------------------------------------------------ Star Chart */

let starKey: StarChartKey | undefined;
/** The daily goal shown on this device's Star Chart (10 when there is none). */
function starGoal(device: string): number {
	const k = starKey?.visible(device)[0] ?? starKey?.visible()[0];
	return k ? starKey!.goal(k.settings) : 10;
}

@action({ UUID: `${UUID}.stars` })
export class StarChartKey extends LearnKey {
	protected readonly def = feature("stars");
	protected override readonly defaultHold: number = 3;
	constructor() { super(); starKey = this; onProgress(() => void this.paintAll()); }

	goal(s: S): number { const g = Number(this.setting(s, "goal")); return Math.round(Math.max(1, Math.min(50, Number.isFinite(g) ? g : 10))); }
	#count(s: S): number { return String(this.setting(s, "reset")) === "never" ? progress().kept : progress().today; }
	protected override label(s: S): string { const n = this.#count(s), g = this.goal(s); return n >= g ? "Goal reached!" : `${n} of ${g} stars`; }
	async paintAll(): Promise<void> { for (const k of this.visible()) await this.show(k.action.id, { n: this.#count(k.settings), goal: this.goal(k.settings) }); }
	protected override prepare(a: Action<S>, s: S): void { void this.show(a.id, { n: this.#count(s), goal: this.goal(s) }); }
	protected async onPress(a: Action<S>, s: S, press: Press): Promise<void> {
		if (press === 2) { resetStars(); say("Stars reset. Let's start again!", "normal"); return; }
		const n = this.#count(s), g = this.goal(s);
		const star = n === 1 ? "star" : "stars";
		say(n >= g ? `You have ${n} ${star}. You reached your goal. Amazing!` : n === 0 ? `No stars yet. Answer a question to earn your first star!` : `You have ${n} ${star}. ${g - n} more to reach your goal!`, "normal");
	}
}

/* ------------------------------------------------------------------ Task Done */

@action({ UUID: `${UUID}.taskdone` })
export class TaskDoneKey extends LearnKey {
	protected readonly def = feature("taskdone");
	constructor() { super(); onProgress(() => void this.paintAll()); }
	#task(s: S): string { return String(this.setting(s, "task") ?? "Practice").trim().slice(0, 24) || "Practice"; }
	protected override label(s: S): string { return this.#task(s); }
	async paintAll(): Promise<void> { for (const k of this.visible()) await this.show(k.action.id, { done: taskDone(k.action.id) }); }
	protected override prepare(a: Action<S>): void { void this.show(a.id, { done: taskDone(a.id) }); }
	protected async onPress(a: Action<S>, s: S, press: Press): Promise<void> {
		const done = taskDone(a.id);
		if (press === 2) { if (done) { setTask(a.id, false); say(`${this.#task(s)} is not ticked any more.`, "normal"); } return; }
		if (done) { say(`${this.#task(s)} is already done today. Well done!`, "normal"); return; }
		setTask(a.id, true);
		if (s.star !== false) addStars(1);
		say(`Well done! ${this.#task(s)} is done.`, "normal");
	}
}

/* ------------------------------------------------------------------ Learning Site */

@action({ UUID: `${UUID}.site` })
export class SiteKey extends LearnKey {
	protected readonly def = feature("site");
	protected override readonly defaultHold: number = 1;

	#site(s: S): string { return String(this.setting(s, "site")); }
	url(s: S): string | undefined {
		const id = this.#site(s);
		if (id === "custom") return siteUrl(s.url);
		return SITES.find(([sid]) => sid === id)?.[2];
	}
	protected override label(s: S): string | undefined {
		const id = this.#site(s);
		if (id !== "custom") return (SITE_LOOKS as Record<string, { label: string }>)[id]?.label;
		const u = this.url(s);
		return u ? new URL(u).hostname.replace(/^www\./, "").split(".")[0] : "Set address";
	}
	override look(s: S): ReturnType<ToolkitAction<S>["look"]> {
		const l = super.look(s);
		const preset = (SITE_LOOKS as Record<string, { glyph: string; theme?: string }>)[this.#site(s)];
		if (preset && !s.iconGlyph) l.glyph = preset.glyph;
		if (preset?.theme && !s.iconTheme) l.theme = preset.theme;
		return l;
	}
	protected async onPress(a: Action<S>, s: S, press: Press): Promise<void> {
		const url = this.url(s);
		if (!url) { log.warn("site: no address set"); if (a.isKey()) await a.showAlert(); return; }
		const open = String(this.setting(s, "open"));
		const monitor = open === "gestures" ? (press ?? 0) : open === "any" ? null : Math.max(0, Math.min(2, Number(open) - 1));
		const o = String(this.setting(s, "order") ?? globals.monitorOrder ?? "windows");
		const order = o === "left" || o === "primary" ? o : "windows";
		let placing = monitor !== null;
		if (placing && (await ps.run("snap")).status !== "ok") placing = false;
		const r = await ps.run("url", [url]);
		if (r.status === "ok" && placing) {
			const p = await ps.run("place", [String(monitor), order, "8000"]);
			if (p.status !== "ok") log.warn(`placement failed: ${p.message}`);
		}
		await this.feedback(a, r);
	}
}

/* ------------------------------------------------------------------ Back */

@action({ UUID: `${UUID}.back` })
export class BackKey extends PressKey {
	protected readonly def = feature("back");
	protected async onPress(a: Action<S>): Promise<void> {
		stop();
		await streamDeck.profiles.switchToProfile(a.device.id);
	}
}

export const ALL_KEYS = [QuestionKey, AnswerKey, SpellingBeeKey, WordKey, FactKey, ReadToMeKey, ReadingTimerKey, StarChartKey, TaskDoneKey, SiteKey, BackKey];
export const isSpeaking = speaking;
export const okResult = ok;

/** Midnight: new word of the day, fresh star count and unticked tasks. Checked once a minute. */
export function watchDay(word: () => WordKey | undefined, refresh: () => Promise<void>): void {
	setInterval(() => {
		if (!rollOver()) return;
		void word()?.refreshDay();
		void refresh();
	}, 60_000).unref();
}
