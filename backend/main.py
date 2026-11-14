import os
import sys
import json
import shutil
import asyncio
import logging
import re
import time
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import requests
import yt_dlp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("karaoke-backend")

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "").strip()
# htdemucs is the optimized high-speed high-accuracy model (95%+ vocal isolation)
DEMUCS_MODEL = os.getenv("DEMUCS_MODEL", "htdemucs").strip()

app = FastAPI(
    title="YouTube AI Karaoke API",
    description="High-Precision AI Stem Separation API with Real-Time Progress Tracking & Auto Vocal Removal",
    version="2.1.0"
)

# Enable CORS for frontend applications (Vite, Next.js, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media directory for streaming stems
app.mount("/media", StaticFiles(directory=str(OUTPUT_DIR)), name="media")

# Track active processing jobs and real-time progress
active_jobs: Dict[str, Dict[str, Any]] = {}
job_locks: Dict[str, asyncio.Lock] = {}


class ProcessRequest(BaseModel):
    video_id: str = Field(..., description="11-character YouTube video ID")
    force_reprocess: bool = Field(False, description="Force re-download and re-separation")
    language: Optional[str] = Field("km", description="Target language: km (Cambodia/Khmer), en, auto")


def validate_video_id(video_id: str) -> bool:
    """Validates standard 11-character YouTube video ID format."""
    return bool(re.match(r"^[a-zA-Z0-9_-]{11}$", video_id))


def get_video_dir(video_id: str) -> Path:
    return OUTPUT_DIR / video_id


def stems_exist(video_id: str) -> bool:
    """Checks if separated stems already exist in cache."""
    video_dir = get_video_dir(video_id)
    vocals_file = video_dir / "vocals.wav"
    no_vocals_file = video_dir / "no_vocals.wav"
    return (
        vocals_file.is_file()
        and no_vocals_file.is_file()
        and vocals_file.stat().st_size > 1000
        and no_vocals_file.stat().st_size > 1000
    )


def lyrics_exist(video_id: str) -> bool:
    """Checks if synchronized lyrics exist on disk."""
    video_dir = get_video_dir(video_id)
    lyrics_file = video_dir / "lyrics.json"
    if lyrics_file.is_file() and lyrics_file.stat().st_size > 100:
        try:
            with open(lyrics_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return bool(data.get("status") == "success" and data.get("lyrics"))
        except Exception:
            return False
    return False


def read_metadata(video_id: str) -> Dict[str, Any]:
    meta_path = get_video_dir(video_id) / "meta.json"
    if meta_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"title": f"YouTube Video ({video_id})", "duration": 0}


def save_metadata(video_id: str, data: Dict[str, Any]):
    meta_path = get_video_dir(video_id) / "meta.json"
    try:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Could not save metadata for {video_id}: {e}")


def download_audio(video_id: str, target_dir: Path) -> Path:
    """Downloads audio from YouTube as a WAV file using resilient multi-client strategies to bypass datacenter IP bot detection."""
    target_dir.mkdir(parents=True, exist_ok=True)
    out_template = str(target_dir / "audio.%(ext)s")
    url = f"https://www.youtube.com/watch?v={video_id}"

    # Multi-client strategy: Android, Android Embedded, TV Embedded, and Web (with Node.js JS solver)
    strategies = [
        # Strategy 1: Android InnerTube (bypasses bot challenge and format 18 SABR experiment)
        {
            'name': 'Android InnerTube',
            'format': 'ba/b/best',
            'extractor_args': {
                'youtube': {
                    'player_client': ['android'],
                }
            },
        },
        # Strategy 2: Android Embedded (extracts direct format 251 Opus)
        {
            'name': 'Android Embedded',
            'format': 'ba/b/best',
            'extractor_args': {
                'youtube': {
                    'player_client': ['android_embedded'],
                }
            },
        },
        # Strategy 3: TV Embedded (extracts direct format 251 Opus)
        {
            'name': 'TV Embedded',
            'format': 'ba/b/best',
            'extractor_args': {
                'youtube': {
                    'player_client': ['tv_embedded'],
                }
            },
        },
        # Strategy 4: Web with JS Challenge Solver
        {
            'name': 'Web with JS Solver',
            'format': 'ba/b/best',
            'extractor_args': {
                'youtube': {
                    'player_client': ['web'],
                }
            },
        },
    ]

    last_error = None
    for strat in strategies:
        ydl_opts = {
            'format': strat['format'],
            'outtmpl': out_template,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'extractor_args': strat.get('extractor_args', {}),
        }

        # Optional: If YOUTUBE_COOKIES env or cookies.txt exists, pass to yt-dlp
        cookies_env = os.getenv("YOUTUBE_COOKIES")
        cookies_path = BASE_DIR / "cookies.txt"
        if cookies_env and not cookies_path.is_file():
            try:
                with open(cookies_path, "w", encoding="utf-8") as f:
                    f.write(cookies_env.strip())
            except Exception as e:
                logger.warning(f"Failed to write YOUTUBE_COOKIES env to file: {e}")

        if cookies_path.is_file() and cookies_path.stat().st_size > 10:
            ydl_opts['cookiefile'] = str(cookies_path)

        try:
            logger.info(f"Downloading audio for {video_id} using {strat['name']}...")
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                meta = {
                    "title": info.get("title", f"Video {video_id}"),
                    "channel": info.get("uploader", "Unknown"),
                    "duration": info.get("duration", 0),
                    "thumbnail": info.get("thumbnail", ""),
                    "video_id": video_id
                }
                save_metadata(video_id, meta)
                break
        except Exception as e:
            logger.warning(f"Download strategy {strat['name']} failed: {e}")
            last_error = e
    else:
        raise Exception(f"Failed to fetch YouTube audio: {str(last_error)}")

    wav_file = target_dir / "audio.wav"
    if not wav_file.exists():
        wavs = list(target_dir.glob("*.wav"))
        if wavs:
            wav_file = wavs[0]
        else:
            raise Exception("Audio extraction did not produce a WAV file.")

    return wav_file


