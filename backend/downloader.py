import os
import yt_dlp
import asyncio
import glob
from job_manager import update_job
import tempfile
import imageio_ffmpeg

DOWNLOAD_DIR = os.path.join(tempfile.gettempdir(), "downloader_app_files")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def download_video(job_id: str, url: str, platform: str, quality: str):
    try:
        # Note: If a 'cookies.txt' file exists in the current directory, we can use it to bypass restrictions on FB/IG/Pinterest.
        # It should be placed in the backend root directory.
        
        format_str = 'bestvideo+bestaudio/best'
        if quality == '1080p':
            format_str = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
        elif quality == '720p':
            format_str = 'bestvideo[height<=720]+bestaudio/best[height<=720]/best'
        elif quality == '480p':
            format_str = 'bestvideo[height<=480]+bestaudio/best[height<=480]/best'
        elif quality == '360p':
            format_str = 'bestvideo[height<=360]+bestaudio/best[height<=360]/best'
        elif quality == 'audio':
            format_str = 'bestaudio/best'
        
        out_tmpl = os.path.join(DOWNLOAD_DIR, f"{job_id}_%(title)s.%(ext)s")

        def progress_hook(d):
            if d['status'] == 'downloading':
                p = d.get('_percent_str', '0%')
                # Clean up ANSI escape sequences if any
                p = p.replace('\\x1b[0;94m', '').replace('\\x1b[0m', '').strip()
                try:
                    perc = float(p.replace('%', ''))
                    update_job(job_id, status='downloading', progress=perc)
                except Exception:
                    pass
            elif d['status'] == 'finished':
                update_job(job_id, status='processing')
        
        ydl_opts = {
            'format': format_str,
            'outtmpl': out_tmpl,
            'progress_hooks': [progress_hook],
            'quiet': True,
            'no_warnings': True,
            'ffmpeg_location': imageio_ffmpeg.get_ffmpeg_exe(),
            'extractor_args': {'youtube': {'player_client': ['android', 'web']}}
        }

        if quality == 'audio':
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]

        if os.path.exists("cookies.txt"):
            print("SUCCESS: Found cookies.txt file! Applying to yt-dlp.")
            ydl_opts["cookiefile"] = "cookies.txt"
        else:
            print("WARNING: cookies.txt file NOT found in the current directory.")

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            if quality == 'audio':
                filename = os.path.splitext(filename)[0] + '.mp3'
            
            base_name = os.path.basename(filename)
            update_job(job_id, status='completed', progress=100, file_path=filename, filename=base_name)

    except Exception as e:
        update_job(job_id, status='error', error_msg=str(e))

async def run_download_task(job_id: str, url: str, platform: str, quality: str):
    # Run in threadpool so it doesn't block the event loop
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, download_video, job_id, url, platform, quality)
