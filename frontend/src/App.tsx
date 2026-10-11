import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MarketDashboard } from './components/MarketDashboard';
import { InteractiveMap } from './components/InteractiveMap';
import { PropertyListings } from './components/PropertyListings';
import { TrendCharts } from './components/TrendCharts';
import { MultiAgentWorkflow } from './components/MultiAgentWorkflow';
import { PriceEstimator } from './components/PriceEstimator';
import { Methodology } from './components/Methodology';
import { AuthModal } from './components/AuthModal';
import { PropertyDetailsModal } from './components/PropertyDetailsModal';
import { AdminDashboard } from './components/AdminDashboard';
import { FavoritesView } from './components/FavoritesView';

import {
  fetchLocalities,
  fetchProperties,
  fetchMarketSummary,
  fetchSupplyAnalysis,
  fetchDemandAnalysis,
  runAgentAnalysis,
  resetDemoDatabase,
  fetchFavoritePropertyIds,
  fetchFavorites,
  addFavoriteProperty,
  removeFavoriteProperty,
  fetchUserProfile
} from './services/api';

import type {
  Locality,
  Property,
  MarketSummary,
  SupplyAnalysis,
  DemandAnalysis,
  FilterState,
  AgentAnalysisResponse,
  User
} from './types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('realestateiq_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('realestateiq_token');
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Favorites State
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [favoriteProperties, setFavoriteProperties] = useState<Property[]>([]);

  // Property Details Modal State
  const [selectedPropertyModal, setSelectedPropertyModal] = useState<Property | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Core Data State
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [supply, setSupply] = useState<SupplyAnalysis | null>(null);
  const [demand, setDemand] = useState<DemandAnalysis | null>(null);
  const [agentData, setAgentData] = useState<AgentAnalysisResponse | null>(null);

  // Filter State
  const [selectedLocalityId, setSelectedLocalityId] = useState<number | null>(null);
  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  const [propertyType, setPropertyType] = useState<string>('all');
  const [filters, setFilters] = useState<FilterState>({
    property_type: 'all',
    listing_type: 'sale',
    sort_by: 'newest'
  });

  // Loading & Action State
  const [, setLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isRunningAgents, setIsRunningAgents] = useState<boolean>(false);

  // Selected property for price estimator
  const [selectedPropForEstimator, setSelectedPropForEstimator] = useState<Property | null>(null);

  // 1. Initial Load: Localities and Agent Data
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const locs = await fetchLocalities();
        setLocalities(locs);

        // Run multi-agent pipeline automatically to populate initial models and forecasts
        const agents = await runAgentAnalysis({
          budget_min: 6_000_000,
          budget_max: 25_000_000,
          risk_preference: 'balanced',
          property_type: 'all'
        });
        setAgentData(agents);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 2. Fetch User Profile & Favorites if token exists
  useEffect(() => {
    async function syncUserData() {
      if (!authToken) {
        setFavoriteIds([]);
        setFavoriteProperties([]);
        return;
      }
      try {
        const [me, favIds, favItems] = await Promise.all([
          fetchUserProfile(authToken).catch(() => null),
          fetchFavoritePropertyIds(authToken).catch(() => []),
          fetchFavorites(authToken).catch(() => [])
        ]);

        if (me) {
          setCurrentUser(me);
          localStorage.setItem('realestateiq_user', JSON.stringify(me));
        }
        setFavoriteIds(favIds);
        setFavoriteProperties(favItems.map((f: any) => f.property));
      } catch (err) {
        console.error('User sync error:', err);
      }
    }
    syncUserData();
  }, [authToken]);

  // 3. Fetch Market Dashboard Data whenever filters or locality changes
  useEffect(() => {
    async function loadDashboard() {
      try {
        const [sumRes, supRes, demRes] = await Promise.all([
          fetchMarketSummary(selectedLocalityId || undefined, listingType, propertyType),
          fetchSupplyAnalysis(selectedLocalityId || undefined, listingType),
          fetchDemandAnalysis(selectedLocalityId || undefined)
        ]);
        setSummary(sumRes);
        setSupply(supRes);
        setDemand(demRes);
      } catch (err) {
        console.error('Dashboard load error:', err);
      }
    }
    loadDashboard();
  }, [selectedLocalityId, listingType, propertyType]);

  // 4. Fetch Properties whenever filters change
  const reloadProperties = async () => {
    try {
      const currentFilters: FilterState = {
        ...filters,
        locality_id: selectedLocalityId || undefined,
        listing_type: listingType,
        property_type: propertyType
      };
      const res = await fetchProperties(currentFilters, 1, 60);
      setProperties(res.properties);
    } catch (err) {
      console.error('Properties load error:', err);
    }
  };

  useEffect(() => {
    reloadProperties();
  }, [selectedLocalityId, listingType, propertyType, filters]);

  // Auth Handlers
  const handleLoginSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    localStorage.setItem('realestateiq_user', JSON.stringify(user));
    localStorage.setItem('realestateiq_token', token);
    showToast(`Signed in as ${user.name} (${user.role.toUpperCase()})`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    setFavoriteIds([]);
    setFavoriteProperties([]);
    localStorage.removeItem('realestateiq_user');
    localStorage.removeItem('realestateiq_token');
    showToast('Signed out successfully', 'info');
  };

  // Toggle Favorite Handler (Features 3 & 4)
  const handleToggleFavorite = async (propertyId: number) => {
    if (!currentUser || !authToken) {
      setIsAuthModalOpen(true);
      return;
    }

    const isFav = favoriteIds.includes(propertyId);
    try {
      if (isFav) {
        await removeFavoriteProperty(propertyId, authToken);
        setFavoriteIds((prev) => prev.filter((id) => id !== propertyId));
        setFavoriteProperties((prev) => prev.filter((p) => p.id !== propertyId));
        showToast('Property removed from favourites', 'info');
      } else {
        const res = await addFavoriteProperty(propertyId, authToken);
        setFavoriteIds((prev) => [...prev, propertyId]);

        // Find the property and add to favoriteProperties
        const targetProp = properties.find((p) => p.id === propertyId);
        if (targetProp) {
          setFavoriteProperties((prev) => [targetProp, ...prev]);
        }

        // Show automated email notification confirmation
        showToast(
          res.message || 'Saved to favourites! Immediate notification email dispatched to property owner with your contact details.',
          'success'
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update favourite', 'error');
    }
  };

  // Google Maps Navigation Launcher (Feature 6)
  const handleNavigateGoogleMaps = (prop: Property) => {
    let destination = '';
    if (prop.latitude && prop.longitude) {
      destination = `${prop.latitude},${prop.longitude}`;
    } else if (prop.address) {
      destination = prop.address;
    } else {
      destination = `${prop.title}, ${prop.locality_name || 'Hyderabad'}, Telangana, India`;
    }

    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(navUrl, '_blank', 'noopener,noreferrer');
  };

  // Handle Locality Selection
  const handleSelectLocality = (locId: number | null) => {
    setSelectedLocalityId(locId);
    setFilters((prev) => ({ ...prev, locality_id: locId || undefined }));
  };

  // Trigger Multi-Agent Pipeline
  const handleRunAgents = async (params?: { budget_min: number; budget_max: number; risk_preference: string }) => {
    try {
      setIsRunningAgents(true);
      const res = await runAgentAnalysis(params || {
        budget_min: 6_000_000,
        budget_max: 25_000_000,
        risk_preference: 'balanced',
        property_type: propertyType
      });
      setAgentData(res);
      showToast('Multi-agent analysis completed: CatBoost models, trend forecasts and flags updated!', 'success');
      reloadProperties();
    } catch (err) {
      console.error('Error running agent analysis:', err);
      showToast('Agent run failed', 'error');
    } finally {
      setIsRunningAgents(false);
    }
  };

  // Re-seed Database
  const handleResetDemo = async () => {
    try {
      setIsResetting(true);
      await resetDemoDatabase();
      const locs = await fetchLocalities();
      setLocalities(locs);
      setSelectedLocalityId(null);
      await handleRunAgents();
      showToast('Database successfully re-seeded with official Hyderabad records!', 'success');
    } catch (err) {
      console.error('Error resetting demo database:', err);
      showToast('Error resetting database', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const selectedLocalityObj = localities.find((l) => l.id === selectedLocalityId);
  const selectedLocalityName = selectedLocalityObj ? selectedLocalityObj.name : 'All Hyderabad Localities';

  // Build locality metrics map for interactive map
  const localityMetricsMap: Record<string, any> = {};
  if (agentData?.agent_outputs?.trend_agent?.forecasts) {
    Object.entries(agentData.agent_outputs.trend_agent.forecasts).forEach(([name, data]: [string, any]) => {
      const hist = data.historical || [];
      const latestPrice = hist.length > 0 ? hist[hist.length - 1].median_price_per_sqft : 8000;
      const score = agentData.agent_outputs.trend_agent.activity_scores?.[name]?.score || 75;
      localityMetricsMap[name] = {
        pricePerSqft: latestPrice,
        activityScore: score
      };
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Toast Notification Alert */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-md animate-fade-in shadow-2xl">
          <div
            className={`p-3.5 rounded-xl border flex items-start space-x-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200 shadow-rose-950/50'
                : 'bg-slate-900/95 border-slate-700 text-teal-200 shadow-slate-950/50'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs leading-relaxed font-medium">{toast.message}</div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-0.5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
        onRunAgents={() => {
          setActiveTab('agents');
          handleRunAgents();
        }}
        isRunningAgents={isRunningAgents}
        currentUser={currentUser}
        favoritesCount={favoriteIds.length}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* TAB 1: OVERVIEW (MARKET DASHBOARD + INTERACTIVE MAP) */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Interactive Map */}
            <InteractiveMap
              localities={localities}
              selectedLocalityId={selectedLocalityId}
              onSelectLocality={handleSelectLocality}
              localityMetrics={localityMetricsMap}
              properties={properties}
              onSelectProperty={(p) => setSelectedPropertyModal(p)}
              onNavigateGoogleMaps={handleNavigateGoogleMaps}
            />

            {/* Market Dashboard Metrics */}
            <MarketDashboard
              summary={summary}
              supply={supply}
              demand={demand}
              listingType={listingType}
              setListingType={setListingType}
              propertyType={propertyType}
              setPropertyType={setPropertyType}
              selectedLocalityName={selectedLocalityName}
            />

            {/* Quick Preview of Property Listings */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">
                  Featured Properties in {selectedLocalityName}
                </h3>
                <button
                  onClick={() => setActiveTab('properties')}
                  className="text-xs font-semibold text-teal-400 hover:text-teal-300 hover:underline"
                >
                  View All Listings & Outliers →
                </button>
              </div>
              <PropertyListings
                properties={properties.slice(0, 6)}
                localities={localities}
                filters={filters}
                setFilters={setFilters}
                onEstimateProperty={(p) => {
                  setSelectedPropForEstimator(p);
                  setActiveTab('estimator');
                }}
                onSelectProperty={(p) => setSelectedPropertyModal(p)}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-AGENT WORKFLOW */}
        {activeTab === 'agents' && (
          <div className="animate-in fade-in duration-300">
            <MultiAgentWorkflow
              agentData={agentData}
              isRunning={isRunningAgents}
              onRunAgents={handleRunAgents}
            />
          </div>
        )}

        {/* TAB 3: PRICE ESTIMATOR */}
        {activeTab === 'estimator' && (
          <div className="animate-in fade-in duration-300">
            <PriceEstimator
              localities={localities}
              initialLocality={selectedPropForEstimator?.locality_name || 'Kokapet'}
              initialType={selectedPropForEstimator?.property_type || 'apartment'}
              initialArea={selectedPropForEstimator?.area_sqft || 1850}
              initialBeds={selectedPropForEstimator?.bedrooms || 3}
            />
          </div>
        )}

        {/* TAB 4: PROPERTY LISTINGS (FEATURE 2) */}
        {activeTab === 'properties' && (
          <div className="animate-in fade-in duration-300">
            <PropertyListings
              properties={properties}
              localities={localities}
              filters={filters}
              setFilters={setFilters}
              onEstimateProperty={(p) => {
                setSelectedPropForEstimator(p);
                setActiveTab('estimator');
              }}
              onSelectProperty={(p) => setSelectedPropertyModal(p)}
              favoriteIds={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 5: MY FAVOURITES (FEATURE 3 & 4) */}
        {activeTab === 'favorites' && (
          <div className="animate-in fade-in duration-300">
            <FavoritesView
              favorites={favoriteProperties}
              currentUser={currentUser}
              onRemoveFavorite={handleToggleFavorite}
              onSelectProperty={(p) => setSelectedPropertyModal(p)}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onNavigateGoogleMaps={handleNavigateGoogleMaps}
            />
          </div>
        )}

        {/* TAB 6: ADMIN DASHBOARD (FEATURE 1 & 5) */}
        {activeTab === 'admin' && (
          <div className="animate-in fade-in duration-300">
            <AdminDashboard
              currentUser={currentUser}
              authToken={authToken}
              localities={localities}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onRefreshData={() => {
                reloadProperties();
                handleRunAgents();
              }}
              onShowToast={showToast}
            />
          </div>
        )}

        {/* TAB 7: TREND CHARTS */}
        {activeTab === 'trends' && (
          <div className="animate-in fade-in duration-300">
            <TrendCharts
              localities={localities}
              selectedLocalityName={selectedLocalityObj?.name || 'Kokapet'}
              forecastData={agentData?.agent_outputs?.trend_agent?.forecasts || {}}
            />
          </div>
        )}

        {/* TAB 8: METHODOLOGY */}
        {activeTab === 'methodology' && (
          <div className="animate-in fade-in duration-300">
            <Methodology />
          </div>
        )}
      </main>

      {/* Property Details Modal (Features 2, 4, 6) */}
      <PropertyDetailsModal
        property={selectedPropertyModal}
        isOpen={Boolean(selectedPropertyModal)}
        onClose={() => setSelectedPropertyModal(null)}
        isFavorited={selectedPropertyModal ? favoriteIds.includes(selectedPropertyModal.id) : false}
        onToggleFavorite={handleToggleFavorite}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Auth Modal (Features 1 & 2) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />


      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-4">
          <div>
            <span className="font-bold text-white">RealEstateIQ Hyderabad Platform</span> • Multi-Agent Intelligence Prototype
          </div>
          <div className="flex flex-wrap space-x-6 text-slate-400">
            <span>CatBoost Regressor</span>
            <span>Holt Damped Smoothing</span>
            <span>Isolation Forest</span>
            <span>Apify Live Feed</span>
            <span>Google Maps GPS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
