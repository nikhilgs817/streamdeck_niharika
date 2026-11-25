// Learning Deck entry point: registers the keys, answers the settings panel and follows the plugin-wide look.
import streamDeck from "@elgato/streamdeck";
import { mkdirSync, writeFileSync } from "node:fs";
import type { JsonObject, JsonValue } from "@elgato/utils";
import { REGISTRY, globals, repaintEverything, setDefaultStyle, setGlobals, watchWindowsMotion } from "../../../shared/base.js";
import { ps } from "../../../shared/ps.js";
import { ALL_KEYS, WordKey, watchDay } from "./keys.js";
import { stop } from "./speech.js";

streamDeck.logger.setLevel("info");
const log = streamDeck.logger.createScope("plugin");

// Glass is the Learning Deck's house look; every key can still pick another in its settings.
setDefaultStyle("glass");
const keys = ALL_KEYS.map((K) => new K());
for (const k of keys) streamDeck.actions.registerAction(k);
const word = keys.find((k): k is WordKey => k instanceof WordKey);
watchDay(() => word, () => repaintEverything());

/** Settings panel ➜ plugin messages. */
streamDeck.ui.onSendToPlugin<{ event?: string; settings?: JsonObject; order?: string }>(async (ev) => {
	const event = ev.payload?.event;
	if (event === "getMonitors") {
		const o = ev.payload.order;
		const r = await ps.run("monitors", [o === "left" || o === "primary" ? o : "windows"]);
		let list: JsonValue = [];
		try { if (r.status === "ok") list = JSON.parse(r.message) as JsonValue; } catch { /* ignore */ }
		await streamDeck.ui.sendToPropertyInspector({ event: "monitors", ok: r.status === "ok", error: r.status === "ok" ? "" : r.message, list });
		return;
	}
	if (event === "getIcon" || event === "refreshIcon") {
		const inst = REGISTRY.get(ev.action.manifestId);
		if (!inst) return;
		const settings = ev.payload.settings ?? ((await ev.action.getSettings()) as JsonObject);
		if (event === "refreshIcon") await inst.refreshIcon(settings);
		const rendered = await inst.imageFinal(settings);
		await streamDeck.ui.sendToPropertyInspector({ event: "icon", ...rendered, token: JSON.stringify(settings) });
	}
});

ps.start();
streamDeck.settings.onDidReceiveGlobalSettings((ev) => { setGlobals(ev.settings); void repaintEverything(); });
watchWindowsMotion();
process.on("exit", () => stop());

await streamDeck.connect();
try {
	Object.assign(globals, await streamDeck.settings.getGlobalSettings());
} catch (e) {
	log.warn(`global settings: ${(e as Error).message}`);
}
// The installer checks this process-bound receipt after the SDK connection succeeds.
try {
	mkdirSync(new URL("../logs/", import.meta.url), { recursive: true });
	writeFileSync(new URL("../logs/installer-ready.json", import.meta.url), JSON.stringify({ pid: process.pid, readyAt: new Date().toISOString() }), "utf8");
} catch {
	log.warn("Installer startup receipt could not be written");
}
