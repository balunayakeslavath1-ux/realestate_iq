import React, { useState } from 'react';
import {
  Search,
  Building,
  Bed,
  Maximize2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Heart,
  Navigation
} from 'lucide-react';
import type { Property, FilterState, Locality, User } from '../types';

interface PropertyListingsProps {
  properties: Property[];
  localities: Locality[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onEstimateProperty?: (prop: Property) => void;
  onSelectProperty?: (prop: Property) => void;
  favoriteIds?: number[];
  onToggleFavorite?: (propertyId: number) => void;
  currentUser?: User | null;
  onOpenAuth?: () => void;
}

export const PropertyListings: React.FC<PropertyListingsProps> = ({
  properties,
  localities,
  filters,
  setFilters,
  onEstimateProperty,
  onSelectProperty,
  favoriteIds = [],
  onToggleFavorite,
  currentUser,
  onOpenAuth
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatPrice = (val: number, isRent: boolean) => {
    if (!val) return '—';
    if (isRent) return `₹${Math.round(val).toLocaleString()}/mo`;
    if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
    return `₹${(val / 100_000).toFixed(1)} L`;
  };

  // Filter properties client-side based on search term
  const filtered = properties.filter((p) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(term);
      const matchLoc = (p.locality_name || '').toLowerCase().includes(term);
      const matchType = p.property_type.toLowerCase().includes(term);
      const matchAddr = (p.address || '').toLowerCase().includes(term);
      if (!matchTitle && !matchLoc && !matchType && !matchAddr) return false;
    }
    return true;
  });

  const handleHeartClick = (e: React.MouseEvent, propId: number) => {
    e.stopPropagation();
    if (!currentUser && onOpenAuth) {
      onOpenAuth();
      return;
    }
    if (onToggleFavorite) {
      onToggleFavorite(propId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search listings, e.g. '3 BHK Kokapet', 'Villa', or 'Aparna'..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-800 border border-slate-700 text-white rounded-xl placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Locality Selector */}
          <select
            value={filters.locality_id || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                locality_id: e.target.value ? Number(e.target.value) : undefined
              }))
            }
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Localities</option>
            {localities.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          {/* Property Type */}
          <select
            value={filters.property_type}
            onChange={(e) => setFilters((prev) => ({ ...prev, property_type: e.target.value }))}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Types</option>
            <option value="apartment">Apartments</option>
            <option value="villa">Villas</option>
            <option value="independent house">Independent Houses</option>
            <option value="plot">Plots</option>
          </select>

          {/* Listing Type: Sale vs Rent */}
          <select
            value={filters.listing_type || 'all'}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                listing_type: e.target.value === 'all' ? undefined : (e.target.value as 'sale' | 'rent')
              }))
            }
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Sale & Rent</option>
            <option value="sale">For Sale</option>
            <option value="rent">For Rent</option>
          </select>

          {/* Bedrooms */}
          <select
            value={filters.bedrooms || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                bedrooms: e.target.value ? Number(e.target.value) : undefined
              }))
            }
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">Any Bedrooms</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
            <option value="4">4+ BHK</option>
          </select>

          {/* Sort By */}
          <select
            value={filters.sort_by}
            onChange={(e) => setFilters((prev) => ({ ...prev, sort_by: e.target.value }))}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="price_sqft_asc">Price/SqFt: Low to High</option>
            <option value="size_desc">Area: Largest First</option>
          </select>
        </div>
      </div>

      {/* Listing Counter and Notice */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{filtered.length}</strong> available property records in Hyderabad
        </span>
        <span className="flex items-center space-x-1.5 text-teal-400 font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Click card to inspect full details, amenities & Google Maps</span>
        </span>
      </div>

      {/* Properties Grid */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center text-slate-400">
          <Building className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="font-semibold text-slate-300">No properties match your active filters.</p>
          <p className="text-xs mt-1">Try resetting your search query or selecting "All Localities".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((prop) => {
            const isRent = prop.listing_type === 'rent';
            const isSuspicious = prop.is_suspicious;
            const isFav = favoriteIds.includes(prop.id);

            return (
              <div
                key={prop.id}
                onClick={() => onSelectProperty && onSelectProperty(prop)}
                className={`bg-slate-900 rounded-2xl border transition-all duration-300 shadow-md hover:shadow-xl flex flex-col overflow-hidden group cursor-pointer ${
                  isSuspicious
                    ? 'border-amber-500/40 hover:border-amber-400'
                    : 'border-slate-800 hover:border-teal-500/50'
                }`}
              >
                {/* Image / Header Banner */}
                <div className="relative h-44 bg-slate-950 overflow-hidden">
                  <img
                    src={
                      prop.image_url ||
                      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'
                    }
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                  {/* Top Badges & Heart Save Button (Feature 3 & 4) */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-slate-950/80 text-white backdrop-blur-md border border-slate-700">
                      {prop.property_type}
                    </span>

                    <div className="flex items-center space-x-2">
                      {isSuspicious ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center space-x-1 shadow-md">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Flagged</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white flex items-center space-x-1 backdrop-blur-md">
                          <CheckCircle className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      )}

                      {/* Heart Save Button */}
                      <button
                        onClick={(e) => handleHeartClick(e, prop.id)}
                        className={`p-1.5 rounded-full border shadow-lg backdrop-blur-md transition-transform active:scale-90 ${
                          isFav
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                            : 'bg-slate-950/80 border-slate-700/60 text-slate-300 hover:text-rose-400'
                        }`}
                        title={isFav ? 'Saved in favourites' : 'Save to favourites (notifies owner)'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Price on Image */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                    <div>
                      <div className="text-xl font-black tracking-tight text-teal-300 drop-shadow-md">
                        {formatPrice(prop.price, isRent)}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        ₹{Math.round(prop.price_per_sqft).toLocaleString()}/sqft
                      </div>
                    </div>
                    <div className="text-[11px] font-medium bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700 text-slate-200">
                      {prop.locality_name || `Locality #${prop.locality_id}`}
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-teal-300 transition-colors">
                      {prop.title}
                    </h3>

                    {/* Features Strip */}
                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex items-center space-x-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>{prop.area_sqft} sqft</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Bed className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{prop.bedrooms ? `${prop.bedrooms} BHK` : 'Plot'}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{prop.age || 2} yrs</span>
                      </div>
                    </div>

                    {/* Suspicious Warning Note (from Isolation Forest) */}
                    {isSuspicious && (
                      <div className="mt-2.5 p-2 bg-amber-500/10 rounded-lg border border-amber-500/30 text-[11px] text-amber-300 flex items-start space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Flagged by Quality Agent:</strong>{' '}
                          {prop.suspicious_reason || 'Unusual price-to-size deviation.'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Strip */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {prop.address ? prop.address.split(',')[0] : `ID: ${prop.external_id || prop.id}`}
                    </span>
                    <div className="flex items-center space-x-3">
                      {onEstimateProperty && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEstimateProperty(prop);
                          }}
                          className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center space-x-1"
                          title="Evaluate with CatBoost model"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Valuation</span>
                        </button>
                      )}
                      <span className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
                        <span>Details</span>
                        <Navigation className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