def run_demucs_separation_sync(video_id: str, audio_path: Path, output_dir: Path):
    """
    Executes Demucs model with continuous stream consumption to prevent pipe buffer
    deadlocks, updating active job progress in real time.
    """
    import subprocess

    temp_demucs_dir = output_dir / "demucs_temp"
    temp_demucs_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable,
        "-u",
        "-m",
        "demucs.separate",
        "-n",
        DEMUCS_MODEL,
        "-d",
        "cpu",
        "-j",
        "4",
        "--two-stems=vocals",
        "-o",
        str(temp_demucs_dir),
        str(audio_path)
    ]

    logger.info(f"Starting Demucs AI ({DEMUCS_MODEL}) on {audio_path.name}...")
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )

    # Continuously drain stdout/stderr lines so pipe buffer never deadlocks!
    last_pct = 40
    for raw_line in proc.stdout:
        line = raw_line.strip()
        if not line:
            continue
        # Extract Demucs percentage from tqdm line
        m = re.search(r'(\d+)%', line)
        if m:
            demucs_pct = int(m.group(1))
            # Map 0-100% of Demucs to overall 35% -> 94%
            overall_pct = 35 + int(demucs_pct * 0.59)
            if overall_pct > last_pct:
                last_pct = overall_pct
                if video_id in active_jobs:
                    active_jobs[video_id]["progress"] = overall_pct
                    active_jobs[video_id]["stage"] = "separating"
                    active_jobs[video_id]["message"] = f"AI កំពុងកាត់សំឡេងច្រៀងចេញ ({overall_pct}%)..."

    proc.wait()

    if proc.returncode != 0:
        logger.error(f"Demucs failed with exit code {proc.returncode}")
        raise Exception(f"Demucs AI separation failed with exit code {proc.returncode}")

    if video_id in active_jobs:
        active_jobs[video_id]["progress"] = 96
        active_jobs[video_id]["message"] = "កំពុងរៀបចំ និងរក្សាទុកឯកសារភ្លេងខារ៉ាអូខេ..."

    # Locate generated stems dynamically
    found_vocals = list(temp_demucs_dir.rglob("vocals.wav")) or list(Path("separated").rglob("vocals.wav"))
    found_no_vocals = list(temp_demucs_dir.rglob("no_vocals.wav")) or list(Path("separated").rglob("no_vocals.wav"))

    if not found_vocals:
        found_vocals = [p for p in temp_demucs_dir.rglob("*.wav") if "vocal" in p.name.lower() and "no" not in p.name.lower()]
    if not found_no_vocals:
        found_no_vocals = [p for p in temp_demucs_dir.rglob("*.wav") if "no_vocal" in p.name.lower() or "instrumental" in p.name.lower()]

    if not found_vocals or not found_no_vocals:
        raise Exception("Separated stems (vocals/no_vocals) not found in Demucs output.")

    src_vocals = found_vocals[0]
    src_no_vocals = found_no_vocals[0]

    if src_vocals.stat().st_size < 1000:
        raise Exception(f"Demucs generated invalid/empty vocals stem: {src_vocals}")
    if src_no_vocals.stat().st_size < 1000:
        raise Exception(f"Demucs generated invalid/empty no_vocals stem: {src_no_vocals}")

    target_vocals = output_dir / "vocals.wav"
    target_no_vocals = output_dir / "no_vocals.wav"

    # CRITICAL: Verify instrumental is NOT original audio
    if src_no_vocals.resolve() == audio_path.resolve():
        raise Exception("Demucs error: Instrumental source is identical to original audio!")

    # Safely copy to target destinations
    if target_vocals.exists():
        try: target_vocals.unlink()
        except Exception: pass
    if target_no_vocals.exists():
        try: target_no_vocals.unlink()
        except Exception: pass

    shutil.copy2(str(src_vocals), str(target_vocals))
    shutil.copy2(str(src_no_vocals), str(target_no_vocals))

    # Verify both final files exist and are > 1000 bytes
    if not target_vocals.is_file() or target_vocals.stat().st_size < 1000:
        raise Exception("Target vocals.wav was not written successfully.")
    if not target_no_vocals.is_file() or target_no_vocals.stat().st_size < 1000:
        raise Exception("Target no_vocals.wav was not written successfully.")

    # Clean up temporary demucs folder to conserve disk space
    try:
        shutil.rmtree(str(temp_demucs_dir), ignore_errors=True)
    except Exception as e:
        logger.warning(f"Cleanup warning: {e}")


