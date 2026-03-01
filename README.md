# 🎬 The Semantic Cinematographer

**The world's first real-time AI-directed video recording studio.**

Your camera is on. Your AI Director is watching. Every gesture, every word — directed in real time.

---

## Architecture

```
Frontend (Next.js 14)  ←WebRTC→  Stream Video  ←WebRTC→  Backend (Vision Agents)
        ↑                                                          ↑
   React UI + Framer Motion                         AI Director (Gemini/Groq/Ollama)
   Director's Log sidebar                           YOLO person detection
   CSS filter / zoom effects                        Deepgram STT + Pocket TTS
                                                    Optional: Decart AI restyling
```

## Quick Start

### 1. Clone & configure

```bash
git clone <repo>
cd the-semantic-cinematographer
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

### 2. Run with Docker Compose

```bash
docker-compose up
```

Then open: **http://localhost:3000**

### 3. Run locally (dev)

**Backend:**

```bash
cd backend
pip install uv
uv sync
uv run main.py serve --host 0.0.0.0 --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

| Variable            | Required       | Description                          |
| ------------------- | -------------- | ------------------------------------ |
| `STREAM_API_KEY`    | ✅             | Stream Video API key                 |
| `STREAM_API_SECRET` | ✅             | Stream Video API secret              |
| `LLM_PROVIDER`      | ✅             | `gemini` \| `groq` \| `ollama`       |
| `GEMINI_API_KEY`    | if gemini      | Google AI Studio key (free tier)     |
| `LLM_BASE_URL`      | if groq/ollama | OpenAI-compatible base URL           |
| `LLM_API_KEY`       | if groq/ollama | API key for provider                 |
| `LLM_MODEL`         | if groq/ollama | Model name                           |
| `DEEPGRAM_API_KEY`  | ✅             | Deepgram STT key (200hrs/month free) |
| `DECART_API_KEY`    | ⬜             | Enables Decart AI video restyling    |
| `FRONTEND_URL`      | ⬜             | Production frontend URL for CORS     |

---

## Features

- **🔍 Auto-Zoom** — AI zooms into your face at key moments
- **🎨 Live Filters** — cinematic, noir, dreamy, neon, and more
- **⚡ Screen Shake** — impact effects on emphatic gestures
- **💬 Caption Overlays** — AI subtitles your key insights in real time
- **🖼️ Decart AI Restyling** — full AI video style transfer (optional, requires API key)
- **📼 Cloud Recording** — Stream-hosted recordings with HLS playback

---

## LLM Provider Options

**Option A — Gemini (free tier):**

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key
```

**Option B — Groq (free, 6000 req/day):**

```env
LLM_PROVIDER=groq
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=your_groq_key
LLM_MODEL=llama-3.3-70b-versatile
```

**Option C — Ollama (local, tunnel via ngrok):**

```env
LLM_PROVIDER=ollama
LLM_BASE_URL=https://YOUR_ID.ngrok-free.app/v1
LLM_API_KEY=ollama
LLM_MODEL=llama3.2-vision
```

---

## Project Structure

```
├── backend/
│   ├── main.py              # Runner + /token JWT endpoint
│   ├── director_agent.py    # Agent factory + tool registrations
│   ├── instructions.md      # AI Director system prompt
│   └── pyproject.toml       # uv dependencies
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Landing page
│   │   ├── studio/page.tsx  # Recording studio
│   │   └── recordings/[id]/ # Playback & download
│   ├── components/studio/   # DirectorCanvas, DirectorLog, RecordingBar
│   ├── hooks/               # useDirectorEvents, useStreamCall
│   └── lib/                 # stream.ts, effects.ts
│
├── docker-compose.yml
└── README.md
```

---

_Built for WeMakeDevs Vision AI Hackathon 2025._
