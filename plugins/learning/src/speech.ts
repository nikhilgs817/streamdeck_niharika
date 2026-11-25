// Reads text aloud with the voice built into Windows (System.Speech). Offline: nothing is sent anywhere.
// One voice at a time: anything new stops what is being said. The text travels base64-encoded on stdin, never on a
// command line, so any text (quotes, symbols, other languages) is safe.
import streamDeck from "@elgato/streamdeck";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { ps } from "../../../shared/ps.js";

const log = streamDeck.logger.createScope("speech");
const DRY = process.platform !== "win32" || process.env.WINTOOLKIT_DRYRUN === "1";
export const MAX_CHARS = 2000;

/** Voice speed setting → System.Speech rate (-10…10). Slightly slow is easier for young listeners. */
export const RATES: Record<string, number> = { slow: -3, normal: -1, fast: 1 };

const SCRIPT = [
	"$ErrorActionPreference='Stop'",
	"Add-Type -AssemblyName System.Speech",
	"$t=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String([Console]::In.ReadLine()))",
	"$r=[int][Console]::In.ReadLine()",
	"$s=New-Object System.Speech.Synthesis.SpeechSynthesizer",
	"$s.SetOutputToDefaultAudioDevice()",
	"$s.Rate=[Math]::Max(-10,[Math]::Min(10,$r))",
	"$s.Speak($t)",
	"$s.Dispose()",
].join(";");
const ENCODED = Buffer.from(SCRIPT, "utf16le").toString("base64");

let current: { proc?: ChildProcessWithoutNullStreams; id: number; done: () => void } | undefined;
let seq = 0;

/** Cleans text for speech: no markup, sensible length. */
export function speakable(text: string): string {
	return String(text ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
}

/** True while something is being read aloud. */
export function speaking(): boolean {
	return !!current;
}

/** Stops whatever is being said. */
export function stop(): void {
	const c = current;
	current = undefined;
	if (!c) return;
	try { c.proc?.kill(); } catch { /* already gone */ }
	c.done();
}

/**
 * Says `text`. Resolves when it has finished or was stopped.
 * @returns false when there was nothing to say.
 */
export function say(text: string, rate = "normal", onEnd?: () => void): boolean {
	const t = speakable(text);
	stop();
	if (!t) return false;
	const id = ++seq;
	let ended = false;
	const done = () => {
		if (ended) return;
		ended = true;
		if (current?.id === id) current = undefined;
		onEnd?.();
	};
	const r = String(RATES[rate] ?? RATES.normal);
	if (DRY) {
		// Tests: record what would be said, and "finish" after a moment like a real voice would.
		current = { id, done };
		void ps.run("say", [t, r]);
		setTimeout(done, Math.min(1500, 200 + t.length * 5)).unref();
		return true;
	}
	try {
		const proc = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", ENCODED], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
		current = { proc, id, done };
		proc.on("error", (e) => { log.warn(`voice unavailable: ${e.message}`); done(); });
		proc.on("exit", done);
		proc.stderr.on("data", (d) => log.warn(`voice: ${String(d).trim().slice(0, 300)}`));
		proc.stdin.on("error", () => { /* process ended early */ });
		proc.stdin.write(Buffer.from(t, "utf8").toString("base64") + "\n" + r + "\n");
		proc.stdin.end();
		return true;
	} catch (e) {
		log.warn(`voice failed: ${(e as Error).message}`);
		done();
		return false;
	}
}