async def run_pipeline(video_id: str, force: bool = False, lang: Optional[str] = "km"):
    """Orchestrates download, Demucs vocal separation, and synchronized lyrics transcription."""
    if video_id not in job_locks:
        job_locks[video_id] = asyncio.Lock()

    async with job_locks[video_id]:
        video_dir = get_video_dir(video_id)

        # Check if already cached (stems exist on disk)
        if not force and stems_exist(video_id):
            meta = read_metadata(video_id)
            has_lyrics = lyrics_exist(video_id)
            if not has_lyrics:
                active_jobs[video_id] = {
                    "status": "completed",
                    "stage": "ready_to_sing",
                    "progress": 95,
                    "message": "Vocal cut completed! Ready to sing / download instrumental.",
                    "video_id": video_id,
                    "title": meta.get("title", f"YouTube Video ({video_id})"),
                    "vocals_url": f"/media/{video_id}/vocals.wav",
                    "instrumental_url": f"/media/{video_id}/no_vocals.wav",
                    "direct_audio_url": f"/media/{video_id}/audio.wav" if (video_dir / "audio.wav").exists() else None,
                    "lyrics_ready": False,
                    "cached": True
                }
                try:
                    await asyncio.to_thread(fetch_lyrics_for_video, video_id, False, lang)
                except Exception as e:
                    logger.warning(f"Lyrics transcribe notice: {e}")

            active_jobs[video_id] = {
                "status": "completed",
                "stage": "completed" if lyrics_exist(video_id) else "ready_to_sing",
                "progress": 100,
                "message": "Vocal cut completed! Ready to sing / download instrumental.",
                "video_id": video_id,
                "title": meta.get("title", f"YouTube Video ({video_id})"),
                "vocals_url": f"/media/{video_id}/vocals.wav",
                "instrumental_url": f"/media/{video_id}/no_vocals.wav",
                "direct_audio_url": f"/media/{video_id}/audio.wav" if (video_dir / "audio.wav").exists() else None,
                "lyrics_ready": lyrics_exist(video_id),
                "cached": True
            }
            return

        try:
            # Stage 1: Downloading
            active_jobs[video_id] = {
                "status": "processing",
                "stage": "downloading",
                "progress": 15,
                "message": "Downloading audio...",
                "video_id": video_id
            }

            wav_path = await asyncio.to_thread(download_audio, video_id, video_dir)

            active_jobs[video_id]["progress"] = 35
            active_jobs[video_id]["direct_audio_url"] = f"/media/{video_id}/audio.wav"
            active_jobs[video_id]["message"] = "Separating vocals with AI..."

            # Stage 2: Separating with Demucs AI
            active_jobs[video_id]["stage"] = "separating"
            active_jobs[video_id]["progress"] = 40
            active_jobs[video_id]["message"] = "Separating vocals with AI..."

            await asyncio.to_thread(run_demucs_separation_sync, video_id, wav_path, video_dir)

            # Stage 3: Vocal cut completed! Immediate availability of instrumental & vocals
            meta = read_metadata(video_id)
            active_jobs[video_id]["status"] = "completed"
            active_jobs[video_id]["stage"] = "ready_to_sing"
            active_jobs[video_id]["progress"] = 95
            active_jobs[video_id]["message"] = "Vocal cut completed! Ready to sing / download instrumental."
            active_jobs[video_id]["title"] = meta.get("title", f"YouTube Video ({video_id})")
            active_jobs[video_id]["vocals_url"] = f"/media/{video_id}/vocals.wav"
            active_jobs[video_id]["instrumental_url"] = f"/media/{video_id}/no_vocals.wav"
            active_jobs[video_id]["direct_audio_url"] = f"/media/{video_id}/audio.wav"
            active_jobs[video_id]["lyrics_ready"] = lyrics_exist(video_id)

            # Stage 4: Transcribing Lyrics in background (does not block playback or download)
            try:
                await asyncio.to_thread(fetch_lyrics_for_video, video_id, False, lang)
            except Exception as lyr_err:
                logger.warning(f"Background lyrics transcription notice for {video_id}: {lyr_err}")

            active_jobs[video_id]["progress"] = 100
            active_jobs[video_id]["stage"] = "completed"
            active_jobs[video_id]["lyrics_ready"] = lyrics_exist(video_id)
            logger.info(f"Video {video_id} processing completed successfully.")

        except Exception as e:
            logger.error(f"Separation failed for {video_id}: {e}", exc_info=True)
            active_jobs[video_id] = {
                "status": "error",
                "stage": "error",
                "progress": 0,
                "message": f"ដំណើរការបរាជ័យ: {str(e)}",
                "error": str(e),
                "video_id": video_id
            }


