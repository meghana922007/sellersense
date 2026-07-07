import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Trash2, Calendar, DollarSign, FileText, AlertCircle, Sparkles } from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  isRecurring: boolean;
}

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Form states
  const [category, setCategory] = useState('PACKAGING');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/expenses', {
        params: { page, limit: 10 },
      });
      setExpenses(res.data.expenses);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [page]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setFormError('Please enter a positive amount.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/expenses', {
        category,
        amount: parsedAmt,
        description: description || undefined,
        date,
        isRecurring,
      });

      // Reset form fields
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
      setPage(1);
      fetchExpenses();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Expenses Ledger
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Record overhead expenses (shipping invoices, advertising charges) to calculate true profitability margins.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creation Form Column */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 border border-slate-800/80 h-fit space-y-5">
          <h3 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2">
            <Sparkles size={16} className="text-brand-400" />
            <span>Record Overhead</span>
          </h3>

          <form onSubmit={handleAddExpense} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 block ml-0.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 px-4 text-sm text-slate-300 outline-none cursor-pointer"
              >
                <option value="PACKAGING">Packaging</option>
                <option value="TRANSPORT">Transport / Courier</option>
                <option value="ADVERTISING">Marketing / Ads</option>
                <option value="MISC">Miscellaneous</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 block ml-0.5">Amount (INR)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <DollarSign size={16} />
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 block ml-0.5">Expense Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 block ml-0.5">Notes / Description</label>
              <div className="relative">
                <span className="absolute top-3 left-3.5 text-slate-500">
                  <FileText size={16} />
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tape box purchase..."
                  rows={2}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2 ml-0.5">
              <input
                type="checkbox"
                id="recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="bg-slate-900 border border-slate-800 rounded focus:ring-brand-500 h-4 w-4 text-brand-500 cursor-pointer"
              />
              <label htmlFor="recurring" className="text-xs text-slate-400 font-semibold cursor-pointer">
                Mark as recurring monthly expense
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 mt-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold text-sm hover:from-brand-500 hover:to-brand-400 shadow-md shadow-brand-500/10 flex items-center justify-center space-x-1.5 transition-all"
            >
              <Plus size={16} />
              <span>{submitting ? 'Recording...' : 'Add Expense'}</span>
            </button>
          </form>
        </div>

        {/* Expense List Column */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-6">
          <h3 className="text-lg font-bold text-white tracking-wide">Expense Audit Log</h3>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-slate-800 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm font-semibold">No expenses logged yet</p>
              <p className="text-xs mt-1">Overhead items logged will be cataloged here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800/50">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Category</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Description</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Amount</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 bg-slate-900/10">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-850/20 transition-all">
                      <td className="p-4 text-xs font-medium text-slate-400 whitespace-nowrap">
                        {formatDate(exp.date)}
                      </td>
                      <td className="p-4 font-bold text-xs text-brand-400 tracking-wider">
                        {exp.category}
                      </td>
                      <td className="p-4 text-slate-300 font-medium truncate max-w-[150px]">
                        {exp.description || '—'}
                      </td>
                      <td className="p-4 text-right text-red-400 font-bold">
                        -₹{exp.amount.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginated */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-slate-900/10 pt-4 border-t border-slate-800 text-sm text-slate-400">
              <span>
                Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} overhead items
              </span>
              <div className="flex space-x-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-xs"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
