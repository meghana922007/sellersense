import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Percent, ShoppingBag, ArrowUpRight, TrendingUp, AlertTriangle, ToggleLeft, ToggleRight, Sparkles, X, Brain } from 'lucide-react';

interface SummaryData {
  totalRevenue: number;
  totalFees: number;
  totalProfit: number;
  totalExpenses: number;
  orderCount: number;
  aov: number;
  profitMargin: number;
}

interface PlatformStat {
  revenue: number;
  profit: number;
  orders: number;
}

export const Dashboard: React.FC = () => {
  const { refreshUser } = useAuth();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [platformStats, setPlatformStats] = useState<Record<string, PlatformStat>>({});
  const [marketplaces, setMarketplaces] = useState<{ id: string; marketplace: string; isActive: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Analyst state
  const [aiInsights, setAiInsights] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [deepReport, setDeepReport] = useState<string>('');
  const [deepLoading, setDeepLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch summary, marketplaces, and AI dashboard suggestions in parallel
      const [summaryRes, marketRes] = await Promise.all([
        api.get('/orders/summary'),
        api.get('/marketplaces'),
      ]);

      setSummary(summaryRes.data.summary);
      setPlatformStats(summaryRes.data.platformBreakdown);
      setMarketplaces(marketRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    try {
      setAiLoading(true);
      const res = await api.get('/insights/dashboard');
      setAiInsights(res.data.insights);
    } catch (err) {
      console.error('Failed to load AI suggestions:', err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAIInsights();
  }, []);

  const handleToggleMarketplace = async (marketName: string, currentStatus: boolean) => {
    try {
      const updatedList = marketplaces.map((m) =>
        m.marketplace === marketName ? { ...m, isActive: !currentStatus } : m
      );
      setMarketplaces(updatedList);

      await api.put('/marketplaces', {
        marketplaces: updatedList.map((m) => ({
          marketplace: m.marketplace,
          isActive: m.isActive,
        })),
      });

      await refreshUser();
    } catch (err: any) {
      // Revert if API fail
      fetchData();
    }
  };

  const handleGenerateDeepReport = async () => {
    setModalOpen(true);
    setDeepLoading(true);
    setDeepReport('');
    try {
      const res = await api.post('/insights/generate');
      setDeepReport(res.data.report);
    } catch (err: any) {
      setDeepReport(`### Error\nFailed to fetch consultation details: ${err.response?.data?.error || err.message}`);
    } finally {
      setDeepLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Formatting values
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Recharts Chart Data
  const chartData = Object.keys(platformStats).map((platform) => ({
    name: platform,
    Revenue: platformStats[platform].revenue,
    Profit: platformStats[platform].profit,
    Orders: platformStats[platform].orders,
  }));

  const COLORS = ['#3b62f6', '#22c55e', '#a855f7'];

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Overview Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time multi-platform sales aggregation.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-400 border border-slate-700/50 transition-all"
        >
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center space-x-2">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* AI Business Analyst Panel */}
      <div className="glass-panel rounded-2xl p-6 border border-brand-500/20 bg-gradient-to-r from-brand-950/10 via-slate-900/40 to-slate-900/60 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 animate-pulse">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-md font-bold text-white tracking-wide">SellerSense AI Advisor</h3>
              <p className="text-xs text-slate-400 font-medium">Automated store audits and stocking guidelines</p>
            </div>
          </div>
          <button
            onClick={handleGenerateDeepReport}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all shadow-md shadow-brand-500/10 flex items-center space-x-1.5"
          >
            <Brain size={14} />
            <span>Generate Deep Consultation</span>
          </button>
        </div>

        {aiLoading ? (
          <div className="space-y-2 py-2">
            <div className="h-4 w-3/4 bg-slate-800/40 rounded-lg animate-pulse" />
            <div className="h-4 w-2/3 bg-slate-800/40 rounded-lg animate-pulse" />
            <div className="h-4 w-1/2 bg-slate-800/40 rounded-lg animate-pulse" />
          </div>
        ) : aiInsights ? (
          <div className="space-y-2 text-sm text-slate-300 font-medium whitespace-pre-line py-1 leading-relaxed">
            {aiInsights}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No automated tips compiled. Try uploading sales spreadsheet records.</p>
        )}
      </div>

      {/* Connection Wizard - Onboarding Banner */}
      {marketplaces.filter((m) => m.isActive).length === 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-900/40 to-slate-900 border border-brand-500/20 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Connect Sales Channels</h3>
            <p className="text-slate-400 text-sm">
              Toggle your active sales channels below to start consolidating and cleaning report data.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {['AMAZON', 'FLIPKART', 'MEESHO'].map((m) => (
              <button
                key={m}
                onClick={() => handleToggleMarketplace(m, false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md shadow-brand-500/10"
              >
                Connect {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Card 1: Revenue */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700/50 transition-all duration-300">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <DollarSign size={16} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{formatCurrency(summary.totalRevenue)}</h3>
            <div className="flex items-center space-x-1 text-xs text-blue-400 mt-2 font-medium">
              <TrendingUp size={12} />
              <span>Gross Sales Volume</span>
            </div>
          </div>

          {/* Card 2: Profit */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700/50 transition-all duration-300">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Net Profit</span>
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                <ArrowUpRight size={16} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{formatCurrency(summary.totalProfit)}</h3>
            <div className="flex items-center space-x-1 text-xs text-green-400 mt-2 font-medium">
              <TrendingUp size={12} />
              <span>After fees & COGS</span>
            </div>
          </div>

          {/* Card 3: Orders */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700/50 transition-all duration-300">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <ShoppingBag size={16} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{summary.orderCount}</h3>
            <div className="flex items-center space-x-1 text-xs text-purple-400 mt-2 font-medium">
              <span>Orders volume processed</span>
            </div>
          </div>

          {/* Card 4: AOV */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700/50 transition-all duration-300">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Average Order</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <DollarSign size={16} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{formatCurrency(summary.aov)}</h3>
            <div className="flex items-center space-x-1 text-xs text-amber-400 mt-2 font-medium">
              <span>Mean revenue per sale</span>
            </div>
          </div>

          {/* Card 5: Profit Margin */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700/50 transition-all duration-300">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Profit Margin</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                <Percent size={16} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-100">{summary.profitMargin.toFixed(1)}%</h3>
            <div className="flex items-center space-x-1 text-xs text-rose-400 mt-2 font-medium">
              <span>Net return ratio</span>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Platform Comparison Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {['AMAZON', 'FLIPKART', 'MEESHO'].map((platform) => {
          const stats = platformStats[platform] || { revenue: 0, profit: 0, orders: 0 };
          const activeMarket = marketplaces.find((m) => m.marketplace === platform);
          const isConnected = activeMarket?.isActive || false;

          return (
            <div
              key={platform}
              className={`glass-panel rounded-2xl p-6 border relative transition-all duration-300 ${
                isConnected ? 'border-slate-800/80 hover:border-brand-500/20' : 'border-slate-800/40 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">{platform}</h3>
                  <span className="text-xs text-slate-400">
                    {isConnected ? 'Active integration' : 'Disconnected'}
                  </span>
                </div>

                {/* Connection Toggle */}
                <button
                  onClick={() => handleToggleMarketplace(platform, isConnected)}
                  className={`p-1 rounded-full transition-colors ${
                    isConnected ? 'text-brand-500' : 'text-slate-600'
                  }`}
                >
                  {isConnected ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                </button>
              </div>

              {/* Side by Side stats details */}
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                  <span className="text-sm text-slate-400">Gross Revenue</span>
                  <span className="text-sm font-bold text-slate-100">{formatCurrency(stats.revenue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                  <span className="text-sm text-slate-400">Net Profit</span>
                  <span className="text-sm font-bold text-green-400">{formatCurrency(stats.profit)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-400">Total Orders</span>
                  <span className="text-sm font-bold text-slate-100">{stats.orders}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Row */}
      {summary && summary.orderCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue & Profit Grouped Bar Chart */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800/80">
            <h3 className="text-lg font-bold text-white mb-6">Marketplace Sales vs. Margin</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    formatter={(value: any) => [`₹${value.toLocaleString()}`]}
                  />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#3b62f6" name="Gross Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill="#22c55e" name="Net Profit" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Share Pie Chart */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6">Revenue Share Breakdown</h3>
            <div className="h-60 flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.filter((d) => d.Revenue > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="Revenue"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `₹${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-6 text-xs text-slate-400 mt-4">
              {chartData.map((d, index) => (
                <div key={d.name} className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span>{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Deep Consultation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl glass-panel border border-slate-800 rounded-2xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center space-x-2.5">
                <Brain size={20} className="text-brand-400" />
                <h3 className="text-lg font-bold text-white">E-Commerce Consultant Deep Audit</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-700/50 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-300 text-sm leading-relaxed max-h-[60vh] custom-scrollbar">
              {deepLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 font-semibold tracking-wider animate-pulse">Analyzing sales records and compiling suggestions...</p>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                  {deepReport}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/50 text-xs font-semibold"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