HISTORY_FILE = OUTPUT_DIR / "history.json"

DEFAULT_TRENDING = [
    {"id": "cI8m3kYmR4I", "label": "HENA - ដោះលែង", "tag": "HENA - ដោះលែង", "icon": "flame", "color": "pink"},
    {"id": "n8_n8A2L4hQ", "label": "ចឺម - មុនបងមានប្រពន្ធ", "tag": "មុនបងមានប្រពន្ធ អូននៅឯណា ចឺម", "icon": "mic", "color": "purple"},
    {"id": "dQw4w9WgXcQ", "label": "Tena - បងក្រ", "tag": "Tena - បងក្រ", "icon": "sparkles", "color": "blue"},
    {"id": "kJQP7kiw5Fk", "label": "បទឆ្លងឆ្លើយ Karaoke", "tag": "បទឆ្លងឆ្លើយ Karaoke", "icon": "music", "color": "violet"},
    {"id": "yKNxeF4KMsY", "label": "Coldplay - Yellow", "tag": "Coldplay Yellow", "icon": "sparkles", "color": "fuchsia"},
]

def load_history_data() -> List[Dict[str, Any]]:
    if HISTORY_FILE.is_file():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception as e:
            logger.warning(f"Error reading history.json: {e}")
    return []

def save_history_data(data: List[Dict[str, Any]]):
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Error writing history.json: {e}")

def record_song_sung(video_id: str, title: Optional[str] = None):
    if not video_id:
        return
    history = load_history_data()
    clean_title = (title or "").strip()
    if not clean_title or clean_title.startswith("YouTube Video ("):
        meta = read_metadata(video_id)
        if meta.get("title") and not meta.get("title", "").startswith("YouTube Video ("):
            clean_title = meta.get("title")
    if not clean_title:
        clean_title = f"YouTube Video ({video_id})"

    found = False
    for item in history:
        if item.get("id") == video_id:
            item["count"] = item.get("count", 1) + 1
            item["timestamp"] = int(time.time())
            if clean_title and not clean_title.startswith("YouTube Video ("):
                item["title"] = clean_title
            found = True
            break

    if not found:
        history.insert(0, {
            "id": video_id,
            "title": clean_title,
            "count": 1,
            "timestamp": int(time.time())
        })

    # Keep top 60 items
    history = history[:60]
    save_history_data(history)


class HistoryItemRequest(BaseModel):
    video_id: str
    title: Optional[str] = None


@app.get("/")
async def root():
    return {
        "app": "YouTube AI Karaoke Studio API",
        "status": "online",
        "version": "2.1.0",
        "demucs_model": DEMUCS_MODEL,
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "demucs_model": DEMUCS_MODEL,
        "youtube_api_configured": bool(YOUTUBE_API_KEY)
    }


@app.get("/api/history")
async def get_history_and_trending():
    """
    Returns server-synced history & trending songs for all browsers and devices.
    """
    history = await asyncio.to_thread(load_history_data)
    recent = sorted(history, key=lambda x: x.get("timestamp", 0), reverse=True)
    trending = sorted(history, key=lambda x: x.get("count", 1), reverse=True)
    return {
        "status": "success",
        "history": recent[:15],
        "trending": trending[:10],
        "default_trending": DEFAULT_TRENDING
    }


