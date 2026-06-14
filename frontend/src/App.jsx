import { useState, useEffect } from 'react';
import { Download, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { startDownloadJob, createProgressEventSource, getDownloadUrl } from './services/api';

const PLATFORMS = [
  { id: 'auto', name: 'Auto Detect' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'pinterest', name: 'Pinterest' }
];

const QUALITIES = [
  { id: 'highest', name: 'Highest quality (video+audio)' },
  { id: '1080p', name: '1080p' },
  { id: '720p', name: '720p' },
  { id: '480p', name: '480p' },
  { id: '360p', name: '360p' },
  { id: 'audio', name: 'Audio only (MP3)' }
];

function App() {
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('auto');
  const [quality, setQuality] = useState('highest');
  
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, starting, downloading, processing, error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let eventSource = null;

    if (jobId && ['starting', 'downloading', 'processing'].includes(status)) {
      eventSource = createProgressEventSource(jobId);

      eventSource.addEventListener('update', (e) => {
        const data = JSON.parse(e.data);
        setStatus(data.status);
        setProgress(data.progress);
        
        if (data.status === 'completed') {
          // Trigger direct download
          const fileUrl = getDownloadUrl(jobId, data.filename);
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = data.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // Reset UI automatically for the next download
          setUrl('');
          setJobId(null);
          setStatus('idle');
          setProgress(0);
          eventSource.close();
        } else if (data.status === 'error') {
          setErrorMsg(data.error_msg || 'An unknown error occurred.');
          eventSource.close();
        }
      });

      eventSource.addEventListener('error', () => {
        if (status !== 'completed' && status !== 'error') {
          setStatus('error');
          setErrorMsg('Connection lost. The download may still be running on the server.');
        }
        eventSource.close();
      });
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [jobId, status]);

  const handleDownloadClick = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg('Please enter a valid URL.');
      return;
    }

    setErrorMsg(null);
    setProgress(0);
    setStatus('starting');

    try {
      const newJobId = await startDownloadJob(url, platform, quality);
      setJobId(newJobId);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.response?.data?.detail || 'Failed to connect to the server.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3 md:space-y-4">
          <div className="inline-flex items-center justify-center p-3 md:p-4 bg-blue-500/10 rounded-full mb-2 md:mb-4 ring-1 ring-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.3)]">
            <Download className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300 px-2">
            Universal Downloader
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-lg mx-auto px-4">
            Download videos and audio from YouTube, Instagram, Facebook, and more in top quality.
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card p-5 sm:p-8 md:p-10 relative overflow-hidden group">
          
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 md:w-64 md:h-64 bg-blue-500/10 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

          <form onSubmit={handleDownloadClick} className="space-y-5 md:space-y-6 relative z-10">
            
            {/* Input URL */}
            <div className="space-y-1.5 md:space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Media URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LinkIcon className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste video or post link..."
                  className="input-field pl-11 h-12 md:h-auto text-base"
                  required
                  disabled={status !== 'idle' && status !== 'error'}
                />
              </div>
            </div>

            {/* Options Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="input-field h-12 md:h-auto text-base appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTE5IDlsLTcgNy03LTciLz48L3N2Zz4=')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem]"
                  disabled={status !== 'idle' && status !== 'error'}
                >
                  {PLATFORMS.map(p => <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Quality</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="input-field h-12 md:h-auto text-base appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTE5IDlsLTcgNy03LTciLz48L3N2Zz4=')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem]"
                  disabled={status !== 'idle' && status !== 'error'}
                >
                  {QUALITIES.map(q => <option key={q.id} value={q.id} className="bg-slate-800">{q.name}</option>)}
                </select>
              </div>
            </div>

            {/* Error Message */}
            {status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3.5 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{errorMsg}</p>
              </div>
            )}

            {/* Progress Area */}
            {['starting', 'downloading', 'processing'].includes(status) && (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-blue-400 capitalize">
                    {status === 'starting' && 'Initializing...'}
                    {status === 'downloading' && 'Downloading...'}
                    {status === 'processing' && 'Processing file...'}
                  </span>
                  <span className="text-slate-300 font-mono">{progress.toFixed(1)}%</span>
                </div>
                
                {/* Progress Bar Container */}
                <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[shimmer_1s_linear_infinite]"></div>
                  </div>
                </div>
                <p className="text-xs text-center text-slate-500 mt-2">
                  Please wait, your download will start automatically.
                </p>
              </div>
            )}

            {/* Action Button */}
            {(status === 'idle' || status === 'error') && (
              <button 
                type="submit" 
                className="btn-primary w-full h-12 md:h-14 text-base md:text-lg flex items-center justify-center gap-2 group mt-2"
              >
                <Download className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-y-1 transition-transform" />
                Download Now
              </button>
            )}

          </form>
        </div>
        
        {/* Footer info */}
        <p className="text-center text-slate-500 text-xs md:text-sm px-4">
          Note: For some platforms like Facebook or Instagram, private posts require server-side cookies.
        </p>

      </div>
    </div>
  );
}

export default App;
