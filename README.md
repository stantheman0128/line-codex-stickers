# line-codex-stickers

Codex desktop composer button for LINE stickers.

This repo is scripts and notes only. It does not include the Codex/ChatGPT app, and it does not include sticker images.

Stickers come from the LINE desktop app already installed on your computer. Install LINE, sign in, and use the stickers you already have. Do not commit sticker files.

## Use

1. Install LINE desktop and Codex desktop yourself. This project does not distribute either app.
2. Quit Codex.
3. Start with:

`
powershell -NoProfile -ExecutionPolicy Bypass -File codex-line-stickers\Start-Line-Codex.ps1 -Admitted
`

-Admitted skips Resource Sentinel queueing. See NATIVE-INTEGRATION.md.

This is a contest prototype. Downloading the repo alone does not give you a working app, because the Codex copy stays on your machine.