@app.post("/api/history")
async def add_history_item(req: HistoryItemRequest):
    """
    Called when a song is sung in any browser.
    Immediately updates the server list so other browsers see it.
    """
    await asyncio.to_thread(record_song_sung, req.video_id, req.title)
    return await get_history_and_trending()


@app.delete("/api/history/{video_id}")
async def remove_history_item(video_id: str):
    history = await asyncio.to_thread(load_history_data)
    history = [h for h in history if h.get("id") != video_id]
    await asyncio.to_thread(save_history_data, history)
    return {"status": "success", "video_id": video_id}


@app.delete("/api/history")
async def clear_all_history():
    await asyncio.to_thread(save_history_data, [])
    return {"status": "success", "history": []}


@app.post("/api/process")
async def process_video(req: ProcessRequest, background_tasks: BackgroundTasks):
    """
    Submits a video for high-precision separation and lyrics transcription.
    Returns immediately so client can poll /api/status/{video_id}.
    """
    video_id = req.video_id.strip()
    if not validate_video_id(video_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube video ID format. Must be an 11-character string."
        )

    # Record song sung to server history for multi-browser sync
    record_song_sung(video_id)

    # 1. If already cached (BOTH stems exist), return completed immediately
    if not req.force_reprocess and stems_exist(video_id):
        meta = read_metadata(video_id)
        video_dir = get_video_dir(video_id)
        has_lyrics = lyrics_exist(video_id)
        if not has_lyrics:
            background_tasks.add_task(fetch_lyrics_for_video, video_id, False, req.language or "km")
        return {
            "status": "completed",
            "stage": "completed" if has_lyrics else "ready_to_sing",
            "progress": 100 if has_lyrics else 95,
            "message": "Vocal cut completed! Ready to sing / download instrumental.",
            "video_id": video_id,
            "title": meta.get("title", f"YouTube Video ({video_id})"),
            "vocals_url": f"/media/{video_id}/vocals.wav",
            "instrumental_url": f"/media/{video_id}/no_vocals.wav",
            "direct_audio_url": f"/media/{video_id}/audio.wav" if (video_dir / "audio.wav").exists() else None,
            "lyrics_ready": has_lyrics,
            "cached": True
        }

    # 2. If already processing, return current job state
    current_job = active_jobs.get(video_id)
    if current_job and current_job.get("status") in ["processing", "completed"]:
        return current_job

    # 3. Initialize job and dispatch background processing
    initial_stage = "transcribing" if stems_exist(video_id) else "downloading"
    initial_progress = 95 if stems_exist(video_id) else 10
    initial_msg = "Vocal cut completed! Ready to sing / download instrumental." if stems_exist(video_id) else "Downloading audio..."

    active_jobs[video_id] = {
        "status": "completed" if stems_exist(video_id) else "processing",
        "stage": initial_stage,
        "progress": initial_progress,
        "message": initial_msg,
        "video_id": video_id
    }
    if stems_exist(video_id):
        active_jobs[video_id]["vocals_url"] = f"/media/{video_id}/vocals.wav"
        active_jobs[video_id]["instrumental_url"] = f"/media/{video_id}/no_vocals.wav"

    background_tasks.add_task(run_pipeline, video_id, req.force_reprocess, req.language or "km")
    return active_jobs[video_id]


@app.get("/api/status/{video_id}")
async def get_status(video_id: str):
    """Checks the real-time status of an ongoing or completed processing job."""
    if not validate_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    # 1. If stems exist on disk, always return completed with separate actual stem URLs!
    if stems_exist(video_id):
        meta = read_metadata(video_id)
        video_dir = get_video_dir(video_id)
        has_lyrics = lyrics_exist(video_id)
        return {
            "status": "completed",
            "stage": "completed" if has_lyrics else "ready_to_sing",
            "progress": 100 if has_lyrics else 95,
            "message": "Vocal cut completed! Ready to sing / download instrumental.",
            "video_id": video_id,
            "title": meta.get("title", ""),
            "vocals_url": f"/media/{video_id}/vocals.wav",
            "instrumental_url": f"/media/{video_id}/no_vocals.wav",
            "direct_audio_url": f"/media/{video_id}/audio.wav" if (video_dir / "audio.wav").exists() else None,
            "lyrics_ready": has_lyrics,
            "cached": True
        }

    # 2. If currently active job in memory
    job = active_jobs.get(video_id)
    if job:
        video_dir = get_video_dir(video_id)
        if (video_dir / "audio.wav").exists():
            job["direct_audio_url"] = f"/media/{video_id}/audio.wav"
        if (video_dir / "no_vocals.wav").exists() and (video_dir / "no_vocals.wav").stat().st_size > 1000:
            job["instrumental_url"] = f"/media/{video_id}/no_vocals.wav"
            job["vocals_url"] = f"/media/{video_id}/vocals.wav"
            job["status"] = "completed"
        return job

    # 3. Idle / not started
    return {
        "status": "idle",
        "stage": "idle",
        "progress": 0,
        "message": "មិនទាន់ចាប់ផ្តើមដំណើរការនៅឡើយ"
    }


