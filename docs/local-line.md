# Load stickers from desktop LINE

Do not commit sticker files. Each person reads their own install.

Default folder:

```
%LOCALAPPDATA%\LINE\Data\Sticker\<pack>\...\animation\*.png
```

List what this PC already has:

```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\list-line-stickers.ps1
```

This file is separate from the composer patch so it can be updated without touching the running Codex copy.
