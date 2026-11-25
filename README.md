# Learning Deck

Elgato Stream Deck plugin with learning keys for kids, aimed at ages 7 to 9 (grades 2 and 3). Version 1.0.0.0, Windows 10 and 11.

Maths, times tables, division, telling the time, spelling, a word of the day, fun facts, read-aloud, a reading timer, a star chart, daily task ticks and kid-safe learning sites. Every key speaks in the Windows voice and draws in the same Design System 4 looks as Windows Toolkit, with **Glass** as the default.

![The bundled layout, mid-quiz](docs/images/layout.png)

**Safe by design:** no accounts, no sign-in, no internet needed (except the Learning Site key, which only opens the site you pick in the browser). Nothing about the child is collected or sent anywhere. The only thing saved is a small progress file on this PC with star counts and which task keys were ticked today.

## Install

**From a release:** download **LearningDeck-Installer-1.0.0.0.zip** from [Releases](https://github.com/nikhilgs817/streamdeck_niharika/releases/latest), extract it, and double-click **Install-LearningDeck.cmd**.

**From source** (Node.js 20 or later):

```powershell
npm ci
npm run build
npm run pack
npm run build:installer
.\dist\LearningDeck-Installer\Install-LearningDeck.cmd
```

The installer checks Stream Deck 7.1+, verifies the package, backs up your setup, keeps your existing layouts, adds the **Learning Deck** profile and rolls back if startup fails. Windows Toolkit is not needed. [Full installation guide](docs/INSTALL.md).

## The keys

The bundled 15-key **Learning Deck** profile:

| | | | | |
|---|---|---|---|---|
| Back | Question | Star Chart | Word of the Day | Fun Fact |
| Answer A | Answer B | Answer C | Answer D | Spelling Bee |
| Read to Me | Reading Timer | Task Done | Typing (site) | Scratch (site) |

| Key | Tap | Double-tap | Hold (1 s) |
|---|---|---|---|
| **Question** | Hear the question again. With no Answer keys on the deck it works as a flash card: tap to see the answer, tap again for the next | Next subject | Skip to a new question |
| **Answer A–D** | Pick that answer. Right turns green, says well done and earns a star on the first try; wrong shakes gently and says try again | | |
| **Spelling Bee** | Hear a word to spell. Tap again to see it spelled out and hear the letters (earns a star) | | Hear the word again |
| **Word of the Day** | Hear the word, its meaning and an example. A new word every day | | A bonus word |
| **Fun Fact** | A new fact about space, animals, nature or the body, read aloud | | |
| **Read to Me** | Copy text (Ctrl+C), then tap to hear it. Tap again to stop | | |
| **Reading Timer** | Start or pause (20 minutes by default). Chimes, says well done and earns a star at the end | | Reset |
| **Star Chart** | Hear today's stars. Shows a trophy at the daily goal | | Reset (3 s, for grown-ups) |
| **Task Done** | Tick a daily routine (like "Piano") and earn a star. Clears overnight | | Untick |
| **Learning Site** | Open the site on screen 1 | Screen 2 | Screen 3 |
| **Back** | Return to your previous keys | | |

**Question subjects:** plus and minus, times tables (all or one table from 2 to 12), division, mixed maths, missing letter and telling the time. Levels: Easy, Medium (age 8) and Hard. Two, three or four choices.

**Learning sites:** TypingClub, Scratch, Code.org, Khan Academy Kids, Khan Academy grade 3 maths, NASA Space Place, National Geographic Kids, PBS KIDS games, or any other `http`/`https` address. Each preset has its own key art. Choose whether the site opens with tap / double-tap / hold on screens 1 / 2 / 3, always on one screen, or wherever Windows puts it, and how screens are numbered.

**Your own words:** the Spelling Bee and the Question key's missing-letter subject take your own list (commas or new lines). Word of the Day takes `word = meaning` lines.

**Voice:** the built-in Windows voice (System.Speech), offline. Slow, normal or fast, per key. Questions can be silent.

## Key settings (for grown-ups)

Select a key in Stream Deck to change it. Every key also has the **Look** settings below.

| Key | Settings |
|---|---|
| **Question** | Subject (plus and minus, times tables, division, mixed maths, missing letter, tell the time), Level (Easy, Medium, Hard), Times table (mixed 2 to 10, or one table from 2 to 12), Answer keys (2, 3 or 4 choices), Own spelling words for Missing letter, Read questions aloud, Voice speed |
| **Answer** | Choice: A, B, C or D. Put one key per choice the Question key uses |
| **Spelling Bee** | Words (grade 2, grade 3 or My own list), Own words (for example this week's list from school), Earn a star when the spelling is shown, Voice speed |
| **Word of the Day** | Words (50 built-in, or My own list as `word = what it means` lines), Voice speed |
| **Fun Fact** | Topics (all, space, animals, nature and weather, the human body), Read facts aloud, Voice speed |
| **Read to Me** | Voice speed |
| **Reading Timer** | Minutes (20 by default), Chime and cheer at the end, Earn a star when the time is up |
| **Star Chart** | Daily goal (10 by default), Start again (every morning, or only when you reset it) |
| **Task Done** | Task (the word shown on the key, like "Piano"), Earn a star when ticked |
| **Learning Site** | Site (one of the presets, or Another site with its address), Open on (tap screen 1 · double-tap 2 · hold 3, always one screen, or wherever Windows puts it), Screen numbers (as Windows numbers them, left to right, or main screen first) |

Voice speed is Slow, Normal or A bit faster. Own word lists take commas or new lines.

## Appearance

![Every key in the five looks](docs/images/looks.png)

**Glass** is the default. The learning art (question cards, answer tiles, the bee, the book timer, stars and so on) is drawn inside the same design system as [Windows Toolkit](https://github.com/nikhilgs817/windows_toolkit), so it changes with the look. Select a key and open **Look**:

| Setting | Choices |
|---|---|
| **Style** | Glass (default), Vivid, Neon, Mono or Pro |
| **Label** | Your own text (up to 18 letters, fitted to the key), Auto case / Title Case / UPPER CASE, or **Hide** |
| **Picture** | **Use my own picture…** (PNG, JPEG, GIF, SVG, WebP or BMP). **Remove picture** goes back to the drawn art |
| **Animation** | Full, Glow only, Icon only or Still, at Slow, Calm (default), Normal or Fast |
| **Glow** | Subtle, Normal or Bold, plus **Ripple when pressed** |
| **Colour** | 42 colour themes, or two colours of your own with **Use these colours** (**Back to theme** undoes it) |

**Use this look on all keys** copies the style, animation, glow, label case and ripple to every Learning Deck key. Colours, icons and labels stay as they are. **Reset look** (under the preview) returns a key to the defaults. Keys stay still while Windows **Animation effects** is off, unless you untick **Keep keys still when Windows animations are off**. Right and wrong answers keep their green and gentle-shake feedback in every look.

## Troubleshooting

- **The keys are silent.** Check the PC's sound is on and not muted, and that Windows has a voice: Settings › Time & language › Speech. The Question and Fun Fact keys also have **Read … aloud** ticks.
- **Answer keys do nothing, or say "Put a Question key on the deck first".** They need a **Question** key showing on the same deck. Make sure each Answer key has its own **Choice** (A, B, C, D) and the Question key's **Answer keys** matches how many there are.
- **Read to Me says nothing.** It reads what's on the clipboard: select some text, press Ctrl+C, then tap the key.
- **Stars or ticks disappeared.** Star Chart starts again every morning unless **Start again** is set to "Only when I reset it". Task Done ticks clear overnight by design.
- **A site opens on the wrong screen.** Change **Screen numbers** on the Learning Site key, or pick **Always screen 1/2/3**.
- **A site won't open.** Only `http` and `https` addresses open. Check the address in the key's settings.
- **Keys don't move.** Windows **Animation effects** is off, or the key's **Animation** is Still.
- **Logs** are in `%APPDATA%\Elgato\StreamDeck\Plugins\com.windowstoolkit.learning.sdPlugin\logs`. Installer problems are covered in the [installation guide](docs/INSTALL.md#if-installation-does-not-finish).

## Build and test

```powershell
npm ci
npm run build          # manifest, images, profile and bundle
npm test               # content and art checks, settings panel, simulated Stream Deck (no hardware)
npm run check:design   # Design System 4 matches a windows_toolkit clone next to this one
npm run validate       # Elgato's validator
npm run pack
npm run build:installer
npm run test:installer # Windows only, isolated fixtures
npm run preview        # re-render docs/images
```

`npm test` drives every key on a simulated Stream Deck in dry-run mode: it answers quiz questions right and wrong, spells, reads, runs the timer to the chime, ticks tasks, opens sites on each screen, refuses unsafe addresses and checks every image.

## Files

- `plugins/learning/content.js` questions, spelling lists, words, facts and sites
- `plugins/learning/art.js` the learning key art
- `plugins/learning/catalogue.mjs` the keys and their settings (drives the manifest and settings panel)
- `plugins/learning/src/` key behaviour, speech and progress
- `shared/` Design System 4, copied unchanged from [Windows Toolkit](https://github.com/nikhilgs817/windows_toolkit)

Progress file: `%APPDATA%\LearningDeck\progress.json`. Plugin logs: `%APPDATA%\Elgato\StreamDeck\Plugins\com.windowstoolkit.learning.sdPlugin\logs`.

## Licence

MIT. Site names belong to their owners; this plugin only opens their public pages.