@app.get("/api/download/{video_id}/instrumental")
async def download_instrumental(video_id: str):
    """Downloads pure separated instrumental track (no_vocals.wav) with vocal removed."""
    if not validate_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    video_dir = get_video_dir(video_id)
    no_vocals_path = video_dir / "no_vocals.wav"
    if not no_vocals_path.is_file() or no_vocals_path.stat().st_size < 1000:
        raise HTTPException(status_code=404, detail="Instrumental track (no_vocals.wav) not ready or not found.")
    meta = read_metadata(video_id)
    raw_title = meta.get("title") or video_id
    safe_title = re.sub(r'[\\/*?:"<>|]', "", raw_title).strip() or video_id
    return FileResponse(
        path=str(no_vocals_path),
        media_type="audio/wav",
        filename=f"{safe_title}_instrumental.wav"
    )


@app.get("/api/download/{video_id}/vocals")
async def download_vocals(video_id: str):
    """Downloads pure isolated vocal track (vocals.wav)."""
    if not validate_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    video_dir = get_video_dir(video_id)
    vocals_path = video_dir / "vocals.wav"
    if not vocals_path.is_file() or vocals_path.stat().st_size < 1000:
        raise HTTPException(status_code=404, detail="Vocals track (vocals.wav) not ready or not found.")
    meta = read_metadata(video_id)
    raw_title = meta.get("title") or video_id
    safe_title = re.sub(r'[\\/*?:"<>|]', "", raw_title).strip() or video_id
    return FileResponse(
        path=str(vocals_path),
        media_type="audio/wav",
        filename=f"{safe_title}_vocals.wav"
    )


@app.get("/api/download/{video_id}/original")
async def download_original(video_id: str):
    """Downloads original unseparated audio track (audio.wav)."""
    if not validate_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    video_dir = get_video_dir(video_id)
    audio_path = video_dir / "audio.wav"
    if not audio_path.is_file() or audio_path.stat().st_size < 1000:
        raise HTTPException(status_code=404, detail="Original audio track (audio.wav) not ready or not found.")
    meta = read_metadata(video_id)
    raw_title = meta.get("title") or video_id
    safe_title = re.sub(r'[\\/*?:"<>|]', "", raw_title).strip() or video_id
    return FileResponse(
        path=str(audio_path),
        media_type="audio/wav",
        filename=f"{safe_title}_original.wav"
    )


