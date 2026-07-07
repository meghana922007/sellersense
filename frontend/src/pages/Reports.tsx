import React, { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { FileText, Download, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [emailReports, setEmailReports] = useState(user?.emailReports || false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailSuccess, setTestEmailSuccess] = useState<string | null>(null);
  const [testEmailError, setTestEmailError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (format: 'pdf' | 'csv') => {
    setDownloading(format);
    try {
      const response = await api.get(`/reports/sales/${format}`, {
        responseType: 'blob',
      });

      // Create browser download link for the blob binary stream
      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `SellerSense_Report_${new Date().toISOString().split('T')[0]}.${format}`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handleToggleEmailReports = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setEmailReports(val);
    try {
      // Call profile update to change email settings
      await api.put('/auth/profile', { emailReports: val });
    } catch (err) {
      console.error('Failed to update email configs:', err);
    }
  };

  const handleTriggerTestEmail = async () => {
    setTestEmailLoading(true);
    setTestEmailSuccess(null);
    setTestEmailError(null);

    try {
      await api.post('/reports/email/test');
      setTestEmailSuccess(`A test report has been dispatched to ${user?.email}. check the console log for the Ethereal inbox URL!`);
    } catch (err: any) {
      setTestEmailError(err.response?.data?.error || 'Failed to dispatch test report.');
    } finally {
      setTestEmailLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Analytics Reports
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Export your unified sales ledger or schedule automated email digests.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exports Panel */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-6">
          <h3 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2">
            <FileText size={18} className="text-brand-400" />
            <span>On-Demand Exports</span>
          </h3>

          <p className="text-slate-400 text-sm">
            Generate and download dynamic bookkeeping statements for tax reporting or spreadsheet checks.
          </p>

          <div className="space-y-3">
            {/* PDF export */}
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloading !== null}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-800 hover:border-brand-500/25 bg-slate-900/30 hover:bg-slate-900/60 transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Download PDF Report</p>
                  <p className="text-xs text-slate-500">Styled performance report with tables & highlights</p>
                </div>
              </div>
              <Download size={16} className="text-slate-500 group-hover:text-brand-400 transition-colors" />
            </button>

            {/* CSV export */}
            <button
              onClick={() => handleDownload('csv')}
              disabled={downloading !== null}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-800 hover:border-brand-500/25 bg-slate-900/30 hover:bg-slate-900/60 transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Download CSV Ledger</p>
                  <p className="text-xs text-slate-500">Raw transaction rows for Excel or Google Sheets</p>
                </div>
              </div>
              <Download size={16} className="text-slate-500 group-hover:text-brand-400 transition-colors" />
            </button>
          </div>
        </div>

        {/* Email Scheduling Panel */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-6">
          <h3 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2">
            <Mail size={18} className="text-brand-400" />
            <span>Scheduled Digests</span>
          </h3>

          <p className="text-slate-400 text-sm">
            Configure SellerSense to automatically compile your metrics and email them directly to your inbox.
          </p>

          {/* Configuration toggle */}
          <div className="flex items-center space-x-3 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
            <input
              type="checkbox"
              id="weekly-reports"
              checked={emailReports}
              onChange={handleToggleEmailReports}
              className="bg-slate-900 border border-slate-800 rounded focus:ring-brand-500 h-5 w-5 text-brand-500 cursor-pointer"
            />
            <div className="cursor-pointer">
              <label htmlFor="weekly-reports" className="text-sm font-semibold text-slate-200 cursor-pointer">
                Email Weekly Digests
              </label>
              <p className="text-xs text-slate-500">Scheduled to deliver every Monday at 9:00 AM</p>
            </div>
          </div>

          {/* Test Trigger */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-0.5">Test Inbox Delivery</h4>
            
            <button
              onClick={handleTriggerTestEmail}
              disabled={testEmailLoading}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/50 flex items-center justify-center space-x-2 transition-all font-semibold text-sm disabled:opacity-50"
            >
              <Send size={14} className="text-brand-400" />
              <span>{testEmailLoading ? 'Sending test...' : 'Send Test Report Email'}</span>
            </button>

            {testEmailSuccess && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-start space-x-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{testEmailSuccess}</span>
              </div>
            )}

            {testEmailError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{testEmailError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
