// Learning Deck key art. Original glyphs drawn the Design System 4 way: white shapes in the 144×144 key box,
// recoloured by each look (Glass, Mono, Neon, Vivid, Pro). `ink` is the cut-out colour, P the detail phase (0…1),
// D the live data the key shows (question, choice, stars …). Every glyph also draws sensibly with D = {}.
// Plain ES module with no imports, so the plugin, the build and the settings panel all use the same file.
const W = "#fff", T = Math.PI * 2;
const f = (n) => Number(n).toFixed(2);
const R = 'stroke-linecap="round" stroke-linejoin="round"';
const st = (c, w) => `fill="none" stroke="${c}" stroke-width="${w}" ${R}`;
const soft = (o) => `fill="${W}" fill-opacity="${o}"`;
const wave = (p) => (1 - Math.cos(p * T)) / 2;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const txt = (x, y, t, size, fill, weight = 800) =>
	`<text x="${f(x)}" y="${f(y)}" text-anchor="middle" font-family="Segoe UI Variable Display, Segoe UI, Arial, sans-serif" font-size="${f(size)}" font-weight="${weight}" fill="${fill}">${esc(t)}</text>`;
/** Font size that fits `text` in `width` px (rough Segoe UI bold metrics). */
const fit = (text, max, width) => Math.max(14, Math.min(max, width / (Math.max(1, [...String(text)].length) * 0.6)));
const starPts = (cx, cy, ro, ri, n = 5, rot = -Math.PI / 2) =>
	Array.from({ length: n * 2 }, (_, i) => { const r = i % 2 ? ri : ro, a = rot + (i * Math.PI) / n; return `${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`; }).join(" ");
const check = (x, y, s, c, w = 7) => `<path d="M${f(x - s)} ${f(y)}l${f(s * 0.7)} ${f(s * 0.7)}l${f(s * 1.3)} ${f(-s * 1.3)}" ${st(c, w)}/>`;
const cross = (x, y, s, c, w = 7) => `<path d="M${f(x - s)} ${f(y - s)}l${f(2 * s)} ${f(2 * s)}M${f(x + s)} ${f(y - s)}l${f(-2 * s)} ${f(2 * s)}" ${st(c, w)}/>`;
/** Small round badge with a tick or a cross, for right / wrong. */
const badge = (x, y, ok, ink) => `<circle cx="${x}" cy="${y}" r="15" fill="${W}"/>` + (ok ? check(x - 1, y + 1, 7, ink, 5) : cross(x, y, 6, ink, 5));
/** Twinkles around a point, for a right answer or a reached goal. */
const sparkles = (P, pts) => pts.map(([x, y, s], i) => { const k = wave(P + i * 0.27); return `<polygon points="${starPts(x, y, s * (0.5 + 0.5 * k), s * 0.22 * (0.5 + 0.5 * k), 4, 0)}" fill="${W}" opacity="${f(0.35 + 0.65 * k)}"/>`; }).join("");

/** Analog clock face for "Tell the time". */
function clockFace(h, m, ink) {
	const ticks = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * T, r1 = i % 3 ? 37 : 33; return `<path d="M${f(72 + r1 * Math.sin(a))} ${f(60 - r1 * Math.cos(a))}L${f(72 + 41 * Math.sin(a))} ${f(60 - 41 * Math.cos(a))}" ${st(ink, i % 3 ? 3 : 5)}/>`; }).join("");
	const ma = (m / 60) * T, ha = (((h % 12) + m / 60) / 12) * T;
	return `<circle cx="72" cy="60" r="48" fill="${W}"/>` + ticks +
		`<path d="M72 60L${f(72 + 22 * Math.sin(ha))} ${f(60 - 22 * Math.cos(ha))}" ${st(ink, 8)}/>` +
		`<path d="M72 60L${f(72 + 34 * Math.sin(ma))} ${f(60 - 34 * Math.cos(ma))}" ${st(ink, 5)}/>` +
		`<circle cx="72" cy="60" r="5" fill="${ink}"/>`;
}

