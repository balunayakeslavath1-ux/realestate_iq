import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  PlusCircle,
  RefreshCw,
  Edit3,
  Trash2,
  Power,
  Globe,
  Bell,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Building,
  User as UserIcon,
  Phone,
  Mail,
  Send,
  Smartphone,
  Key,
  ExternalLink,
  Sliders
} from 'lucide-react';
import type { Property, Locality, User, NotificationLog } from '../types';
import {
  fetchProperties,
  adminCreateProperty,
  adminUpdateProperty,
  adminDeleteProperty,
  adminTogglePropertyStatus,
  syncApifyLiveFeed,
  fetchNotificationLogs,
  fetchSmtpSettings,
  updateSmtpSettings,
  sendTestEmailToPhone
} from '../services/api';

interface AdminDashboardProps {
  currentUser: User | null;
  authToken: string | null;
  localities: Locality[];
  onOpenAuth: () => void;
  onRefreshData: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  authToken,
  localities,
  onRefreshData,
  onOpenAuth,
  onShowToast
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocality, setSelectedLocality] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'listings' | 'apify' | 'notifications'>('listings');

  // Modals & Logs state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [apifyLoading, setApifyLoading] = useState(false);
  const [apifyStatus, setApifyStatus] = useState<any>(null);

  // SMTP Settings state
  const [smtpSettings, setSmtpSettings] = useState<any>(null);
  const [, setSmtpLoading] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [testEmailTarget, setTestEmailTarget] = useState('rahulphotos806@gmail.com');
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  const [smtpForm, setSmtpForm] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from: 'alerts@realestateiq.com',
    smtp_use_tls: true
  });

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    locality_id: localities[0]?.id || 1,
    property_type: 'apartment',
    listing_type: 'sale',
    price: 15000000,
    area_sqft: 1800,
    bedrooms: 3,
    address: '',
    image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80',
    owner_name: 'PropScope Partner',
    owner_email: 'owner@realestateiq.com',
    owner_phone: '+91 98765 43210',
    amenities: 'Gym, Swimming Pool, Clubhouse, 24/7 Security'
  });

  const isAdmin = currentUser?.role === 'admin';

  const loadAdminProperties = async () => {
    setLoading(true);
    try {
      const res = await fetchProperties({ property_type: 'all', sort_by: 'newest' }, 1, 100);
      setProperties(res.properties);
    } catch (err: any) {
      onShowToast('Failed to load listings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async (showSpinner = false) => {
    if (!authToken) return;
    if (showSpinner) setIsRefreshingLogs(true);
    try {
      const logs = await fetchNotificationLogs(authToken);
      setNotifications(logs);
    } catch (err) {
      console.error(err);
    } finally {
      if (showSpinner) setIsRefreshingLogs(false);
    }
  };

  const loadSmtpSettings = async () => {
    if (!authToken) return;
    setSmtpLoading(true);
    try {
      const cfg = await fetchSmtpSettings(authToken);
      setSmtpSettings(cfg);
      setSmtpForm((prev) => ({
        ...prev,
        smtp_host: cfg.smtp_host || 'smtp.gmail.com',
        smtp_port: cfg.smtp_port || 587,
        smtp_user: cfg.smtp_user || '',
        smtp_from: cfg.smtp_from || 'alerts@realestateiq.com',
        smtp_use_tls: cfg.smtp_use_tls ?? true
      }));
    } catch (err) {
      console.error('Failed to load SMTP settings:', err);
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setSmtpSaving(true);
    try {
      const res = await updateSmtpSettings(smtpForm, authToken);
      setSmtpSettings(res);
      onShowToast('SMTP configuration saved and activated for smartphone delivery!', 'success');
      setShowSmtpConfig(false);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save SMTP settings', 'error');
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleSendTestAlert = async () => {
    if (!authToken || !testEmailTarget.trim()) return;
    setTestSending(true);
    setTestFeedback(null);
    try {
      const res = await sendTestEmailToPhone(testEmailTarget.trim(), authToken);
      const isFailed = res.delivery_result?.status === 'auth_failed' || res.delivery_result?.status === 'smtp_error';
      setTestFeedback({
        message: res.message || 'Dispatched alert',
        isError: isFailed
      });
      if (isFailed) {
        onShowToast(res.message, 'error');
      } else {
        onShowToast(`Lead alert dispatched to ${testEmailTarget.trim()}!`, 'success');
      }
      loadNotifications(false);
    } catch (err: any) {
      setTestFeedback({
        message: err.message || 'Failed to send test alert',
        isError: true
      });
      onShowToast(err.message, 'error');
    } finally {
      setTestSending(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminProperties();
      loadNotifications(false);
    }
  }, [isAdmin, authToken]);

  // Real-time polling & auto-fetch when viewing notifications tab
  useEffect(() => {
    if (isAdmin && activeSubTab === 'notifications') {
      loadNotifications(false);
      loadSmtpSettings();
      const interval = setInterval(() => {
        loadNotifications(false);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, activeSubTab, authToken]);

  if (!currentUser || !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Administrator Access Required</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          This portal allows managing live property listings, editing prices, managing owner records, and syncing Apify feeds. Please authenticate with administrator credentials.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-semibold text-sm shadow-lg shadow-amber-500/20 transition-all"
        >
          Sign In as Administrator
        </button>
      </div>
    );
  }

  // Handle Create Property
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    try {
      await adminCreateProperty(
        {
          ...formData,
          listing_date: new Date().toISOString().split('T')[0]
        },
        authToken
      );
      onShowToast(`Property '${formData.title}' added successfully!`, 'success');
      setIsCreateOpen(false);
      loadAdminProperties();
      onRefreshData();
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  // Handle Edit Property
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !editingProperty) return;
    try {
      await adminUpdateProperty(
        editingProperty.id,
        {
          title: editingProperty.title,
          price: editingProperty.price,
          area_sqft: editingProperty.area_sqft,
          bedrooms: editingProperty.bedrooms,
          address: editingProperty.address,
          image_url: editingProperty.image_url,
          owner_name: editingProperty.owner_name,
          owner_email: editingProperty.owner_email,
          owner_phone: editingProperty.owner_phone,
          amenities: editingProperty.amenities
        },
        authToken
      );
      onShowToast('Property updated successfully!', 'success');
      setEditingProperty(null);
      loadAdminProperties();
      onRefreshData();
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  // Handle Delete
  const handleDelete = async (id: number, title: string) => {
    if (!authToken) return;
    if (!window.confirm(`Are you sure you want to permanently delete '${title}'?`)) return;
    try {
      await adminDeleteProperty(id, authToken);
      onShowToast(`Listing deleted successfully`, 'success');
      loadAdminProperties();
      onRefreshData();
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  // Handle Toggle Status
  const handleToggle = async (id: number) => {
    if (!authToken) return;
    try {
      const updated = await adminTogglePropertyStatus(id, authToken);
      onShowToast(`Listing marked as ${updated.status}`, 'info');
      loadAdminProperties();
      onRefreshData();
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  // Handle Apify Live Sync (Feature 5)
  const handleApifySync = async () => {
    setApifyLoading(true);
    try {
      const res = await syncApifyLiveFeed({ limit: 20 });
      setApifyStatus(res);
      onShowToast(res.message, 'success');
      loadAdminProperties();
      onRefreshData();
    } catch (err: any) {
      onShowToast(err.message || 'Apify sync failed', 'error');
    } finally {
      setApifyLoading(false);
    }
  };

  const filteredProperties = properties.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.address && p.address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocality = selectedLocality === 'all' || p.locality_name?.toLowerCase() === selectedLocality.toLowerCase();
    return matchesSearch && matchesLocality;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Admin Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Admin Portal
            </span>
            <h1 className="text-2xl font-bold text-white">Property Management Console</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as {currentUser.name} ({currentUser.email}). Manage real estate inventory, prices, and live data ingestion.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Flat</span>
          </button>

          <button
            onClick={handleApifySync}
            disabled={apifyLoading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 active:scale-95 transition-all ${
              apifyLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <Globe className={`w-4 h-4 ${apifyLoading ? 'animate-spin' : ''}`} />
            <span>{apifyLoading ? 'Syncing Apify...' : 'Sync Live Apify Feed'}</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveSubTab('listings')}
          className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeSubTab === 'listings'
              ? 'text-teal-300 border-teal-500 bg-slate-800/40'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Inventory ({properties.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('apify')}
          className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeSubTab === 'apify'
              ? 'text-teal-300 border-teal-500 bg-slate-800/40'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Apify Ingestion Status</span>
        </button>

        <button
          onClick={() => setActiveSubTab('notifications')}
          className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeSubTab === 'notifications'
              ? 'text-teal-300 border-teal-500 bg-slate-800/40'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Owner Notifications Log ({notifications.length})</span>
        </button>
      </div>

      {/* 1. LISTINGS SUB-TAB */}
      {activeSubTab === 'listings' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search flat title or address..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedLocality}
                onChange={(e) => setSelectedLocality(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500"
              >
                <option value="all">All Localities</option>
                {localities.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Locality</th>
                    <th className="py-3 px-4">BHK / Area</th>
                    <th className="py-3 px-4">Asking Price</th>
                    <th className="py-3 px-4">Owner / Contact</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredProperties.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={p.image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=100&q=80'}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover bg-slate-800 shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-white">{p.title}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.address}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-teal-300">{p.locality_name}</td>
                      <td className="py-3 px-4">
                        <div>{p.bedrooms || 0} BHK</div>
                        <div className="text-[11px] text-slate-400">{p.area_sqft} sq.ft</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        ₹{(p.price / 10000000).toFixed(2)} Cr
                      </td>
                      <td className="py-3 px-4">
                        <div>{p.owner_name}</div>
                        <div className="text-[10px] text-slate-400">{p.owner_email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleToggle(p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                            title="Toggle active status"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingProperty(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-colors"
                            title="Edit flat details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete listing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProperties.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        No properties found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. APIFY INGESTION SUB-TAB */}
      {activeSubTab === 'apify' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Apify Live Property Data Ingestion</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Replace simulated datasets with live web-scraped listings using the Apify API. The backend automatically extracts BHK, super built-up area, asking price, locality coordinates, photos, and address.
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              Live Token Active
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Target Markets:</span>
              <span className="text-slate-200">Kokapet, Gachibowli, Miyapur, Kondapur, Tellapur, Manikonda</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Scraper Pipeline:</span>
              <span className="text-teal-300">Apify REST Service → ML Sanitizer → SQLite/Postgres DB</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Secure Backend Token:</span>
              <span className="text-slate-400 font-mono">apify_api_wVwf... (Private Config)</span>
            </div>
          </div>

          {apifyStatus && (
            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs space-y-1">
              <div className="font-semibold flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>{apifyStatus.message}</span>
              </div>
              <div className="text-slate-400">
                Fetched {apifyStatus.records_fetched} records ({apifyStatus.records_imported} imported, {apifyStatus.records_updated} updated).
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleApifySync}
              disabled={apifyLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-medium text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 active:scale-95 transition-all flex items-center space-x-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${apifyLoading ? 'animate-spin' : ''}`} />
              <span>{apifyLoading ? 'Ingesting Scraper Feed...' : 'Trigger Live Sync Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. NOTIFICATIONS SUB-TAB */}
      {activeSubTab === 'notifications' && (
        <div className="space-y-6">
          {/* SMTP & Smartphone Delivery Configuration Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5 text-teal-400" />
                  <h3 className="text-lg font-semibold text-white">Owner Smartphone Email Delivery (SMTP)</h3>
                  {smtpSettings?.is_configured ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Live SMTP Active</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Mock Delivery Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  When a buyer likes or adds a property to favourites, RealEstateIQ sends a rich mobile lead alert to the owner's smartphone (e.g. <strong>rahulphotos806@gmail.com</strong>). Configure your Gmail App Password below to deliver live emails directly across the internet.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSmtpConfig(!showSmtpConfig)}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all self-start sm:self-auto"
              >
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                <span>{showSmtpConfig ? 'Hide SMTP Settings' : 'Configure SMTP Credentials'}</span>
              </button>
            </div>

            {/* Quick Test Alert to Smartphone */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                <Send className="w-3.5 h-3.5 text-teal-400" />
                <span>Test Smartphone Email Ping</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={testEmailTarget}
                    onChange={(e) => setTestEmailTarget(e.target.value)}
                    placeholder="Enter owner's smartphone email (e.g. rahulphotos806@gmail.com)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendTestAlert}
                  disabled={testSending || !testEmailTarget.trim()}
                  className={`px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-teal-500/20 ${
                    testSending ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  <Send className={`w-3.5 h-3.5 ${testSending ? 'animate-spin' : ''}`} />
                  <span>{testSending ? 'Sending Alert...' : 'Send Test Alert to Phone'}</span>
                </button>
              </div>

              {testFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start space-x-2 border ${
                    testFeedback.isError
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  {testFeedback.isError ? (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                  )}
                  <span>{testFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Expandable SMTP Settings Form */}
            {showSmtpConfig && (
              <form onSubmit={handleSaveSmtp} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4 animate-fade-in">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                  <Key className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-semibold text-white">SMTP Email Gateway Settings</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">SMTP Server Host</label>
                    <input
                      type="text"
                      required
                      value={smtpForm.smtp_host}
                      onChange={(e) => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                      placeholder="e.g. smtp.gmail.com"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">SMTP Port</label>
                    <input
                      type="number"
                      required
                      value={smtpForm.smtp_port}
                      onChange={(e) => setSmtpForm({ ...smtpForm, smtp_port: Number(e.target.value) })}
                      placeholder="587 (TLS) or 465 (SSL)"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Sender Email / Username</label>
                    <input
                      type="email"
                      required
                      value={smtpForm.smtp_user}
                      onChange={(e) => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">SMTP Password / Google App Password</label>
                    <input
                      type="password"
                      required
                      value={smtpForm.smtp_password}
                      onChange={(e) => setSmtpForm({ ...smtpForm, smtp_password: e.target.value })}
                      placeholder="16-character Google App Password"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-300 space-y-1">
                  <div className="font-semibold">💡 Gmail Smartphone Dispatch Guide:</div>
                  <div>1. Go to your Google Account &gt; <strong>Security</strong> &gt; <strong>2-Step Verification</strong>.</div>
                  <div>2. Scroll to <strong>App passwords</strong> and generate a password for &quot;Mail&quot;.</div>
                  <div>3. Paste the 16-character App Password here and click Save. All like events will deliver real emails to owners&apos; phones!</div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSmtpConfig(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={smtpSaving}
                    className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center space-x-1"
                  >
                    <span>{smtpSaving ? 'Saving...' : 'Save & Activate SMTP'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Audit Log Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-white">Automated Owner Notification Audit Log</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {notifications.length} Logs
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Every time a user likes a flat, an automated lead alert is triggered and logged here. Polling live every 3 seconds.
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadNotifications(true)}
                disabled={isRefreshingLogs}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
                <span>{isRefreshingLogs ? 'Refreshing...' : 'Refresh Logs'}</span>
              </button>
            </div>

            <div className="space-y-3">
              {notifications.map((notif) => {
                const isSmtpDelivered = notif.status === 'delivered_smtp' || notif.status?.includes('smtp');
                const isFailed = notif.status === 'auth_failed' || notif.status === 'smtp_error' || notif.status?.includes('fail');
                const cleanPhone = notif.user_phone ? notif.user_phone.replace(/[^0-9]/g, '') : '';
                const mailtoHref = `mailto:${notif.owner_email}?subject=${encodeURIComponent(notif.subject)}&body=${encodeURIComponent(notif.message)}`;

                return (
                  <div
                    key={notif.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="font-semibold text-teal-300 text-sm flex items-center space-x-2">
                        <span>{notif.subject}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isSmtpDelivered ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            📱 Phone Delivered (SMTP)
                          </span>
                        ) : isFailed ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            ⚠️ Delivery Error
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            📋 Recorded Log (Mock)
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.sent_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-slate-300">
                      <div className="flex items-center space-x-1">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>Buyer: <strong>{notif.user_name}</strong> ({notif.user_email})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Phone: <strong>{notif.user_phone || 'Withheld by buyer'}</strong></span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>Owner: <strong>{notif.owner_name}</strong> &lt;{notif.owner_email}&gt;</span>
                      </div>
                    </div>

                    {/* Smartphone Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60">
                      <a
                        href={mailtoHref}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-[11px] font-medium transition-colors"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Open in Phone Mail App</span>
                      </a>

                      {cleanPhone && (
                        <>
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi, regarding your interest in property on RealEstateIQ...`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>WhatsApp Buyer</span>
                          </a>

                          <a
                            href={`tel:${cleanPhone}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call Buyer</span>
                          </a>
                        </>
                      )}
                    </div>

                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                      {notif.message}
                    </div>
                  </div>
                );
              })}

              {notifications.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No owner notifications sent yet. Once users save properties to favourites, dispatch logs will appear here.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE PROPERTY MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl my-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-semibold text-white">Add New Flat to Locality</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Property Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. My Home Tarkshya 3BHK"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Locality</label>
                  <select
                    value={formData.locality_id}
                    onChange={(e) => setFormData({ ...formData, locality_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    {localities.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Bedrooms (BHK)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Asking Price (INR)</label>
                  <input
                    type="number"
                    min="100000"
                    step="50000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Area (sq.ft)</label>
                  <input
                    type="number"
                    min="100"
                    value={formData.area_sqft}
                    onChange={(e) => setFormData({ ...formData, area_sqft: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Address for Navigation & Map</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Near Outer Ring Road, Gachibowli, Hyderabad"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Photo Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Owner Email</label>
                  <input
                    type="email"
                    value={formData.owner_email}
                    onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Owner Phone</label>
                  <input
                    type="tel"
                    value={formData.owner_phone}
                    onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Amenities</label>
                <input
                  type="text"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold"
                >
                  Add Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROPERTY MODAL */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl my-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-semibold text-white">Edit Property #{editingProperty.id}</h3>
              <button onClick={() => setEditingProperty(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Property Title</label>
                <input
                  type="text"
                  required
                  value={editingProperty.title}
                  onChange={(e) => setEditingProperty({ ...editingProperty, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Asking Price (INR)</label>
                  <input
                    type="number"
                    value={editingProperty.price}
                    onChange={(e) => setEditingProperty({ ...editingProperty, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Area (sq.ft)</label>
                  <input
                    type="number"
                    value={editingProperty.area_sqft}
                    onChange={(e) => setEditingProperty({ ...editingProperty, area_sqft: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Bedrooms (BHK)</label>
                  <input
                    type="number"
                    value={editingProperty.bedrooms || 0}
                    onChange={(e) => setEditingProperty({ ...editingProperty, bedrooms: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Address</label>
                  <input
                    type="text"
                    value={editingProperty.address || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={editingProperty.owner_name || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, owner_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Owner Email</label>
                  <input
                    type="email"
                    value={editingProperty.owner_email || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, owner_email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Owner Phone</label>
                  <input
                    type="tel"
                    value={editingProperty.owner_phone || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, owner_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
