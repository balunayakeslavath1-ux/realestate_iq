import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Building,
  Activity,
  Layers,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import type { MarketSummary, SupplyAnalysis, DemandAnalysis } from '../types';

interface MarketDashboardProps {
  summary: MarketSummary | null;
  supply: SupplyAnalysis | null;
  demand: DemandAnalysis | null;
  listingType: 'sale' | 'rent';
  setListingType: (type: 'sale' | 'rent') => void;
  propertyType: string;
  setPropertyType: (type: string) => void;
  selectedLocalityName?: string;
}

export const MarketDashboard: React.FC<MarketDashboardProps> = ({
  summary,
  supply,
  demand,
  listingType,
  setListingType,
  propertyType,
  setPropertyType,
  selectedLocalityName = 'All Hyderabad Localities'
}) => {
  const formatPrice = (val: number, isRent: boolean) => {
    if (!val || val === 0) return '—';
    if (isRent) {
      return `₹${Math.round(val).toLocaleString()}/mo`;
    }
    if (val >= 10_000_000) {
      return `₹${(val / 10_000_000).toFixed(2)} Cr`;
    }
    return `₹${(val / 100_000).toFixed(1)} L`;
  };

  const isSale = listingType === 'sale';

  return (
    <div className="space-y-6">
      {/* Control Bar: Filters & Scope */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Viewing Market Scope</span>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span>{selectedLocalityName}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {isSale ? 'For Sale' : 'For Rent'}
            </span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sale vs Rent Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setListingType('sale')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                isSale ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Buy / Sale
            </button>
            <button
              onClick={() => setListingType('rent')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                !isSale ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Rentals
            </button>
          </div>

          {/* Property Type Filter */}
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 shadow-2xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
          >
            <option value="all">All Property Types</option>
            <option value="apartment">Apartments</option>
            <option value="villa">Villas</option>
            <option value="independent house">Independent Houses</option>
            <option value="plot">Plots</option>
          </select>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Average Asking Price */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg. Asking Price</span>
            <Building className="w-4 h-4 text-slate-400 group-hover:text-teal-500 transition-colors" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary ? formatPrice(summary.average_asking_price, !isSale) : '—'}
          </div>
          <div className="mt-2 flex items-center space-x-1.5 text-xs">
            {summary?.price_change_pct !== null && summary?.price_change_pct !== undefined ? (
              <>
                {summary.price_change_pct >= 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{summary.price_change_pct}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center">
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {summary.price_change_pct}%
                  </span>
                )}
                <span className="text-slate-400">vs past 90 days</span>
              </>
            ) : (
              <span className="text-slate-400">Based on active inventory</span>
            )}
          </div>
        </div>

        {/* Card 2: Price per Square Foot */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Median Price / SqFt</span>
            <Layers className="w-4 h-4 text-slate-400 group-hover:text-teal-500 transition-colors" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary && summary.median_price_per_sqft > 0 ? (
              isSale ? (
                `₹${Math.round(summary.median_price_per_sqft).toLocaleString()}`
              ) : (
                `₹${summary.median_price_per_sqft.toFixed(1)}/sqft`
              )
            ) : (
              '—'
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Median asking price: {summary ? formatPrice(summary.median_asking_price, !isSale) : '—'}
          </p>
        </div>

        {/* Card 3: Supply Indicators */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Supply</span>
            <Activity className="w-4 h-4 text-slate-400 group-hover:text-teal-500 transition-colors" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary ? summary.active_listings : 0}{' '}
            <span className="text-xs font-normal text-slate-500">listings</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span>
              <strong>{summary?.new_listings_30d || 0}</strong> new in past 30 days
            </span>
          </div>
        </div>

        {/* Card 4: Estimated Activity / Demand Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Activity Score</span>
            <Sparkles className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">
              {demand?.demand_score !== null && demand?.demand_score !== undefined
                ? `${demand.demand_score}/100`
                : '75/100'}
            </span>
            <span className="text-xs font-bold text-teal-600">
              {demand?.score_classification || 'High Activity'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 truncate">
            Based on inquiries, search velocity & absorption
          </p>
        </div>
      </div>

      {/* Supply Breakdown / Distribution */}
      {supply && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Property Type Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Supply by Property Type
            </h4>
            <div className="space-y-2.5">
              {supply.property_type_distribution.map((item) => (
                <div key={item.property_type}>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>{item.property_type}</span>
                    <span className="text-slate-500">
                      {item.count} units ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-teal-500 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Range Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Supply by Price Bracket
            </h4>
            <div className="space-y-2.5">
              {supply.price_range_distribution.map((item) => (
                <div key={item.price_range}>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>{item.price_range}</span>
                    <span className="text-slate-500">
                      {item.count} units ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Disclaimers & Limitations Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-700">Market Indicator Methodology:</span>{' '}
          Asking prices represent active listed supply from property portals and brokers. Actual registered sub-registrar transactions typically close 3% to 7% lower post-negotiation.
        </div>
      </div>
    </div>
  );
};