@app.get("/api/search")
async def search_youtube(q: str = Query(..., min_length=1, description="Search query")):
    """Searches YouTube for music videos."""
    query = q.strip()
    if not query:
        return {"items": []}

    # 1. YouTube Data API v3 (Strictly embeddable)
    if YOUTUBE_API_KEY:
        try:
            url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                "part": "snippet",
                "maxResults": 12,
                "q": query,
                "type": "video",
                "videoEmbeddable": "true",
                "key": YOUTUBE_API_KEY
            }
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                items = []
                for item in data.get("items", []):
                    vid = item.get("id", {}).get("videoId")
                    snippet = item.get("snippet", {})
                    if vid:
                        items.append({
                            "videoId": vid,
                            "title": snippet.get("title", ""),
                            "channelTitle": snippet.get("channelTitle", ""),
                            "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url") or snippet.get("thumbnails", {}).get("default", {}).get("url", "")
                        })
                return {"items": items, "source": "youtube_data_api"}
            else:
                logger.warning(f"YouTube Data API error: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"YouTube Data API search failed: {e}")

    # 2. Fallback: yt-dlp search
    logger.info(f"Using yt-dlp search fallback for query: {query}")
    try:
        def yt_search():
            ydl_opts = {
                'quiet': True,
                'extract_flat': True,
                'no_warnings': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(f"ytsearch10:{query}", download=False)

        info = await asyncio.to_thread(yt_search)
        items = []
        for entry in info.get("entries", []):
            if entry and entry.get("id"):
                items.append({
                    "videoId": entry.get("id"),
                    "title": entry.get("title", ""),
                    "channelTitle": entry.get("uploader", entry.get("channel", "YouTube")),
                    "thumbnail": entry.get("thumbnails", [{}])[-1].get("url") if entry.get("thumbnails") else f"https://i.ytimg.com/vi/{entry.get('id')}/hqdefault.jpg"
                })
        return {"items": items, "source": "yt_dlp_fallback"}
    except Exception as e:
        logger.error(f"Search fallback failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        logger.info("Loading Whisper 'base' model into memory...")
        _whisper_model = whisper.load_model("base")
        logger.info("Whisper 'base' model loaded successfully.")
    return _whisper_model


def fetch_lyrics_for_video(video_id: str, force_whisper: bool = False, force_lang: Optional[str] = "km") -> Dict[str, Any]:
    """
    Extracts synchronized timestamped lyrics for a song:
    1. YouTube captions / timedtext json3 format (with millisecond sync)
    2. Whisper AI transcription on isolated vocals stem (vocals.wav) or audio.wav using Whisper 'base' model
    """
    video_dir = get_video_dir(video_id)
    lyrics_file = video_dir / "lyrics.json"
    meta = read_metadata(video_id)
    title = meta.get("title", "")
    channel = meta.get("channel", "")

    # Language resolution: Detect if song is Khmer or International
    req_lang = (force_lang or "auto").lower().strip()
    corpus = f"{title} {channel}".lower()
    has_khmer_text = bool(re.search(r'[\u1780-\u17FF]', corpus)) or any(
        kw in corpus for kw in ("khmer", "cambodia", "manith", "tena", "jerm", "vannda", "rhm", "sunday", "town", "hang meas", "pleng")
    )
    if req_lang in ("km", "khmer", "cambodia") or (req_lang in ("auto", "") and has_khmer_text):
        is_khmer = True
        target_lang = "km"
    elif req_lang in ("en", "english"):
        is_khmer = False
        target_lang = "en"
    elif req_lang == "auto":
        is_khmer = False
        target_lang = None
    else:
        is_khmer = has_khmer_text
        target_lang = "km" if is_khmer else None

    # 1. Return cached lyrics if exists and not forcing re-transcribe
    if not force_whisper and lyrics_file.exists():
        try:
            with open(lyrics_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("status") == "success" and data.get("lyrics"):
                    return data
        except Exception:
            pass

    segments = []
    source = "none"

    # Strategy 1: YouTube subtitles via yt-dlp (Only if not force_whisper)
    if not force_whisper:
        try:
            ydl_opts = {'skip_download': True, 'quiet': True, 'no_warnings': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
                subs = info.get("subtitles", {}) or {}
                auto_subs = info.get("automatic_captions", {}) or {}

                # Pick matching language
                chosen_track = None
                if target_lang == "km":
                    chosen_track = subs.get("km") or auto_subs.get("km")
                elif target_lang == "en":
                    chosen_track = subs.get("en") or auto_subs.get("en")
                else:
                    chosen_track = subs.get("km") or auto_subs.get("km") or subs.get("en") or auto_subs.get("en")

                # Fallback to ANY available subtitles if preferred language not found
                if not chosen_track:
                    chosen_track = (
                        subs.get("km") or auto_subs.get("km") or
                        subs.get("en") or auto_subs.get("en") or
                        (list(subs.values())[0] if subs else None) or
                        (list(auto_subs.values())[0] if auto_subs else None)
                    )

                if chosen_track:
                    json3_format = next((fmt for fmt in chosen_track if fmt.get("ext") == "json3"), None)
                    if json3_format and json3_format.get("url"):
                        resp = requests.get(json3_format["url"], timeout=8)
                        if resp.status_code == 200:
                            cap_data = resp.json()
                            raw_events = cap_data.get("events", [])
                            idx = 0
                            for ev in raw_events:
                                if "segs" in ev and ev.get("tStartMs") is not None:
                                    text = "".join(s.get("utf8", "") for s in ev.get("segs", [])).strip()
                                    text = re.sub(r'[\r\n]+', ' ', text).strip()
                                    if text and text != '\n':
                                        t_start = ev.get("tStartMs", 0) / 1000.0
                                        d_dur = ev.get("dDurationMs", 2500) / 1000.0
                                        t_end = t_start + d_dur

                                        if segments and segments[-1]["text"] == text:
                                             segments[-1]["end"] = max(segments[-1]["end"], round(t_end, 2))
                                             continue

                                        segments.append({
                                            "id": idx,
                                            "start": round(t_start, 2),
                                            "end": round(t_end, 2),
                                            "text": text
                                        })
                                        idx += 1
                            if segments:
                                segments.sort(key=lambda s: s["start"])
                                for i, s in enumerate(segments):
                                    s["id"] = i
                                source = "youtube_captions"
        except Exception as e:
            logger.warning(f"YouTube captions fetch error for {video_id}: {e}")

    # Strategy 2: AI Whisper Base Transcription on vocals stem or audio.wav
    if not segments:
        try:
            vocals_path = video_dir / "vocals.wav"
            audio_path = video_dir / "audio.wav"

            # If audio has not been downloaded yet, download it immediately
            if not vocals_path.exists() and not audio_path.exists():
                logger.info(f"Downloading audio for Whisper AI transcription ({video_id})...")
                audio_path = download_audio(video_id, video_dir)

            target_audio = vocals_path if vocals_path.exists() else (audio_path if audio_path.exists() else None)

            if target_audio and target_audio.exists():
                logger.info(f"Transcribing {target_audio.name} using Whisper Base AI for {video_id} (is_khmer={is_khmer}, target_lang={target_lang})...")
                model = get_whisper_model()

                transcribe_kwargs = {"fp16": False}
                if target_lang:
                    transcribe_kwargs["language"] = target_lang
                if is_khmer:
                    transcribe_kwargs["initial_prompt"] = "ទំនុកច្រៀងចម្រៀងខ្មែរ ភាសាខ្មែរ អក្សរខ្មែរ Cambodia Khmer song lyrics"

                res = model.transcribe(str(target_audio), **transcribe_kwargs)
                raw_segs = res.get("segments", [])
                for idx, s in enumerate(raw_segs):
                    t = s.get("text", "").strip()
                    if t:
                        segments.append({
                            "id": idx,
                            "start": round(s.get("start", 0.0), 2),
                            "end": round(s.get("end", 0.0), 2),
                            "text": t
                        })
                if segments:
                    source = "whisper_ai"
        except Exception as e:
            logger.warning(f"Whisper transcription warning for {video_id}: {e}")

    result_payload = {
        "status": "success" if segments else "not_found",
        "video_id": video_id,
        "source": source,
        "lyrics": segments
    }

    if segments:
        try:
            with open(lyrics_file, "w", encoding="utf-8") as f:
                json.dump(result_payload, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    return result_payload


class SaveLyricsRequest(BaseModel):
    lyrics: Optional[list] = None
    raw_text: Optional[str] = None
    force_whisper: Optional[bool] = False
    language: Optional[str] = "km"


@app.get("/api/lyrics/{video_id}")
async def get_lyrics(video_id: str, force_whisper: bool = False, lang: Optional[str] = "auto"):
    """Returns timestamped synchronized lyrics for karaoke singing."""
    if not validate_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    return await asyncio.to_thread(fetch_lyrics_for_video, video_id, force_whisper, lang or "auto")


@app.post("/api/lyrics/{video_id}")
async def save_or_edit_lyrics(video_id: str, req: SaveLyricsRequest):
    """Allows user to paste or edit lyrics directly for a song, or trigger transcription."""
    if not validate_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    video_dir = get_video_dir(video_id)
    lyrics_file = video_dir / "lyrics.json"
    meta = read_metadata(video_id)
    duration = meta.get("duration", 240) or 240

    # Case A: Re-transcribe with Whisper or language switch request
    if req.force_whisper or (not req.lyrics and not req.raw_text):
        return await asyncio.to_thread(fetch_lyrics_for_video, video_id, bool(req.force_whisper), req.language or "auto")

    # Case B: User submitted structured lyrics array
    if req.lyrics and isinstance(req.lyrics, list) and len(req.lyrics) > 0:
        result_payload = {
            "status": "success",
            "video_id": video_id,
            "source": "user_edited",
            "lyrics": req.lyrics
        }
        with open(lyrics_file, "w", encoding="utf-8") as f:
            json.dump(result_payload, f, ensure_ascii=False, indent=2)
        return result_payload

    # Case C: User pasted plain text lyrics (splits lines and auto-aligns across song duration)
    if req.raw_text:
        lines = [line.strip() for line in req.raw_text.splitlines() if line.strip()]
        if not lines:
            raise HTTPException(status_code=400, detail="No lyrics text provided.")

        start_offset = 20.0 # Intro gap
        usable_duration = max(30.0, float(duration) - start_offset - 15.0)
        line_duration = usable_duration / len(lines)

        segments = []
        for i, text in enumerate(lines):
            t_start = start_offset + (i * line_duration)
            t_end = t_start + line_duration
            segments.append({
                "id": i,
                "start": round(t_start, 2),
                "end": round(t_end, 2),
                "text": text
            })

        result_payload = {
            "status": "success",
            "video_id": video_id,
            "source": "user_pasted",
            "lyrics": segments
        }
        with open(lyrics_file, "w", encoding="utf-8") as f:
            json.dump(result_payload, f, ensure_ascii=False, indent=2)
        return result_payload

    raise HTTPException(status_code=400, detail="Must provide either 'lyrics' or 'raw_text'")


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
