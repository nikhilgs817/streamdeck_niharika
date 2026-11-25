# Install Learning Deck

## Double-click installer

1. Get **LearningDeck-Installer-1.0.0.0.zip** from [GitHub Releases](https://github.com/nikhilgs817/streamdeck_niharika/releases/latest), or build it yourself (see below).
2. Right-click the ZIP and choose **Extract All**. Open the extracted **LearningDeck-Installer** folder.
3. Double-click **Install-LearningDeck.cmd**. Keep the other files in that folder.
4. Wait for **Installed Learning Deck 1.0.0.0**. Stream Deck closes briefly and opens again by itself.
5. In Stream Deck, choose **Learning Deck** from the profile list, or drag keys from the **Learning Deck** group in the action list.

No Git, Node.js or developer mode is needed for the ZIP. Run the installer as your normal Windows user. If Stream Deck is missing or too old, the installer asks first, then can install or update it through Windows Package Manager. Windows Toolkit is not needed.

## Build the installer yourself

With Git and Node.js 20 or later:

```powershell
git clone https://github.com/nikhilgs817/streamdeck_niharika.git
cd streamdeck_niharika
npm ci
npm run build
npm test
npm run pack
npm run build:installer
```

The installer is then in `dist\LearningDeck-Installer`.

## What happens automatically

- Checks Windows 10/11 64-bit and Stream Deck 7.1 or later. Stream Deck supplies the plugin's Node runtime.
- Verifies the package checksum, plugin identity, version and files before changing anything.
- Backs up the current plugin and Stream Deck profiles under `%LOCALAPPDATA%\LearningDeck\Backups`.
- Installs Learning Deck for the current user and keeps existing keys, settings and progress.
- Adds the **Learning Deck** profile for a detected 15-key deck. Existing profiles are never replaced or duplicated.
- Restarts Stream Deck and checks the plugin starts. If it does not, it restores the previous version and removes only the profiles it added.

The installer does not create accounts, sign in anywhere or change Windows settings.

## Voice

Learning Deck uses the voice built into Windows. If keys are silent, check Windows Settings › Time & language › Speech has a voice installed, and that the PC's sound is on and not muted.

## Update, reinstall or remove

Run a newer installer; there is no need to uninstall first. Re-running the same one repairs it. An older installer will not replace a newer installed version. To remove it, right-click any Learning Deck action in Stream Deck › Uninstall. Stars and ticks are in `%APPDATA%\LearningDeck\progress.json`; delete that file to start over.

## If installation does not finish

- **Missing files or checksum failure:** extract a fresh copy of the whole ZIP; do not run it from inside the ZIP.
- **Stream Deck not found:** install it from [Elgato Downloads](https://www.elgato.com/downloads), then run the installer again.
- **No profile appears:** connect the deck and run the installer again. The keys also work on other deck sizes from the action list.
- **Startup failed:** the previous version is restored automatically. Keep the log path shown in the window.

Installer logs: `%LOCALAPPDATA%\LearningDeck\Logs`. Plugin logs: `%APPDATA%\Elgato\StreamDeck\Plugins\com.windowstoolkit.learning.sdPlugin\logs`.

## Manual alternative

Open **com.windowstoolkit.learning.streamDeckPlugin** from `dist` (or the release) and accept it in Stream Deck.

## Advanced options

```powershell
# Check compatibility without changing anything.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\installer\Install-Plugin.ps1 -CheckOnly
```
