import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export const startDownloadJob = async (url, platform, quality) => {
  const response = await axios.post(`${API_BASE_URL}/jobs`, {
    url,
    platform,
    quality
  });
  return response.data.job_id;
};

export const createProgressEventSource = (jobId) => {
  return new EventSource(`${API_BASE_URL}/progress/${jobId}`);
};

export const getDownloadUrl = (jobId, filename) => {
  return `${API_BASE_URL}/files/${jobId}/${encodeURIComponent(filename)}`;
};
