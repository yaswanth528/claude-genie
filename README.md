# SiteGenie (claude genie)

Voice-to-Page for MSMEs. An owner speaks for about 20 seconds and gets a shareable shop page with WhatsApp ordering, then changes it by voice. Built from the MVP scope in the Obsidian vault (`Voice-to-Page for MSMEs – MVP Scope.pdf`).

## The journey

1. **Speak** (`/create`): the phone records about 20 seconds of audio and Gemini transcribes it (Kannada, Hindi, English or a mix). You can also type.
2. **Extract**: Gemini (`gemini-3.5-flash-lite` by default, structured JSON output) turns the transcript into business name + items + prices, and flags prices that may be misheard.
3. **Read-back**: the list is shown (and can be read aloud); the owner fixes anything and confirms. Rules check that every item has a name and a price, that no price is negative and that there are no duplicates.
4. **Publish**: the catalogue is saved and the owner gets a public link (`/p/<slug>`) and a private edit link.
5. **Order**: the customer picks quantities and taps *Order on WhatsApp*, which opens `wa.me/<owner>` with the item list filled in.
6. **Voice edit** (`/p/<slug>/edit#key=…`): Gemini turns "change the kurti price to 799" into a patch. The owner sees a before/after, and the page updates only after they approve. "Undo last change" restores the previous version (the last 10 are kept).

AI is used only for messy speech (steps 2 and 6). Everything else is deterministic code in `lib/catalogue.ts`.

## Run it

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY
npm run dev
```

## Storage

- No GitHub settings: catalogues are written to `data/catalogues/*.json`, for local development.
- With `GITHUB_TOKEN` + `GITHUB_REPO`: each publish or edit is a commit to `catalogues/<slug>.json`, so git history gives you undo. This mode is required on Vercel, because the filesystem there is read-only.

## Images

Drop images (png, jpg, webp, svg…) into this folder or into `images/`. `npm run dev` and `npm run build` copy them to `public/images`. The first image, alphabetically, becomes the landing-page hero and the rest form the gallery. Name a file `01-hero.jpg` to choose the hero.

## Out of MVP scope

Payments/UPI, address capture, logins, custom domains and analytics (per the MVP scope). Speech-to-text, the scope's one open decision, is resolved as Gemini audio transcription.

## Settings (Vercel → Environment Variables)

| Variable | Turns on |
|---|---|
| `GEMINI_API_KEY` | Speech, website planning, translations, voice edits |
| `UNSPLASH_ACCESS_KEY` / `PIXABAY_API_KEY` | Stock photos when the owner adds none |
| `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (Pages Edit, D1 Edit) | Separate customer websites and D1 storage |
| `ADMIN_PASSWORD` | Admin panel at `/admin` |
| `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` + `AUTH_SECRET` | Owner login with a WhatsApp code |
| `GITHUB_TOKEN` + `GITHUB_REPO` | Older storage (import into D1 from `/admin`) |

Variables only reach the site after a new deployment.
