https://github.com/user-attachments/assets/a2984771-eaf1-4cbf-a327-d3ccc290f1af

# line-codex-stickers

Adds a LINE sticker button to the Codex desktop composer. You can browse local packs, keep favorites, and hover over a sticker to see it larger.

This repo holds scripts and notes only. It does not ship Codex/ChatGPT, sticker images, login profiles or prepared app updates, so cloning it does not give you a working app.

## Local project location

Keep the checkout in the Projects folder under your user profile:

```powershell
git clone https://github.com/stantheman0128/line-codex-stickers.git "$env:USERPROFILE\Projects\line-codex-stickers"
Set-Location "$env:USERPROFILE\Projects\line-codex-stickers"
```

Local evidence and runtime files go in work/ and outputs/, which Git ignores. Keep both directories and the existing Codex profile when you migrate. Compatibility directory links let old image paths keep working. Quit Codex normally before you move runtime files it is still using.

## Start an existing prepared installation

Install LINE desktop and Codex desktop yourself. The picker reads the stickers LINE has already stored on your computer, and that cache is not a verified record of what you bought. Do not commit sticker files.

The launcher looks for the prepared runtime in two places: outputs/codex-line-stickers/app/, which is the migrated workspace layout, and codex-line-stickers/app/ next to the launcher. If both exist, it picks the workspace layout and uses that runtime's update script and prepared updates.

To check paths without launching or stopping anything:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\codex-line-stickers\Start-Line-Codex.ps1 -ValidateOnly
```

To start it, quit Codex normally first, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\codex-line-stickers\Start-Line-Codex.ps1
```

The launcher goes through Resource Sentinel at %USERPROFILE%\Projects\resource-sentinel and keeps the existing Codex profile. -Admitted is a flag the launcher passes to itself through the Sentinel wrapper, so leave it off for a normal launch. See the [integration notes](NATIVE-INTEGRATION.md).
