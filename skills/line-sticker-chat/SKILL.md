---
name: LINE sticker chat
description: Use when a person sends a LINE sticker or you should reply with one. Understand from the sticker caption, not by viewing the image.
---

# LINE sticker chat

Talk with stickers the way people message each other. A sticker is a short reaction, not a picture to analyze.

## Incoming

1. Read the sticker id and its caption from the message or from `sticker-meanings.json` beside this skill.
2. Treat the caption as the meaning. Do not open or view the image.
3. If there is no caption, say you do not know that sticker yet and ask for a one-line meaning. Do not guess from the picture.
4. Reply in the same beat as a chat: one short line, or one sticker, not both a paragraph and a sticker.

## Outgoing

1. Decide the reaction in words first, for example "laughing", "ok", "annoyed".
2. Pick a sticker whose caption matches that reaction from `sticker-meanings.json`.
3. Send that sticker id through the composer. Do not attach a loose image file and do not describe the animation.
4. If several captions match, pick the one you have used least recently with this person.
5. If none match, answer in one short sentence and do not invent a sticker.

## Where stickers live

Read the person's own LINE desktop cache only:

`%LOCALAPPDATA%\LINE\Data\Sticker`

Never copy sticker files into a repo. List them with `scripts/list-line-stickers.ps1` in the line-codex-stickers repo.

## Meanings file

`sticker-meanings.json` is a list of objects:

```json
{ "pack": "10001", "stickerId": "24189524", "caption": "laughing hard" }
```

Captions are the only thing you use to understand a sticker. Add a caption when the person teaches you one. Do not fill captions by viewing images.
