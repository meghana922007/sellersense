import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Upload, FileText, CheckCircle2, XCircle, RefreshCw, Clock, ArrowRight } from 'lucide-react';

interface ImportJob {
  id: string;
  marketplace: string;
  fileName: string;
  fileType: string;
  status: string;
  totalRows: number;
  processedRows: number;
  errorMessage: string | null;
  createdAt: string;
}

export const Import: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });
  const [jobError, setJobError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/import/history');
      setHistory(res.data.imports);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Poll status of active upload job
  useEffect(() => {
    if (!activeJobId) return;

    let intervalId: any;

    const checkStatus = async () => {
      try {
        const res = await api.get(`/import/status/${activeJobId}`);
        const job = res.data;
        setJobStatus(job.status);
        setJobProgress({ processed: job.processedRows, total: job.totalRows });

        if (job.status === 'COMPLETED') {
          setActiveJobId(null);
          setFile(null);
          fetchHistory();
        } else if (job.status === 'FAILED') {
          setJobError(job.errorMessage || 'Parsing failed.');
          setActiveJobId(null);
          fetchHistory();
        }
      } catch (err) {
        setActiveJobId(null);
      }
    };

    // Run first check immediately, then poll every 1.5 seconds
    checkStatus();
    intervalId = setInterval(checkStatus, 1500);

    return () => clearInterval(intervalId);
  }, [activeJobId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setJobError(null);
      setJobStatus(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setJobError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/import/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setActiveJobId(res.data.jobId);
      setJobStatus('PENDING');
    } catch (err: any) {
      setJobError(err.response?.data?.error || 'Upload failed. File type may be unsupported.');
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Import Reports
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload exported CSV, XLSX (Flipkart), or Meesho ZIP payouts ledger reports.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Column */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 border border-slate-800/80 h-fit space-y-6">
          <h3 className="text-lg font-bold text-white tracking-wide">Upload File</h3>

          {/* Form */}
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-slate-800 hover:border-brand-500/40 rounded-2xl p-6 text-center transition-all bg-slate-900/30 flex flex-col items-center justify-center min-h-[180px] relative cursor-pointer group">
              <input
                type="file"
                required
                onChange={handleFileChange}
                accept=".csv, .xlsx, .xls, .zip"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading || activeJobId !== null}
              />
              <Upload size={32} className="text-slate-500 group-hover:text-brand-400 mb-3 transition-colors" />
              {file ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-200 truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-300">
                    Drag and drop file here
                  </p>
                  <p className="text-xs text-slate-500">
                    Supports .csv, .xlsx, .xls, or Meesho .zip
                  </p>
                </div>
              )}
            </div>

            {/* Ingestion progress */}
            {activeJobId && (
              <div className="p-4 rounded-xl bg-brand-600/10 border border-brand-500/20 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-brand-400 flex items-center space-x-1.5 animate-pulse-subtle">
                    <RefreshCw size={12} className="animate-spin" />
                    <span>{jobStatus === 'PENDING' ? 'Queued...' : 'Parsing records...'}</span>
                  </span>
                  <span className="text-slate-300">
                    {jobProgress.processed} / {jobProgress.total || 'Checking'} rows
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${jobProgress.total > 0 ? (jobProgress.processed / jobProgress.total) * 100 : 10}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {jobError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-2">
                <XCircle size={16} className="shrink-0 mt-0.5" />
                <span>{jobError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!file || uploading || activeJobId !== null}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold text-sm hover:from-brand-500 hover:to-brand-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/10 flex items-center justify-center space-x-2"
            >
              <span>{uploading ? 'Uploading...' : 'Process File'}</span>
              {!uploading && <ArrowRight size={14} />}
            </button>
          </form>
        </div>

        {/* History Column */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-6">
          <h3 className="text-lg font-bold text-white tracking-wide">Import Audit History</h3>

          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-slate-800 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm font-medium">No files imported yet.</p>
              <p className="text-xs mt-1">Uploaded reports logs will be listed here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800/50">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">File Name</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Platform</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Rows</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 bg-slate-900/10">
                  {history.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-850/20 transition-all">
                      <td className="p-4 font-medium text-slate-200 truncate max-w-[150px]">
                        {job.fileName}
                      </td>
                      <td className="p-4 text-xs font-bold text-brand-400">{job.marketplace}</td>
                      <td className="p-4">
                        {job.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/10">
                            <CheckCircle2 size={12} />
                            <span>Done</span>
                          </span>
                        ) : job.status === 'FAILED' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/10">
                            <XCircle size={12} />
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/10">
                            <Clock size={12} className="animate-spin" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-300 font-medium">
                        {job.processedRows} / {job.totalRows}
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-medium">
                        {new Date(job.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
