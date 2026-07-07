import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Import } from './pages/Import';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Expenses } from './pages/Expenses';
import { Inventory } from './pages/Inventory';
import { Reports } from './pages/Reports';

const AppContent: React.FC = () => {
  const { token, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoginView, setIsLoginView] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-brand-400">Loading SellerSense...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated routing
  if (!token) {
    return isLoginView ? (
      <Login onToggleAuth={() => setIsLoginView(false)} />
    ) : (
      <Signup onToggleAuth={() => setIsLoginView(true)} />
    );
  }

  // Authenticated SPA routing
  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'import' && <Import />}
      {activeTab === 'products' && <Products />}
      {activeTab === 'orders' && <Orders />}
      {activeTab === 'expenses' && <Expenses />}
      {activeTab === 'inventory' && <Inventory />}
      {activeTab === 'reports' && <Reports />}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
