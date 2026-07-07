import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CloudUpload, ShoppingBag, Receipt, LogOut, Menu, X, User, CreditCard, Package2, BarChart3 } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'import', name: 'Import Reports', icon: CloudUpload },
    { id: 'products', name: 'Products Catalog', icon: ShoppingBag },
    { id: 'orders', name: 'Orders Ledger', icon: Receipt },
    { id: 'expenses', name: 'Expenses Ledger', icon: CreditCard },
    { id: 'inventory', name: 'FBA Inventory', icon: Package2 },
    { id: 'reports', name: 'Analytics Reports', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation - Large Screen */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-slate-800/80 p-5 shrink-0">
        {/* Brand header */}
        <div className="flex items-center space-x-3 mb-8 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-brand-500/20">
            S
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              SellerSense
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-600/90 text-white shadow-lg shadow-brand-600/10'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile card & Logout */}
        <div className="border-t border-slate-800/50 pt-4 mt-auto">
          <div className="flex items-center space-x-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center text-brand-400">
              <User size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-100">
                {user?.name || user?.email.split('@')[0]}
              </p>
              <p className="text-xs truncate text-slate-400">
                {user?.storeName || 'My Seller Store'}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header - Mobile & Global */}
        <header className="flex md:hidden items-center justify-between p-4 glass-panel border-b border-slate-800/80 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center font-bold text-white">
              S
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              SellerSense
            </span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-700/50"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-panel border-b border-slate-800/80 p-4 space-y-2 sticky top-[65px] z-15">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium ${
                    isActive ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </button>
              );
            })}
            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