/** Card with the question on it: big sum and a "= ?" line. */
function questionCard(ink, P, D) {
	const state = D.state || "ask";
	if (D.clock) {
		let art = clockFace(D.clock.h, D.clock.m, ink);
		if (state === "right") art += badge(116, 22, true, ink) + sparkles(P, [[22, 26, 9], [122, 98, 7]]);
		if (state === "reveal") art = `<g opacity=".9">${art}</g>` + `<rect x="34" y="94" width="76" height="24" rx="12" fill="${W}"/>` + txt(72, 112, D.answer, 18, ink, 900);
		return art;
	}
	const text = String(D.text);
	const shown = state === "right" || state === "reveal" ? `= ${D.answer}` : "= ?";
	let art = `<rect x="10" y="12" width="124" height="96" rx="18" fill="${W}"/>` +
		txt(72, 56, text, fit(text, 40, 108), ink, 900) +
		`<path d="M30 68h84" ${st(ink, 2)} opacity=".18"/>` +
		txt(72, 96, shown, fit(shown, 28, 100), ink, 800);
	if (state === "ask") art += `<rect x="${f(72 + fit(shown, 28, 100) * shown.length * 0.33)}" y="${f(76 + 3 * wave(P))}" width="3" height="22" rx="1.5" fill="${ink}" opacity="${f(0.25 + 0.6 * wave(P * 2))}"/>`;
	if (state === "right") art += badge(124, 16, true, ink) + sparkles(P, [[18, 14, 8], [128, 112, 7]]);
	return art;
}

