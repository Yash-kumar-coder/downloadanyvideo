import uuid
import asyncio

# In-memory store for jobs
# Format: { "job_id": { "status": "downloading"|"completed"|"error", "progress": 0, "file_path": None, "error_msg": None, "filename": None } }
jobs = {}

def create_job():
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "starting",
        "progress": 0,
        "file_path": None,
        "error_msg": None,
        "filename": None,
        "queue": asyncio.Queue() # For SSE updates
    }
    return job_id

def get_job(job_id):
    return jobs.get(job_id)

def update_job(job_id, status=None, progress=None, file_path=None, error_msg=None, filename=None):
    job = jobs.get(job_id)
    if not job:
        return
    if status is not None:
        job["status"] = status
    if progress is not None:
        job["progress"] = progress
    if file_path is not None:
        job["file_path"] = file_path
    if error_msg is not None:
        job["error_msg"] = error_msg
    if filename is not None:
        job["filename"] = filename
    
    # Push update to queue
    try:
        job["queue"].put_nowait({
            "status": job["status"],
            "progress": job["progress"],
            "filename": job["filename"],
            "error_msg": job["error_msg"]
        })
    except Exception:
        pass
