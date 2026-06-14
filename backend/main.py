from fastapi import FastAPI, Request, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import os
from sse_starlette.sse import EventSourceResponse

from job_manager import create_job, get_job, jobs
from downloader import run_download_task

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DownloadRequest(BaseModel):
    url: str
    platform: str
    quality: str

@app.post("/api/jobs")
async def start_download_job(req: DownloadRequest, background_tasks: BackgroundTasks):
    job_id = create_job()
    background_tasks.add_task(run_download_task, job_id, req.url, req.platform, req.quality)
    return {"job_id": job_id}

@app.get("/api/progress/{job_id}")
async def get_progress(request: Request, job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        # Send initial status
        yield {
            "event": "update",
            "data": str({
                "status": job["status"],
                "progress": job["progress"]
            }).replace("'", '"')
        }
        
        while True:
            if await request.is_disconnected():
                break

            # Wait for updates from the queue
            try:
                update = await asyncio.wait_for(job["queue"].get(), timeout=1.0)
                yield {
                    "event": "update",
                    "data": str({
                        "status": update["status"],
                        "progress": update["progress"],
                        "filename": update.get("filename"),
                        "error_msg": update.get("error_msg")
                    }).replace("'", '"').replace('None', 'null')
                }
                if update["status"] in ["completed", "error"]:
                    break
            except asyncio.TimeoutError:
                # Keep alive
                yield {
                    "event": "ping",
                    "data": "{}"
                }

    return EventSourceResponse(event_generator())

@app.get("/api/files/{job_id}/{filename}")
async def download_file(job_id: str, filename: str):
    job = get_job(job_id)
    if not job or not job.get("file_path"):
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = job["file_path"]
    if os.path.exists(file_path):
        return FileResponse(path=file_path, filename=filename, media_type='application/octet-stream')
    raise HTTPException(status_code=404, detail="File not found on disk")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
