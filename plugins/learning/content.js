// Learning Deck content: the questions, words and facts behind the keys.
// Everything is local: no accounts, no network, nothing about the child is stored or sent anywhere.
// Pure functions so the plugin, the build script and the tests all share them.

/** Small seedable random source so tests can replay a quiz. */
export function rng(seed = Date.now()) {
	let s = (Number(seed) >>> 0) || 1;
	return () => {
		s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
		return s / 4294967296;
	};
}
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, list) => list[Math.floor(r() * list.length)];
const shuffle = (r, list) => {
	const a = list.slice();
	for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
	return a;
};

/* ------------------------------------------------------------------ quiz subjects */

export const SUBJECTS = [
	["math", "Plus and minus"],
	["times", "Times tables"],
	["divide", "Division"],
	["mixed", "Mixed maths"],
	["spell", "Missing letter"],
	["clock", "Tell the time"],
];
export const SUBJECT_IDS = SUBJECTS.map(([id]) => id);
export const SUBJECT_SHORT = { math: "Plus & minus", times: "Times tables", divide: "Division", mixed: "Mixed maths", spell: "Missing letter", clock: "Tell the time" };

export const LEVELS = [["easy", "Easy"], ["medium", "Medium (age 8)"], ["hard", "Hard"]];

/**
 * Makes wrong answers that are close to the right one, so guessing is not easy.
 * @returns {string[]} `count` distinct choices that include `answer`, shuffled.
 */
export function numberChoices(r, answer, count, { min = 0, spread = 10 } = {}) {
	const out = new Set([answer]);
	const near = [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10, answer + spread, answer - spread];
	for (const n of shuffle(r, near)) { if (out.size >= count) break; if (n >= min && n !== answer) out.add(n); }
	let guard = 0;
	while (out.size < count && guard++ < 200) { const n = answer + int(r, -spread - 3, spread + 3); if (n >= min) out.add(n); }
	return shuffle(r, [...out]).map(String);
}

/** The "times" key setting: one table (2-12) or "all". */
const tableOf = (r, table) => { const n = Number(table); return n >= 1 && n <= 12 ? n : int(r, 2, 10); };

function mathQuestion(r, level) {
	const plus = r() < 0.5;
	const max = level === "easy" ? 10 : level === "hard" ? 1000 : 100;
	if (plus) {
		const a = int(r, level === "easy" ? 0 : 5, Math.floor(max * 0.6)), b = int(r, 1, max - a);
		return { text: `${a} + ${b}`, speak: `What is ${a} plus ${b}?`, answer: String(a + b), spread: level === "hard" ? 100 : 10 };
	}
	const a = int(r, level === "easy" ? 2 : 10, max), b = int(r, 1, a);
	return { text: `${a} − ${b}`, speak: `What is ${a} minus ${b}?`, answer: String(a - b), spread: level === "hard" ? 100 : 10 };
}
function timesQuestion(r, level, table) {
	const t = tableOf(r, table);
	const other = level === "easy" ? int(r, 1, 5) : level === "hard" ? int(r, 2, 12) : int(r, 1, 10);
	const [a, b] = r() < 0.5 ? [t, other] : [other, t];
	return { text: `${a} × ${b}`, speak: `What is ${a} times ${b}?`, answer: String(a * b), spread: Math.max(2, t) };
}
function divideQuestion(r, level, table) {
	const t = tableOf(r, table);
	const q = level === "easy" ? int(r, 1, 5) : level === "hard" ? int(r, 2, 12) : int(r, 1, 10);
	return { text: `${t * q} ÷ ${t}`, speak: `What is ${t * q} divided by ${t}?`, answer: String(q), spread: 3 };
}

/** Words for the missing-letter quiz and the Spelling Bee (common US grade 2 and 3 words). */
export const SPELLING = {
	grade2: ["because", "friend", "people", "again", "before", "laugh", "would", "could", "should", "write", "their", "there", "which", "about", "little", "house", "water", "every", "never", "always", "around", "school", "family", "pretty", "together", "light", "night", "many", "very", "where", "thought", "animal", "mother", "father", "sister", "brother", "garden", "happy", "under", "after"],
	grade3: ["beautiful", "different", "favorite", "important", "special", "believe", "enough", "through", "answer", "question", "minute", "surprise", "careful", "library", "probably", "decide", "finally", "island", "busy", "early", "learn", "caught", "money", "people", "piece", "quiet", "remember", "sentence", "though", "weight", "whole", "worry", "already", "breakfast", "calendar", "country", "neighbor", "ocean", "though", "until"],
};
SPELLING.grade3 = [...new Set(SPELLING.grade3)];

