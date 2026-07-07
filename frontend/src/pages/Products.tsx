import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Search, Edit3, Check, X, ShieldAlert, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  costPrice: number | null;
  sellingPrice: number | null;
  marketplace: string;
  category: string | null;
}

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [marketplace, setMarketplace] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState<string>('');
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products', {
        params: {
          page,
          limit: 10,
          search,
          marketplace,
        },
      });
      setProducts(res.data.products);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, marketplace]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const startEdit = (product: Product) => {
    setUpdatingId(product.id);
    setEditCost(product.costPrice !== null ? product.costPrice.toString() : '');
    setApiError(null);
  };

  const cancelEdit = () => {
    setUpdatingId(null);
    setEditCost('');
  };

  const saveCostPrice = async (product: Product) => {
    const val = parseFloat(editCost);
    if (isNaN(val) || val < 0) {
      setApiError('Cost price must be a positive number.');
      return;
    }

    try {
      await api.put(`/products/${product.id}`, {
        costPrice: val,
        name: product.name,
      });
      setUpdatingId(null);
      fetchProducts();
    } catch (err: any) {
      setApiError(err.response?.data?.error || 'Failed to update cost price.');
    }
  };

  // Missing cost-prices indicator count
  const missingCostCount = products.filter((p) => p.costPrice === null || p.costPrice === 0).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Products Catalog
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review imported catalog items and configure unit manufacturing costs.
        </p>
      </div>

      {/* Warning banner */}
      {missingCostCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-start space-x-3 shadow-md animate-pulse-subtle">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Profit Tracking Incomplete</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {missingCostCount} products in this page are missing unit cost prices. Input cost prices below to backfill order profit calculations.
            </p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU or name..."
            className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 outline-none placeholder-slate-500"
          />
          <button type="submit" className="absolute left-3.5 inset-y-0 flex items-center text-slate-500">
            <Search size={16} />
          </button>
        </form>

        <div className="flex gap-3 w-full md:w-auto">
          {['', 'AMAZON', 'FLIPKART', 'MEESHO'].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMarketplace(m);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                marketplace === m
                  ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-500/10'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {m || 'All Platforms'}
            </button>
          ))}
        </div>
      </div>

      {/* API edit errors */}
      {apiError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle size={14} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Table grid */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-800 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <AlertCircle size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm font-semibold">No products found</p>
            <p className="text-xs mt-1">Upload order reports to automatically populate your catalog.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Master SKU</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Product Name</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Sales Channel</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Selling Price</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center w-[180px]">Unit Cost (COGS)</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-850/10 transition-all">
                    <td className="p-4 font-mono text-slate-200 text-xs font-semibold">
                      {product.sku}
                    </td>
                    <td className="p-4 text-slate-300 font-medium truncate max-w-[240px]">
                      {product.name}
                    </td>
                    <td className="p-4 text-xs font-bold text-brand-400">{product.marketplace}</td>
                    <td className="p-4 text-right text-slate-200 font-medium">
                      ₹{product.sellingPrice?.toLocaleString() || '0.00'}
                    </td>
                    <td className="p-4 text-center">
                      {updatingId === product.id ? (
                        <div className="flex items-center space-x-1.5 justify-center">
                          <span className="text-slate-505 text-sm">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editCost}
                            onChange={(e) => setEditCost(e.target.value)}
                            className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center text-sm outline-none text-slate-100 focus:border-brand-500"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          {product.costPrice !== null && product.costPrice > 0 ? (
                            <span className="text-slate-200 font-semibold">
                              ₹{product.costPrice.toLocaleString()}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-500 border border-amber-500/10">
                              Missing Cost
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {updatingId === product.id ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => saveCostPrice(product)}
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
                          onClick={() => startEdit(product)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-750 transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginations */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 bg-slate-900/20 border-t border-slate-800 text-sm text-slate-400">
            <span>
              Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} items
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