export const LEARN_FX = {
	/** Question card. No data: a thought bubble with a question mark. */
	lquiz: (ink, P, D = {}) => {
		if (D.text || D.clock) return questionCard(ink, P, D);
		const k = wave(P);
		return `<path d="M30 22h84a16 16 0 0 1 16 16v38a16 16 0 0 1-16 16H64l-20 16v-16H30a16 16 0 0 1-16-16V38a16 16 0 0 1 16-16Z" fill="${W}"/>` +
			txt(72, 77, "?", 54, ink, 900) +
			`<circle cx="${f(108 + 6 * k)}" cy="${f(16 - 4 * k)}" r="${f(4 + 2 * k)}" fill="${W}" opacity="${f(0.4 + 0.6 * k)}"/>`;
	},
	/** Answer choice A–D. No data: the slot letter in a ring. */
	lanswer: (ink, P, D = {}) => {
		const letter = D.letter || "A";
		if (D.text === undefined || D.text === "") {
			if (D.state === "empty") return `<circle cx="72" cy="60" r="40" ${st(W, 5)} stroke-dasharray="8 10" opacity=".6"/>` + txt(72, 76, letter, 44, W, 900);
			return `<circle cx="72" cy="60" r="42" ${soft(0.16)} stroke="${W}" stroke-width="5"/>` + txt(72, 77, letter, 48, W, 900) +
				`<circle cx="72" cy="60" r="${f(48 + 4 * wave(P))}" ${st(W, 2)} opacity="${f(0.15 + 0.25 * wave(P))}"/>`;
		}
		const text = String(D.text), dx = D.shake ? D.shake : 0;
		let art = `<g transform="translate(${f(dx)} 0)"><rect x="12" y="16" width="120" height="88" rx="18" fill="${W}" ${D.state === "wrong" ? 'fill-opacity=".45"' : ""}/>` +
			txt(72, 60 + fit(text, 46, 100) * 0.36, text, fit(text, 46, 100), ink, 900) +
			`<circle cx="26" cy="30" r="11" fill="${ink}" opacity=".18"/>` + txt(26, 35, letter, 13, ink, 900) + `</g>`;
		if (D.state === "right") art += badge(120, 22, true, ink) + sparkles(P, [[18, 112, 8], [130, 104, 6], [112, 8, 6]]);
		if (D.state === "wrong") art += badge(120, 22, false, ink);
		return art;
	},
	/** Spelling Bee. No data: a friendly bee with flapping wings. */
	lbee: (ink, P, D = {}) => {
		const flap = 10 * Math.sin(P * T * 3);
		const bee = (s, x, y) => `<g transform="translate(${x} ${y}) scale(${s})">` +
			`<ellipse cx="-8" cy="-28" rx="13" ry="18" fill="${W}" fill-opacity=".5" stroke="${W}" stroke-width="3" transform="rotate(${f(-20 + flap)} -2 -12)"/>` +
			`<ellipse cx="10" cy="-28" rx="13" ry="18" fill="${W}" fill-opacity=".5" stroke="${W}" stroke-width="3" transform="rotate(${f(20 - flap)} 4 -12)"/>` +
			`<path d="M-36 0l-10 0" ${st(W, 5)}/><ellipse cx="0" cy="0" rx="34" ry="22" fill="${W}"/>` +
			`<path d="M-12 -21v42M4 -22v44" ${st(ink, 7)}/>` +
			`<circle cx="22" cy="-5" r="3.5" fill="${ink}"/><path d="M20 6q4 4 8 0" ${st(ink, 2.5)}/>` +
			`<path d="M26 -20q4 -12 12 -14M30 -18q8 -8 14 -6" ${st(W, 3)}/></g>`;
		if (!D.text) return bee(1.45, 70, 66 + 3 * Math.sin(P * T));
		const text = String(D.text);
		const blanks = D.state !== "reveal" && D.letters ? Math.max(1, Math.min(12, Number(D.letters))) : 0;
		const bw = blanks ? Math.min(16, (104 - (blanks - 1) * 5) / blanks) : 0;
		const inner = blanks
			? Array.from({ length: blanks }, (_, i) => `<rect x="${f(72 - (blanks * bw + (blanks - 1) * 5) / 2 + i * (bw + 5))}" y="84" width="${f(bw)}" height="6" rx="3" fill="${ink}"/>`).join("") + txt(72, 74, `${blanks} letters`, 15, ink, 700)
			: txt(72, 76 + fit(text, 34, 112) * 0.34, text, fit(text, 34, 112), ink, 900);
		return bee(0.6, 32, 26) + `<rect x="10" y="46" width="124" height="62" rx="16" fill="${W}"/>` + inner +
			(D.state === "reveal" ? badge(118, 30, true, ink) : `<path d="M${f(84 + 8 * wave(P))} 22q8 -6 16 0" ${st(W, 4)} opacity=".7"/><path d="M${f(92 + 8 * wave(P))} 14q10 -7 20 0" ${st(W, 4)} opacity=".45"/>`);
	},
	/** Word of the Day. No data: an open book with "Aa". */
	lword: (ink, P, D = {}) => {
		const book = (y, s) => `<g transform="translate(72 ${y}) scale(${s}) translate(-72 -70)"><path d="M72 40C58 30 38 30 20 34v62c18-4 38-4 52 6Z" fill="${W}"/><path d="M72 40c14-10 34-10 52-6v62c-18-4-38-4-52 6Z" fill="${W}" fill-opacity=".72"/><path d="M72 40v62" ${st(ink, 3)}/></g>`;
		if (!D.text) {
			const k = wave(P);
			return book(64, 1) + txt(47, 82, "A", 28, ink, 900) + txt(97, 82, "a", 30, ink, 800) +
				sparkles(P, [[112, 18, 8]]) + `<path d="M${f(30 + 10 * k)} 24h${f(14)}" ${st(W, 4)} opacity="${f(0.3 + 0.5 * k)}"/>`;
		}
		const text = String(D.text);
		return book(26, 0.4) + `<rect x="8" y="50" width="128" height="56" rx="16" fill="${W}"/>` + txt(72, 78 + fit(text, 34, 116) * 0.34, text, fit(text, 34, 116), ink, 900);
	},
	/** Fun Fact. No data: a light bulb with soft rays. D.topic picks a small corner picture. */
	lfact: (ink, P, D = {}) => {
		const k = wave(P);
		const rays = Array.from({ length: 7 }, (_, i) => { const a = Math.PI + (i / 6) * Math.PI, r1 = 44, r2 = 52 + 6 * k; return `<path d="M${f(72 + r1 * Math.cos(a))} ${f(50 + r1 * Math.sin(a))}L${f(72 + r2 * Math.cos(a))} ${f(50 + r2 * Math.sin(a))}" ${st(W, 5)} opacity="${f(0.4 + 0.6 * k)}"/>`; }).join("");
		const bulb = (s, x, y) => `<g transform="translate(${x} ${y}) scale(${s}) translate(-72 -56)"><path d="M72 18a32 32 0 0 0-18 58c4 3 6 7 6 12h24c0-5 2-9 6-12a32 32 0 0 0-18-58Z" fill="${W}"/><rect x="58" y="92" width="28" height="7" rx="3" fill="${W}"/><rect x="62" y="102" width="20" height="7" rx="3" fill="${W}"/><path d="M64 70l8-14 8 14" ${st(ink, 4)}/></g>`;
		if (!D.text) return rays + bulb(1, 72, 56);
		const topic = TOPICS[D.topic] ?? TOPICS.earth;
		const text = String(D.text);
		return `<g transform="translate(36 30) scale(.42) translate(-72 -60)">${rays}</g>` + bulb(0.42, 36, 30) +
			`<g transform="translate(106 30)">${topic(ink, P)}</g>` +
			`<rect x="8" y="56" width="128" height="50" rx="14" fill="${W}"/>` + txt(72, 81 + fit(text, 26, 116) * 0.34, text, fit(text, 26, 116), ink, 900);
	},
	/** Read to Me: a speaker beside lines of text; waves move while it is reading. */
	lread: (ink, P, D = {}) => {
		const talking = !!D.speaking;
		const waves = [0, 1, 2].map((i) => `<path d="M${102 + i * 9} ${f(40 - i * 8)}a${f(22 + i * 10)} ${f(22 + i * 10)} 0 0 1 0 ${f(40 + i * 16)}" ${st(W, 5)} opacity="${f(talking ? wave(P * 2 + i * 0.25) : 0.25)}"/>`).join("");
		return `<rect x="14" y="22" width="66" height="80" rx="10" fill="${W}"/>` +
			[0, 1, 2, 3].map((i) => `<path d="M26 ${40 + i * 15}h${i === 3 ? 26 : 42}" ${st(ink, 6)} opacity="${talking && Math.floor(P * 8) % 4 === i ? 1 : 0.55}"/>`).join("") +
			`<path d="M84 50h8l12-10v44l-12-10h-8Z" fill="${W}"/>` + waves +
			(talking ? `<rect x="22" y="108" width="100" height="8" rx="4" ${soft(0.25)}/><rect x="22" y="108" width="${f(100 * Math.min(1, D.frac ?? P))}" height="8" rx="4" fill="${W}"/>` : "");
	},
	/** Reading Timer: book under a countdown ring. */
	ltimer: (ink, P, D = {}) => {
		const C = 2 * Math.PI * 44, left = D.frac === undefined ? 1 : 1 - D.frac;
		const done = D.done;
		let art = `<circle cx="72" cy="58" r="44" ${st(W, 8)} opacity=".22"/>` +
			`<circle cx="72" cy="58" r="44" ${st(W, 8)} stroke-dasharray="${f(C * left)} ${f(C)}" transform="rotate(-90 72 58)"/>`;
		if (done) return art + `<circle cx="72" cy="58" r="30" fill="${W}"/>` + check(70, 60, 12, ink, 8) + sparkles(P, [[20, 20, 9], [124, 22, 7], [122, 100, 8]]);
		const text = D.text ?? "20:00";
		art += `<g transform="translate(72 36) scale(.26) translate(-72 -70)"><path d="M72 40C58 30 38 30 20 34v62c18-4 38-4 52 6Z" fill="${W}"/><path d="M72 40c14-10 34-10 52-6v62c-18-4-38-4-52 6Z" fill="${W}" fill-opacity=".72"/></g>` +
			txt(72, 74, text, String(text).length > 5 ? 20 : 26, W, 900);
		if (D.paused) art += `<rect x="62" y="88" width="6" height="12" rx="2" fill="${W}"/><rect x="76" y="88" width="6" height="12" rx="2" fill="${W}"/>`;
		else if (D.running) art += `<circle cx="${f(72 + 44 * Math.sin(T * (1 - left)))}" cy="${f(58 - 44 * Math.cos(T * (1 - left)))}" r="${f(5 + 2 * wave(P * 2))}" fill="${W}"/>`;
		return art;
	},
	/** Star Chart: stars earned today against the goal; a trophy once the goal is reached. */
	lstars: (ink, P, D = {}) => {
		const n = D.n ?? 0, goal = D.goal ?? 10;
		if (D.n !== undefined && n >= goal) {
			const k = wave(P);
			return `<path d="M44 24h56v20a28 28 0 0 1-56 0Z" fill="${W}"/><path d="M44 32H30a14 14 0 0 0 16 20M100 32h14a14 14 0 0 1-16 20" ${st(W, 6)}/>` +
				`<rect x="66" y="70" width="12" height="14" fill="${W}"/><rect x="50" y="84" width="44" height="10" rx="4" fill="${W}"/>` +
				`<polygon points="${starPts(72, 40, 11, 5)}" fill="${ink}"/>` + txt(72, 116, `${n} ★`, 18, W, 900) +
				sparkles(P, [[22, 22, 9 + 3 * k], [124, 26, 8], [120, 82, 7], [24, 84, 6]]);
		}
		const spin = 6 * Math.sin(P * T);
		let art = `<g transform="rotate(${f(spin)} 72 54)"><polygon points="${starPts(72, 54, 44, 19)}" fill="${W}" stroke="${W}" stroke-width="6" stroke-linejoin="round"/></g>`;
		if (D.n !== undefined) {
			art += txt(72, 64, String(n), String(n).length > 1 ? 24 : 28, ink, 900);
			const dots = Math.min(goal, 10);
			art += Array.from({ length: dots }, (_, i) => { const on = i < Math.round((n / goal) * dots); return `<circle cx="${f(72 + (i - (dots - 1) / 2) * 11)}" cy="110" r="4" fill="${W}" opacity="${on ? 1 : 0.28}"/>`; }).join("");
		}
		return art + sparkles(P, [[118, 22, 8]]);
	},
	/** Task Done: a checklist card; ticked once today's task is done. */
	ltask: (ink, P, D = {}) => {
		const done = !!D.done;
		let art = `<rect x="22" y="16" width="100" height="96" rx="14" ${soft(0.16)} stroke="${W}" stroke-width="5"/>` +
			`<rect x="38" y="36" width="56" height="56" rx="12" fill="${done ? W : "none"}" stroke="${W}" stroke-width="6"/>`;
		if (done) art += check(64, 64, 14, ink, 9) + sparkles(P, [[110, 30, 8], [112, 96, 6]]);
		else art += `<path d="M${f(50 + 6 * wave(P))} 64h${f(20)}" ${st(W, 6)} opacity="${f(0.25 + 0.4 * wave(P))}"/><path d="M104 34l10 10-28 28-12 2 2-12Z" fill="${W}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
		return art;
	},
	/** Learning site (no preset chosen): a graduation cap with a soft tassel swing. */
	lcap: (ink, P) => {
		const sw = 10 * Math.sin(P * T);
		return `<path d="M72 22L134 50 72 78 10 50Z" fill="${W}"/><path d="M38 64v20c0 10 16 18 34 18s34-8 34-18V64L72 78Z" fill="${W}" fill-opacity=".75"/>` +
			`<g transform="rotate(${f(sw)} 112 54)"><path d="M112 54v36" ${st(W, 4)}/><rect x="106" y="88" width="12" height="16" rx="4" fill="${W}"/></g><circle cx="72" cy="50" r="5" fill="${ink}"/>`;
	},
	/** Coding sites: stacking puzzle blocks. */
	lblocks: (ink, P) => {
		const k = Math.min(1, P * 2.2), drop = (1 - (k < 1 ? k * k : 1)) * -30;
		const block = (x, y, w, o = 1) => `<path d="M${x} ${y}h10v-5h12v5h${w - 22}a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H${x}a6 6 0 0 1-6-6V${y + 6}a6 6 0 0 1 6-6Z" fill="${W}" fill-opacity="${o}"/>`;
		return block(22, 78, 98, 0.55) + block(30, 50, 76, 0.8) + `<g transform="translate(0 ${f(drop)})" opacity="${f(Math.min(1, 0.3 + k))}">${block(38, 22, 58)}</g>` + `<path d="M50 32l-6 5 6 5M68 32l6 5-6 5" ${st(ink, 3.5)} transform="translate(${f(0)} ${f(drop)})"/>`;
	},
	/** Early learning: three alphabet blocks. */
	labc: (ink, P) => [["A", 18, 62, 0], ["B", 76, 62, 0.33], ["C", 47, 18, 0.66]].map(([l, x, y, d]) => {
		const k = wave(P + d);
		return `<g transform="translate(0 ${f(-3 * k)})"><rect x="${x}" y="${y}" width="50" height="48" rx="9" fill="${W}" fill-opacity="${l === "C" ? 1 : 0.8}"/>` + txt(x + 25, y + 36, l, 30, ink, 900) + "</g>";
	}).join(""),
	/** Maths: an abacus with beads sliding. */
	labacus: (ink, P) => {
		const rows = [0, 1, 2].map((r) => {
			const y = 38 + r * 24, k = wave(P + r * 0.2);
			return `<path d="M24 ${y}h96" ${st(W, 4)} opacity=".55"/>` + [0, 1, 2, 3].map((b) => `<circle cx="${f(34 + b * 14 + (b >= 2 - r % 2 ? 34 * k : 0))}" cy="${y}" r="7" fill="${W}"/>`).join("");
		}).join("");
		return `<rect x="14" y="20" width="116" height="84" rx="10" ${soft(0.12)} stroke="${W}" stroke-width="6"/>` + rows + `<path d="M24 112l-6 8M120 112l6 8" ${st(W, 6)}/>`;
	},
	/** Games: two jigsaw pieces clicking together. */
	lpuzzle: (ink, P) => {
		const gap = 10 * (1 - wave(P));
		const left = `<path d="M18 30h40v14a9 9 0 1 1 0 18v14H18Z" fill="${W}"/>`;
		const right = `<path d="M${f(70 + gap)} 30h44v46H${f(70 + gap)}V62a9 9 0 1 0 0-18Z" fill="${W}" fill-opacity=".72"/>`;
		return left + right + `<path d="M18 92h96" ${st(W, 4)} opacity="${f(0.25 + 0.5 * (1 - gap / 10))}"/>`;
	},
};

/** Small corner pictures for Fun Fact topics (drawn around 0,0, about 40 px wide). */
const TOPICS = {
	space: (ink, P) => `<circle cx="0" cy="0" r="12" fill="${W}"/><ellipse cx="0" cy="0" rx="22" ry="7" ${st(W, 3.5)} transform="rotate(${f(-20 + 8 * Math.sin(P * T))})"/>`,
	animal: () => `<ellipse cx="0" cy="6" rx="10" ry="8" fill="${W}"/>` + [[-12, -6], [-4, -13], [4, -13], [12, -6]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4.5" ry="5.5" fill="${W}"/>`).join(""),
	earth: (ink, P) => `<path d="M-14 12C-14-6 0-16 16-16C16 2 4 14-14 12Z" fill="${W}"/><path d="M-10 10L8-8" ${st(ink, 3)}/>`,
	body: () => `<path d="M0 14S-16 4-16-5a8 8 0 0 1 16-3 8 8 0 0 1 16 3C16 4 0 14 0 14Z" fill="${W}"/>`,
};

/** Glyphs to offer in the icon picker, in display order. */
export const LEARN_PICKABLE = Object.keys(LEARN_FX);