/** Splits a "one word per line (or comma)" setting into clean lowercase words. */
export function wordList(raw, fallback = "grade2") {
	const own = String(raw ?? "").split(/[\r\n,;]+/).map((w) => w.trim().toLowerCase()).filter((w) => /^[a-z][a-z' -]*$/.test(w) && w.length >= 2 && w.length <= 18);
	return own.length ? [...new Set(own)].slice(0, 200) : SPELLING[fallback] ?? SPELLING.grade2;
}

function spellQuestion(r, level, words) {
	const list = words?.length ? words : level === "hard" ? SPELLING.grade3 : SPELLING.grade2;
	const word = pick(r, list.filter((w) => /^[a-z]+$/.test(w) && w.length >= 3)) ?? "friend";
	const vowels = [...word].map((c, i) => ("aeiou".includes(c) ? i : -1)).filter((i) => i > 0 || word.length < 5);
	const spots = vowels.filter((i) => i >= 0);
	const at = spots.length && level !== "hard" ? pick(r, spots) : int(r, 1, word.length - 1);
	const letter = word[at];
	const masked = word.slice(0, at) + "_" + word.slice(at + 1);
	return { text: masked, speak: `Which letter is missing? The word is ${word}.`, answer: letter, word, letters: true };
}
function letterChoices(r, answer, count) {
	const pool = "aeiou".includes(answer) ? "aeiouy" : "bcdfghklmnprstw";
	const out = new Set([answer]);
	for (const c of shuffle(r, [...pool])) { if (out.size >= count) break; out.add(c); }
	return shuffle(r, [...out]);
}

/** "3:05" style text for a clock time. */
export const clockText = (h, m) => `${h}:${String(m).padStart(2, "0")}`;
function clockQuestion(r, level) {
	const h = int(r, 1, 12);
	const m = level === "easy" ? pick(r, [0, 30]) : level === "hard" ? int(r, 0, 59) : int(r, 0, 11) * 5;
	return { text: "", clock: { h, m }, speak: "What time does the clock show?", answer: clockText(h, m) };
}
function clockChoices(r, q, count) {
	const { h, m } = q.clock;
	const out = new Set([q.answer]);
	const wrong = [
		clockText(m === 0 ? 12 : ((Math.round(m / 5) + 11) % 12) + 1, (h % 12) * 5 % 60), // hands swapped
		clockText((h % 12) + 1, m), clockText(((h + 10) % 12) + 1, m),
		clockText(h, (m + 15) % 60), clockText(h, (m + 30) % 60), clockText(h, (m + 55) % 60),
	];
	for (const w of shuffle(r, wrong)) { if (out.size >= count) break; out.add(w); }
	while (out.size < count) out.add(clockText(int(r, 1, 12), int(r, 0, 11) * 5));
	return shuffle(r, [...out]);
}

/**
 * One quiz question.
 * @param {{subject?: string, level?: string, table?: string|number, words?: string[], choices?: number, seed?: number, random?: () => number}} o
 * @returns {{subject: string, text: string, speak: string, answer: string, choices: string[], clock?: {h: number, m: number}, word?: string}}
 */
export function makeQuestion({ subject = "math", level = "medium", table, words, choices = 4, random } = {}) {
	const r = random ?? rng();
	let s = SUBJECT_IDS.includes(subject) ? subject : "math";
	if (s === "mixed") s = pick(r, ["math", "times", "divide"]);
	const n = Math.max(2, Math.min(4, Math.round(Number(choices) || 4)));
	const q = s === "times" ? timesQuestion(r, level, table) : s === "divide" ? divideQuestion(r, level, table) : s === "spell" ? spellQuestion(r, level, words) : s === "clock" ? clockQuestion(r, level) : mathQuestion(r, level);
	const list = s === "spell" ? letterChoices(r, q.answer, n) : s === "clock" ? clockChoices(r, q, n) : numberChoices(r, Number(q.answer), n, { spread: q.spread });
	return { subject: s, text: q.text, speak: q.speak, answer: q.answer, choices: list, ...(q.clock ? { clock: q.clock } : {}), ...(q.word ? { word: q.word } : {}) };
}

/* ------------------------------------------------------------------ words of the day */

/** [word, what it means, an example]. Simple, kind words for a 7–9 year old. */
export const WORDS = [
	["curious", "wanting to know or learn about something", "The curious cat looked inside the box."],
	["brave", "ready to do something even when it feels scary", "She was brave at the dentist."],
	["enormous", "very, very big", "The elephant was enormous."],
	["tiny", "very small", "A ladybug is tiny."],
	["gentle", "soft and kind, not rough", "Be gentle with the puppy."],
	["delighted", "very happy and pleased", "He was delighted with his present."],
	["patient", "able to wait calmly", "Be patient while the cookies bake."],
	["explore", "to look around a new place to learn about it", "Let's explore the park."],
	["invent", "to make something new that nobody made before", "She wants to invent a flying bike."],
	["observe", "to watch something carefully", "We observe the birds at the feeder."],
	["predict", "to say what you think will happen next", "Can you predict the end of the story?"],
	["recycle", "to use something again or turn it into something new", "We recycle bottles and paper."],
	["generous", "happy to share with others", "Sharing your snack is generous."],
	["honest", "telling the truth", "Thank you for being honest."],
	["fragile", "easy to break", "Glass is fragile."],
	["ancient", "very, very old", "The pyramids are ancient."],
	["cozy", "warm and comfortable", "The blanket is so cozy."],
	["glimmer", "a small, soft shine of light", "A glimmer of light came under the door."],
	["journey", "a trip from one place to another", "The journey to Grandma's took all day."],
	["measure", "to find out how big, long or heavy something is", "We measure the table with a ruler."],
	["protect", "to keep safe from harm", "A helmet protects your head."],
	["imagine", "to make a picture in your mind", "Imagine a castle in the clouds."],
	["rapid", "very fast", "The river was rapid after the rain."],
	["whisper", "to talk very quietly", "We whisper in the library."],
	["giggle", "a small, silly laugh", "The joke made us giggle."],
	["habitat", "the natural home of an animal or plant", "The ocean is a whale's habitat."],
	["shadow", "a dark shape made when something blocks the light", "My shadow is tall in the evening."],
	["swift", "moving very quickly", "The swift fox ran away."],
	["sturdy", "strong and hard to break", "The table is sturdy."],
	["cautious", "careful to stay safe", "Be cautious when you cross the street."],
	["confident", "feeling sure you can do something", "She felt confident before the test."],
	["clever", "quick to learn and understand", "That was a clever idea."],
	["fascinating", "very interesting", "Dinosaurs are fascinating."],
	["grateful", "thankful", "I am grateful for my friends."],
	["hibernate", "to sleep through the winter", "Bears hibernate in caves."],
	["identical", "exactly the same", "The twins wore identical hats."],
	["kind", "nice and caring to others", "It was kind to help him up."],
	["marvelous", "wonderful", "What a marvelous painting!"],
	["nervous", "a bit worried or scared", "I felt nervous on the first day."],
	["ordinary", "normal, not special", "It was an ordinary Tuesday."],
	["peculiar", "strange or unusual", "The soup had a peculiar smell."],
	["puzzled", "confused, not sure what something means", "He looked puzzled by the riddle."],
	["rescue", "to save someone from danger", "The firefighter rescued the kitten."],
	["soar", "to fly high in the sky", "Eagles soar above the hills."],
	["tremendous", "very large or very great", "The team made a tremendous effort."],
	["vanish", "to disappear suddenly", "The magician made the coin vanish."],
	["wander", "to walk around slowly without a plan", "We like to wander on the beach."],
	["zoom", "to move very fast", "The race car zoomed past."],
	["community", "a group of people who live or work together", "Our community has a big library."],
	["evidence", "facts that show something is true", "Muddy footprints were the evidence."],
];

/** Parses "word = meaning" lines from the key settings. */
export function ownWords(raw) {
	return String(raw ?? "").split(/\r?\n/).map((l) => l.split("=").map((x) => x.trim())).filter(([w, m]) => w && m && w.length <= 24).slice(0, 365).map(([w, m]) => [w.toLowerCase(), m, ""]);
}
/** Day number since 2026-01-01 (local time), so the word changes at midnight. */
export const dayIndex = (at = new Date()) => Math.floor((Date.UTC(at.getFullYear(), at.getMonth(), at.getDate()) - Date.UTC(2026, 0, 1)) / 86400000);
export const todayKey = (at = new Date()) => `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
export function wordOfDay(list = WORDS, at = new Date(), offset = 0) {
	const n = list.length;
	return list[(((dayIndex(at) + offset) % n) + n) % n];
}

/* ------------------------------------------------------------------ fun facts */

/** [topic glyph, short headline for the key, the fact read aloud]. Well-established facts only. */
export const FACTS = [
	["space", "Sun = star", "The Sun is a star. It is the closest star to Earth."],
	["space", "Jupiter", "Jupiter is the biggest planet in our solar system."],
	["space", "Venus heat", "Venus is the hottest planet, even though Mercury is closer to the Sun."],
	["space", "Moon steps", "Footprints on the Moon can last a very long time, because there is no wind to blow them away."],
	["space", "Red Mars", "Mars looks red because its ground is covered in rusty dust."],
	["space", "Saturn rings", "Saturn's rings are made of pieces of ice and rock."],
	["space", "Sunlight trip", "Light from the Sun takes about eight minutes to reach Earth."],
	["space", "Moonlight", "The Moon does not make its own light. It reflects light from the Sun."],
	["space", "Dwarf planet", "Pluto is called a dwarf planet."],
	["space", "Day and night", "Earth spins all the way around once a day. That is why we have day and night."],
	["animal", "3 hearts", "An octopus has three hearts."],
	["animal", "Blue whale", "The blue whale is the biggest animal that has ever lived."],
	["animal", "Backwards!", "Hummingbirds can fly backwards."],
	["animal", "Tasty feet", "Butterflies taste with their feet."],
	["animal", "Slow sloth", "Sloths move so slowly that tiny plants called algae can grow on their fur."],
	["animal", "Cheetah", "The cheetah is the fastest animal on land."],
	["animal", "Penguins", "Penguins are birds that cannot fly, but they are great swimmers."],
	["animal", "Bee dance", "Honeybees dance to tell other bees where to find flowers."],
	["animal", "Tall giraffe", "Giraffes are the tallest animals in the world."],
	["animal", "Owl eyes", "Owls cannot move their eyes, so they turn their heads instead."],
	["animal", "New arm", "A sea star can grow back an arm it has lost."],
	["animal", "Frog drinks", "Frogs do not drink with their mouths. They soak up water through their skin."],
	["animal", "Joeys", "A baby kangaroo is called a joey."],
	["animal", "Strong ants", "Ants can carry things that are much heavier than their own bodies."],
	["animal", "Flying bats", "Bats are the only mammals that can really fly."],
	["animal", "Dino birds", "Birds are living relatives of the dinosaurs."],
	["earth", "Snowflakes", "Snowflakes usually have six sides."],
	["earth", "Plant food", "Plants make their own food from sunlight, air and water. This is called photosynthesis."],
	["earth", "Ocean world", "Oceans cover about seventy percent of Earth."],
	["earth", "Lightning", "A bolt of lightning is hotter than the surface of the Sun."],
	["earth", "Rainbow", "A rainbow has seven colours: red, orange, yellow, green, blue, indigo and violet."],
	["earth", "Lava", "Lava is melted rock that comes out of a volcano."],
	["earth", "Rain", "Rain is water that went up into the sky, made clouds, and fell back down."],
	["earth", "Leap year", "A leap year has 366 days instead of 365."],
	["body", "206 bones", "A grown-up has 206 bones. Babies have more, and some join together as they grow."],
	["body", "Fist heart", "Your heart is a muscle about the size of your fist."],
	["body", "20 teeth", "Children have 20 baby teeth."],
	["body", "Messages", "Your brain sends messages to your body through nerves."],
	["earth", "Honey", "Honey can last for a very, very long time without going bad."],
	["body", "Tiny ear bone", "The smallest bone in your body is in your ear. It is smaller than a grain of rice."],
	["body", "Nails grow", "Your fingernails grow faster than your toenails."],
	["body", "Big muscle", "The biggest muscle in your body is in your bottom. It helps you stand up and climb stairs."],
	["body", "Blinking", "You blink thousands of times every day. Blinking keeps your eyes clean and wet."],
	["body", "Taste buds", "Your tongue is covered in thousands of tiny taste buds."],
	["body", "Skin", "Your skin is the biggest part of your body. It keeps germs out and keeps you warm."],
];

/* ------------------------------------------------------------------ kid-safe learning sites */

/** Free learning sites (checked Nov 2026). The parent can also enter any http(s) address. */
export const SITES = [
	["typing", "TypingClub (typing)", "https://www.typingclub.com", "keyboard", "Typing"],
	["scratch", "Scratch (coding)", "https://scratch.mit.edu/", "blocks", "Scratch"],
	["codeorg", "Code.org (coding, ages 5-11)", "https://code.org/en-US/students/elementary", "blocks", "Code.org"],
	["khankids", "Khan Academy Kids", "https://www.khanacademy.org/kids", "abc", "Khan Kids"],
	["khan3", "Khan Academy grade 3 maths", "https://www.khanacademy.org/math/3rd-grade-illustrative-mathematics", "abacus", "Maths"],
	["spaceplace", "NASA Space Place", "https://spaceplace.nasa.gov/", "rocketkid", "Space"],
	["natgeo", "National Geographic Kids", "https://kids.nationalgeographic.com/", "globekid", "Nat Geo"],
	["pbs", "PBS KIDS games", "https://pbskids.org/games", "puzzle", "PBS Kids"],
];
/** Only plain http(s) addresses, so a key can never open a file or a script. */
export function siteUrl(raw) {
	const t = String(raw ?? "").trim();
	if (!t) return undefined;
	try { const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : "https://" + t); return u.protocol === "http:" || u.protocol === "https:" ? u.href : undefined; } catch { return undefined; }
}

/* ------------------------------------------------------------------ praise */

export const PRAISE = ["Great job!", "You got it!", "Super!", "Well done!", "Brilliant!", "Awesome!", "Fantastic!", "Yes! Nice work."];
export const TRY_AGAIN = ["Almost! Try again.", "Not quite. Have another go.", "Good try! Look again."];
