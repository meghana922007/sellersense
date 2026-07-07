import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Search, AlertCircle, Calendar } from 'lucide-react';

interface Order {
  id: string;
  marketplace: string;
  marketplaceOrderId: string;
  orderDate: string;
  status: string;
  sku: string;
  productName: string;
  quantity: number;
  salePrice: number;
  marketplaceFee: number;
  fulfillmentFee: number;
  otherFees: number;
  totalFees: number;
  costPrice: number | null;
  netRevenue: number;
  profit: number | null;
}

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [marketplace, setMarketplace] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders', {
        params: {
          page,
          limit: 10,
          marketplace,
          status,
          search,
          from: from || undefined,
          to: to || undefined,
        },
      });
      setOrders(res.data.orders);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, marketplace, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleClearFilters = () => {
    setSearch('');
    setMarketplace('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
    // Directly fetch with cleared filters
    setTimeout(fetchOrders, 0);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Orders Ledger
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Browse and filter consolidated transactional invoices.
          </p>
        </div>
        <button
          onClick={handleClearFilters}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 border border-slate-700/50"
        >
          Reset Filters
        </button>
      </div>

      {/* Filters Pane */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 space-y-4">
        {/* Row 1: Search & Marketplaces */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <form onSubmit={handleSearchSubmit} className="md:col-span-2 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Order ID, SKU, or Product Name..."
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 outline-none"
            />
            <button type="submit" className="absolute left-3.5 inset-y-0 flex items-center text-slate-505">
              <Search size={16} />
            </button>
          </form>

          <div>
            <select
              value={marketplace}
              onChange={(e) => {
                setMarketplace(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 px-4 text-sm text-slate-300 outline-none cursor-pointer"
            >
              <option value="">All Marketplaces</option>
              <option value="AMAZON">Amazon</option>
              <option value="FLIPKART">Flipkart</option>
              <option value="MEESHO">Meesho</option>
            </select>
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 px-4 text-sm text-slate-300 outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="RETURNED">Returned</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date Filters */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-800/40 text-sm text-slate-400">
          <div className="flex items-center space-x-2">
            <Calendar size={14} className="text-brand-400" />
            <span>Date Range:</span>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 outline-none focus:border-brand-500 cursor-pointer"
            />
            <span className="text-xs">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 outline-none focus:border-brand-500 cursor-pointer"
            />
          </div>

          <button
            onClick={() => {
              setPage(1);
              fetchOrders();
            }}
            className="px-3.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-505 text-xs text-white font-semibold transition-all ml-auto"
          >
            Apply Timeframe
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-800 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <AlertCircle size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm font-semibold">No orders found</p>
            <p className="text-xs mt-1">Upload order spreadsheet reports to populate transactions ledger.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Order ID</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Channel</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">SKU / Product</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Qty</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Sale Price</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Fees</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">COGS</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {orders.map((order) => {
                  const hasProfit = order.profit !== null;
                  const isPositive = hasProfit && order.profit! >= 0;

                  return (
                    <tr key={order.id} className="hover:bg-slate-850/10 transition-all">
                      <td className="p-4 font-mono text-slate-200 text-xs font-semibold max-w-[120px] truncate">
                        {order.marketplaceOrderId}
                      </td>
                      <td className="p-4 text-slate-400 text-xs font-medium white-space-nowrap">
                        {formatDate(order.orderDate)}
                      </td>
                      <td className="p-4 text-xs font-bold text-brand-400">{order.marketplace}</td>
                      <td className="p-4 max-w-[200px]">
                        <div className="font-mono text-xs text-slate-200 font-medium truncate">{order.sku}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{order.productName}</div>
                      </td>
                      <td className="p-4 text-center text-slate-300 font-semibold">{order.quantity}</td>
                      <td className="p-4 text-right text-slate-200 font-semibold">
                        ₹{order.salePrice.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-slate-400 font-medium">
                        ₹{order.totalFees.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-slate-400 font-medium">
                        {order.costPrice !== null ? (
                          `₹${(order.costPrice * order.quantity).toLocaleString()}`
                        ) : (
                          <span className="text-[10px] text-slate-500">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {hasProfit ? (
                          <span className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}₹{order.profit!.toLocaleString()}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-500 border border-amber-500/10 whitespace-nowrap">
                            Missing Cost
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination control */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 bg-slate-900/20 border-t border-slate-800 text-sm text-slate-400">
            <span>
              Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} orders
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
  );
};
