import React from 'react';
import {
  Building2,
  Compass,
  TrendingUp,
  BarChart3,
  Bot,
  Calculator,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  Play,
  Heart,
  Shield,
  LogOut,
  LogIn
} from 'lucide-react';
import type { User } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onResetDemo: () => void;
  isResetting: boolean;
  onRunAgents?: () => void;
  isRunningAgents?: boolean;
  currentUser: User | null;
  favoritesCount: number;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onResetDemo,
  isResetting,
  onRunAgents,
  isRunningAgents,
  currentUser,
  favoritesCount,
  onOpenAuth,
  onLogout
}) => {
  const navItems = [
    { id: 'overview', label: 'Dashboard & Map', icon: BarChart3 },
    { id: 'agents', label: 'Multi-Agent Workflow', icon: Bot },
    { id: 'estimator', label: 'Price Estimator', icon: Calculator },
    { id: 'properties', label: 'Properties', icon: Compass },
    { id: 'favorites', label: `My Favourites${favoritesCount > 0 ? ` (${favoritesCount})` : ''}`, icon: Heart, badge: favoritesCount > 0 },
    { id: 'admin', label: 'Admin Portal', icon: Shield, adminOnly: true },
    { id: 'trends', label: 'Trend Forecasts', icon: TrendingUp },
    { id: 'methodology', label: 'Methodology', icon: HelpCircle },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      {/* Top Demo Data Notice Banner */}
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong>RealEstateIQ Platform:</strong> Hyderabad micro-markets (Kokapet, Gachibowli, Miyapur, Kondapur, Tellapur, Manikonda) with CatBoost valuation, Holt smoothing, Apify live feed, and automated owner alerts.
          </span>
        </div>
        <button
          onClick={onResetDemo}
          disabled={isResetting}
          className="hover:underline flex items-center space-x-1 font-medium text-amber-300 ml-4 shrink-0"
        >
          <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting...' : 'Re-seed Demo Data'}</span>
        </button>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => setActiveTab('overview')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl tracking-tight text-white">RealEstateIQ</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Hyderabad
                </span>
              </div>
              <p className="text-xs text-slate-400">Cooperative Multi-Agent Intelligence</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex space-x-1 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-teal-300 border border-slate-700 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-400'} ${item.id === 'favorites' && favoritesCount > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center space-x-3 shrink-0">
            {/* Quick Action: Run Agent Analysis Button */}
            {onRunAgents && (
              <button
                onClick={onRunAgents}
                disabled={isRunningAgents}
                className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-white shadow-md transition-all ${
                  isRunningAgents
                    ? 'bg-slate-700 cursor-not-allowed opacity-75'
                    : 'bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 active:scale-95 shadow-teal-500/20'
                }`}
              >
                <Play className={`w-3 h-3 ${isRunningAgents ? 'animate-spin' : 'fill-white'}`} />
                <span>{isRunningAgents ? 'Running...' : 'Run Agents'}</span>
              </button>
            )}

            {/* Auth Section */}
            {currentUser ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div
                  onClick={() => {
                    if (currentUser.role === 'admin') setActiveTab('admin');
                    else setActiveTab('favorites');
                  }}
                  className="flex items-center space-x-2 cursor-pointer bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-700 transition-colors"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentUser.role === 'admin' ? 'bg-amber-500 text-slate-950' : 'bg-teal-500 text-slate-950'
                  }`}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-xs font-semibold text-white truncate max-w-[100px]">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{currentUser.role}</div>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-semibold shadow-sm transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav strip */}
      <div className="lg:hidden flex overflow-x-auto py-2 px-4 border-t border-slate-800/80 bg-slate-950/40 space-x-1 text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg whitespace-nowrap ${
                isActive ? 'bg-slate-800 text-teal-300 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
