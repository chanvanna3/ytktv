# ytktv - YouTube AI Karaoke Studio 🎤

A production-ready web application centered around the **YouTube IFrame Player API**, **FastAPI**, and **Demucs AI**. It enables users to search for YouTube songs or paste any YouTube URL, automatically separates vocals from instrumentals using deep neural network stem separation on the backend, and plays the video inside a strictly muted YouTube IFrame synchronized with separated local audio tracks (Instrumental + Guide Vocals) with drift-free frame locking and real-time vocal toggle.

---

## 🌟 Key Architecture & Highlights

1. **Official YouTube IFrame Player API Engine:**
   - The YouTube player is dynamically initialized and permanently muted via `player.mute()` and `player.setVolume(0)` upon the `onReady` event.
   - The IFrame acts solely as the video/lyrics display.
   - Error handling handles error codes `101` and `150` ("Embedding disabled by owner") with informative visual feedback.

2. **Drift-Free Audio Synchronization Engine (`useAudioSync`):**
   - Direct event-driven locking on `YT.PlayerState.PLAYING`, `PAUSED`, and `BUFFERING`.
   - **Continuous Drift Heartbeat (every 500ms):** If playback drift between YouTube and HTML5 audio exceeds `0.15s` (150ms) due to scrubbing or buffering, the audio tracks instantly snap to `player.getCurrentTime()`.

3. **Demucs AI Audio Separation (`/api/process`):**
   - Utilizes `yt-dlp` to extract pristine audio streams.
   - Executes `demucs --two-stems=vocals` (`htdemucs` model) to split into `vocals.wav` and `no_vocals.wav`.
   - Built-in caching ensures identical song requests load instantaneously without re-processing.

4. **Real-Time Karaoke Performance Controls:**
   - **Lead Vocals Switch (ON / OFF):** Instant, non-blocking vocal mute toggle without interrupting music playback.
   - **Independent Volume Sliders:** Smooth blending of Backing Music and Guide Vocals.

---

## 📂 Project Directory Structure

```text
youtube-ai-karaoke/
├── backend/
│   ├── output/                  # Cached audio stems and metadata per videoId
│   │   └── <video_id>/
│   │       ├── vocals.wav       # Isolated vocal stem
│   │       ├── no_vocals.wav    # Isolated instrumental stem
│   │       └── meta.json        # Cached video title, duration, channel
│   ├── main.py                  # FastAPI server, yt-dlp, Demucs pipeline, search proxy
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Backend configuration
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── KaraokeControls.jsx   # Vocal switch button & dual volume sliders
│   │   │   ├── KaraokePlayer.jsx     # YouTube IFrame wrapper & sync badges
│   │   │   ├── ProcessingModal.jsx   # AI separation loading modal
│   │   │   └── SearchAndInput.jsx    # Direct URL parser & YouTube API search
│   │   ├── hooks/
│   │   │   ├── useAudioSync.js       # Drift correction heartbeat & dual audio engine
│   │   │   └── useYouTubePlayer.js   # Official YouTube IFrame API lifecycle & mute
│   │   ├── utils/
│   │   │   └── youtube.js            # Video ID regex parser & time formatters
│   │   ├── App.jsx                   # Main application layout & orchestrator
│   │   ├── index.css                 # Tailwind directives & glow effects
│   │   └── main.jsx                  # React DOM root
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env.example
└── README.md
```

---

## 🚀 Step-by-Step Setup and Run Instructions

### 1. Prerequisites
- **Python:** 3.10 or higher.
- **Node.js:** 18 or higher (with `npm`).
- **FFmpeg:** Must be installed and accessible in your system `PATH` (required by `yt-dlp` and `demucs` to decode and extract audio).
  - *Windows:* `winget install Gyan.FFmpeg` or `choco install ffmpeg`
  - *macOS:* `brew install ffmpeg`
  - *Linux:* `sudo apt install ffmpeg`

---

### 2. Backend Setup (FastAPI & Demucs)

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. (Recommended) Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
   > *Note:* If you have an NVIDIA GPU with CUDA, install PyTorch with CUDA support from [pytorch.org](https://pytorch.org/) for faster stem separation. Demucs also runs on CPU.

4. (Optional) Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   If you have a **YouTube Data API v3 key**, set:
   ```env
   YOUTUBE_API_KEY=AIzaSy...your_key_here
   DEMUCS_MODEL=htdemucs
   PORT=8000
   ```
   *(If `YOUTUBE_API_KEY` is omitted, the backend automatically uses `yt-dlp`'s embedded search engine as a zero-config fallback).*

5. Start the backend server:
   ```bash
   python main.py
   ```
   The backend will be live at `http://localhost:8000`. You can inspect the API documentation at `http://localhost:8000/docs`.

---

### 3. Frontend Setup (React + Vite + Tailwind)

1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```text
   http://localhost:5173
   ```

---

## 🎵 How to Use

1. **Choose a Song:**
   - **Direct URL Tab:** Paste any YouTube video URL (`https://www.youtube.com/watch?v=...`, `https://youtu.be/...`, or `https://www.youtube.com/shorts/...`).
   - **Search Tab:** Type any song title or artist. Click any video card from the search results.
2. **AI Stem Separation:**
   - On the first request for a video, the backend downloads the stream and runs Demucs AI to produce `vocals.wav` and `no_vocals.wav`.
   - Subsequent loads for the same video are instantaneous via the file cache.
3. **Sing Karaoke:**
   - Press play on the video or controls.
   - The YouTube IFrame video plays with original audio muted.
   - Toggle **VOCALS: ON / OFF** at any time to switch between original vocals and backing track.
   - Adjust the **Music** and **Guide Vocals** volume sliders independently.
