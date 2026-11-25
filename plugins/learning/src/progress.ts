// Stars and ticked tasks, kept in one small file on this PC (%APPDATA%\LearningDeck\progress.json).
// Nothing about the child is stored: only counts, dates and which task keys were ticked today. Nothing leaves the PC.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { todayKey } from "../content.js";

export type Progress = {
	/** Day the "today" counters belong to (YYYY-MM-DD, local time). */
	day: string;
	/** Stars earned today. */
	today: number;
	/** Stars since the last manual reset. */
	kept: number;
	/** Task key id → the day it was last ticked. */
	tasks: Record<string, string>;
	/** Bonus words asked for today (Word of the Day hold). */
	bonus: number;
};

const DRY = process.platform !== "win32" || process.env.WINTOOLKIT_DRYRUN === "1";
const dir = process.env.LEARNINGDECK_DATA || (DRY ? join(tmpdir(), "learningdeck") : join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "LearningDeck"));
const file = join(dir, "progress.json");
const fresh = (): Progress => ({ day: todayKey(), today: 0, kept: 0, tasks: {}, bonus: 0 });
const count = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(100_000, Math.floor(Number(v)))) : 0);

let state: Progress = load();
const listeners: (() => void)[] = [];
let saveTimer: NodeJS.Timeout | undefined;

function load(): Progress {
	try {
		const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<Progress>;
		const tasks = Object.fromEntries(Object.entries(raw.tasks ?? {}).filter(([k, v]) => typeof k === "string" && k.length <= 200 && typeof v === "string").slice(0, 200));
		return { day: typeof raw.day === "string" ? raw.day : todayKey(), today: count(raw.today), kept: count(raw.kept), tasks, bonus: count(raw.bonus) };
	} catch {
		return fresh();
	}
}

function save(): void {
	clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		try {
			mkdirSync(dir, { recursive: true });
			writeFileSync(file + ".tmp", JSON.stringify(state, null, "\t"));
			renameSync(file + ".tmp", file);
		} catch {
			/* Progress is a nicety: a read-only profile must never break a key. */
		}
	}, 250);
	saveTimer.unref?.();
}

/** Starts a new day when the date changes; returns true if it did. */
export function rollOver(now = new Date()): boolean {
	const day = todayKey(now);
	if (state.day === day) return false;
	state = { ...state, day, today: 0, bonus: 0, tasks: Object.fromEntries(Object.entries(state.tasks).filter(([, d]) => d === day)) };
	save();
	return true;
}

export function progress(): Readonly<Progress> {
	rollOver();
	return state;
}

export function onProgress(listener: () => void): void {
	listeners.push(listener);
}
const changed = () => {
	save();
	for (const l of listeners) l();
};

/** Adds stars and returns today's count. */
export function addStars(n = 1): number {
	rollOver();
	state.today += n;
	state.kept += n;
	changed();
	return state.today;
}

/** The Star Chart's reset (hold): clears both counters. */
export function resetStars(): void {
	rollOver();
	state.today = 0;
	state.kept = 0;
	changed();
}

export function taskDone(id: string): boolean {
	return progress().tasks[id] === state.day;
}

export function setTask(id: string, done: boolean): void {
	rollOver();
	if (done) state.tasks[id] = state.day;
	else delete state.tasks[id];
	changed();
}

export function nextBonus(): number {
	rollOver();
	state.bonus += 1;
	changed();
	return state.bonus;
}
