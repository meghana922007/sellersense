import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { ShieldAlert, Check, X, Edit3, AlertTriangle, HelpCircle } from 'lucide-react';

interface InventoryItem {
  id: string;
  sku: string;
  marketplace: string;
  fulfillableQuantity: number;
  reservedQuantity: number;
  inboundQuantity: number;
  totalQuantity: number;
  lowStockThreshold: number;
  lastUpdated: string;
  product: {
    name: string;
    costPrice: number | null;
  } | null;
}

export const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit threshold states
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editThreshold, setEditThreshold] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory', {
        params: {
          page,
          limit: 10,
          alert: showAlertsOnly ? 'true' : 'false',
        },
      });
      setInventory(res.data.inventory);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [page, showAlertsOnly]);

  const startEdit = (item: InventoryItem) => {
    setUpdatingId(item.id);
    setEditThreshold(item.lowStockThreshold.toString());
    setApiError(null);
  };

  const cancelEdit = () => {
    setUpdatingId(null);
    setEditThreshold('');
  };

  const saveThreshold = async (item: InventoryItem) => {
    const val = parseInt(editThreshold, 10);
    if (isNaN(val) || val < 0) {
      setApiError('Threshold must be a non-negative integer.');
      return;
    }

    try {
      await api.put(`/inventory/${item.id}/threshold`, { threshold: val });
      setUpdatingId(null);
      fetchInventory();
    } catch (err: any) {
      setApiError(err.response?.data?.error || 'Failed to update alert limit.');
    }
  };



  // Compute alert states
  const activeAlertsCount = inventory.filter(
    (item) => item.fulfillableQuantity <= item.lowStockThreshold
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          FBA Inventory Tracking
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Monitor your Amazon Fulfillment network stocks and configure custom alert triggers.
        </p>
      </div>

      {/* Alert banner */}
      {activeAlertsCount > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start space-x-3 shadow-md">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Low Stock Warnings Active</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeAlertsCount} products have fulfillable quantities below their designated safety threshold. Restock recommended to prevent sales delays.
            </p>
          </div>
        </div>
      )}

      {/* Filter Toggle */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => {
            setShowAlertsOnly(!showAlertsOnly);
            setPage(1);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
            showAlertsOnly
              ? 'bg-red-500 border-red-400 text-white shadow-md shadow-red-500/15'
              : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {showAlertsOnly ? 'Show All Products' : 'Show Low Stock Alerts Only'}
        </button>

        <span className="text-xs text-slate-500 font-medium">
          Note: Flipkart/Meesho inventory tracking is skipped (no reports export).
        </span>
      </div>

      {/* Edit Errors */}
      {apiError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
          <AlertTriangle size={14} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Catalog Grid */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-800 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <HelpCircle size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm font-semibold">No inventory logs found</p>
            <p className="text-xs mt-1">Upload FBA Inventory CSV reports to activate dashboard trackers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">SKU</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Product Name</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Fulfillable</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Reserved</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Inbound</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Total</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center w-[160px]">Alert Limit</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Config</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {inventory.map((item) => {
                  const isLow = item.fulfillableQuantity <= item.lowStockThreshold;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-850/10 transition-all ${
                        isLow ? 'bg-red-500/[0.015]' : ''
                      }`}
                    >
                      <td className="p-4 font-mono text-slate-200 text-xs font-semibold">
                        {item.sku}
                      </td>
                      <td className="p-4 text-slate-300 font-medium truncate max-w-[200px]">
                        {item.product?.name || `FBA Product ${item.sku}`}
                      </td>
                      <td className="p-4 text-center font-bold">
                        <span className={isLow ? 'text-red-400' : 'text-slate-100'}>
                          {item.fulfillableQuantity}
                        </span>
                      </td>
                      <td className="p-4 text-center text-slate-400">{item.reservedQuantity}</td>
                      <td className="p-4 text-center text-slate-400">{item.inboundQuantity}</td>
                      <td className="p-4 text-center text-slate-200 font-semibold">{item.totalQuantity}</td>
                      <td className="p-4 text-center">
                        {updatingId === item.id ? (
                          <input
                            type="number"
                            value={editThreshold}
                            onChange={(e) => setEditThreshold(e.target.value)}
                            className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center text-sm outline-none text-slate-100 focus:border-brand-500"
                          />
                        ) : (
                          <span className="text-slate-400 font-medium">{item.lowStockThreshold} units</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {updatingId === item.id ? (
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => saveThreshold(item)}
                              className="p-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/10"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-750 transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
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
              Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} products
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
