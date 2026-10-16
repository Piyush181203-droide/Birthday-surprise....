# Velvet Moments — Birthday Surprise Web Application

A complete, cinematic, responsive Birthday Surprise Web Application built from scratch. It features two distinct, secure experiences:

1. **Public Recipient Experience**: The birthday person opens an unguessable unique link (`/#/s/:slug/1`) and journeys through five immersive, connected pages.
2. **Private Administrator Experience**: Only the authorized administrator can log in, create/edit surprises, upload and trim audio songs, upload photo memories, configure interactive candles and secret letters, preview experiences in real-time, and publish shareable links (with WhatsApp integration).

---

## Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas-Confetti.
- **Audio Engine & Detection**: Web Audio API (real-time microphone frequency analysis for candle blowing, audio segment trimming with sub-second precision, autoplay block fallback handling).
- **Backend & APIs**: Node.js & Express (`server.ts`) with seamless Vite development middleware mounting.
- **Persistence & Storage**: Durable file-backed JSON database engine with atomic temp-file write-and-rename guarantees (`data/db.json`), media uploads stored in persistent local disk directory (`uploads/`) with static serving.
- **Security**: Server-side session authentication, PBKDF2/scrypt cryptographic password hashing, strict server-side authorization for all mutations, recipient slug isolation (drafts and private surprises return 404 to recipients).

---

## 5-Page Recipient Journey

1. **Page 1 — Welcome & Personal Song**: Deep ambient dark velvet background with romantic glowing particles, exact centered text *"This surprise is only for you ❤️"*, glassmorphic music player card, and *"Continue to Your Surprise ✨"* action.
2. **Page 2 — Cinematic Photo Memories & Second Song**: Desktop alternating split layout (photo & message sides alternate), compact mobile stacked layout, auto-advancing slides with configurable duration, independent background audio track that continues smoothly across slide changes.
3. **Page 3 — Birthday Cake, Candle Blowing & Happy Birthday Song**: Realistic 3D SVG cake with frosting layers, warm candlelight, dual blow interaction (Web Audio API microphone airflow detection + always-available tap button), smoke puff and flame extinguish animation, confetti burst, and preconfigured royalty-free Happy Birthday music box asset (`/audio/happy-birthday.wav`).
4. **Page 4 — Custom Question, Two Answers & Secret Letter**: Teasing question card (defaults to *"Ek chhota sa sawaal tumhare liye 💌"*), two buttons (*"Haa.. ❤️"* triggers playful shake response, *"Naii.. 🙈"* unseals the digital wax seal envelope and reveals the letter), preserved line breaks, parchment paper texture, and *"Read Again 💌"* replay control.
5. **Page 5 — Final Birthday Celebration**: Luxury grand floral bouquet visual with blooming petals, glowing rose accents, and silk ribbon; large *"HAPPY BIRTHDAY"* typography; recipient's custom name; celebratory confetti shower; and *"Replay Surprise 💖"* button.

---

## Environment Variables

Configured via `.env` (refer to `.env.example`):

```bash
# Optional custom admin password on initial setup (defaults to 'admin123')
ADMIN_PASSWORD="admin123"

# Node environment
NODE_ENV="development"

# App Port
PORT=3000
```

---

## Installation & Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate public domain audio assets** (if running fresh):
   ```bash
   npx tsx scripts/generate-audio.ts
   ```

3. **Start development server** (Runs Express server with Vite middleware on port 3000):
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Build & Production start**:
   ```bash
   npm run build
   npm run start
   ```

---

---

## Admin Studio Access

Admin access is open and direct. Navigate directly to `/#/admin` (or click "Admin Portal" from the home screen) to create, configure, upload media, trim audio, and manage surprises without needing any username or password.

---

## Manual Testing Checklist

| # | Flow / Feature | Verification Step |
|---|---|---|
| 1 | **Direct Admin Studio Access** | Navigate to `/#/admin`. Verify instant access to the Admin Studio dashboard without any username/password prompt. |
| 3 | **Create Surprise** | Click "Create New Surprise", enter recipient name and custom slug. Verify new surprise appears in list and editor opens. |
| 4 | **Audio Upload & Trimming** | In Editor Tab 2, upload an audio file. Drag start handle to 3s and end handle to 12s. Click "Preview Trimmed Segment". Verify audio plays only 3s–12s. Save and verify persistent storage in `data/db.json`. |
| 5 | **Photo Uploads & Reordering** | In Editor Tab 3, add 2 photos with custom captions. Click "Move Down" and verify order swaps. Verify images are stored in `/uploads/`. |
| 6 | **Page 1 Recipient** | Open `/#/s/for-priya/1`. Verify "This surprise is only for you ❤️" is centered. Verify music player card displays and plays audio. Click "Continue to Your Surprise ✨" to reach Page 2. |
| 7 | **Page 2 Recipient** | Verify photo and caption alternate on desktop split layout. Verify auto-advances. Verify Page 2 audio plays without restarting on slide changes. |
| 8 | **Page 3 Cake & Blowing** | Verify 3D cake is displayed. Test "Blow Out the Candles 🕯️" button (or click "Blow via Mic 🎙️" and blow). Verify flames shrink, smoke puffs rise, confetti showers, and "Your wish is waiting to come true ✨" appears. |
| 9 | **Page 4 Question & Letter** | Click "Haa.. ❤️" -> verify playful tease message appears without opening letter. Click "Naii.. 🙈" -> verify wax seal unseals, envelope opens, and heartfelt letter is displayed. |
| 10 | **Page 5 Grand Finale** | Verify bouquet illustration, large "HAPPY BIRTHDAY", recipient name, confetti burst, and "Replay Surprise" resets to Page 1. |
| 11 | **Public Access Isolation** | Set surprise status to "Draft". Open `/#/s/:slug/1` in incognito or unauthenticated tab. Verify 404 Private screen appears. Switch back to "Published" and verify link loads. |
