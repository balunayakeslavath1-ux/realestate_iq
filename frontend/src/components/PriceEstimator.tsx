import React, { useState } from 'react';
import {
  Calculator,
  Sparkles
} from 'lucide-react';
import { predictPropertyPrice } from '../services/api';
import type { Locality, PricePredictionResult } from '../types';

interface PriceEstimatorProps {
  localities: Locality[];
  initialLocality?: string;
  initialType?: string;
  initialArea?: number;
  initialBeds?: number;
}

export const PriceEstimator: React.FC<PriceEstimatorProps> = ({
  localities,
  initialLocality = 'Kokapet',
  initialType = 'apartment',
  initialArea = 1850,
  initialBeds = 3
}) => {
  const [localityName, setLocalityName] = useState(initialLocality);
  const [propertyType, setPropertyType] = useState(initialType);
  const [areaSqft, setAreaSqft] = useState(initialArea);
  const [bedrooms, setBedrooms] = useState(initialBeds);
  const [age, setAge] = useState(2.0);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PricePredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await predictPropertyPrice({
        locality_name: localityName,
        property_type: propertyType,
        area_sqft: areaSqft,
        bedrooms: bedrooms,
        age: age
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (val: number) => {
    if (!val) return '—';
    if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
    return `₹${(val / 100_000).toFixed(1)} L`;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-black text-slate-900">CatBoost Property Price Valuation Engine</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Predict fair market values using CatBoost trained on micro-market size, bedrooms, age & locality parameters.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
          Benchmarked against Random Forest
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Inputs */}
        <div className="lg:col-span-5 space-y-4">
          {/* Locality */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Micro-Market Locality
            </label>
            <select
              value={localityName}
              onChange={(e) => setLocalityName(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              {localities.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name} ({loc.city})
                </option>
              ))}
            </select>
          </div>

          {/* Property Type */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Property Type
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['apartment', 'villa', 'independent house', 'plot'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPropertyType(type)}
                  className={`py-2 px-3 rounded-xl border text-center font-semibold capitalize transition-all ${
                    propertyType === type
                      ? 'bg-teal-500 text-white border-teal-500 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Area (sqft) */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
              <span className="uppercase tracking-wider">Super Built-Up Area</span>
              <span className="text-teal-700">{areaSqft} sqft</span>
            </div>
            <input
              type="range"
              min={600}
              max={6000}
              step={50}
              value={areaSqft}
              onChange={(e) => setAreaSqft(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>600 sqft</span>
              <span>2,500 sqft</span>
              <span>6,000 sqft</span>
            </div>
          </div>

          {/* Bedrooms */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Bedrooms Configuration
            </label>
            <div className="grid grid-cols-5 gap-2 text-xs font-semibold">
              {[1, 2, 3, 4, 5].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBedrooms(b)}
                  className={`py-2 rounded-xl border transition-all ${
                    bedrooms === b
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {b} BHK
                </button>
              ))}
            </div>
          </div>

          {/* Property Age */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
              <span className="uppercase tracking-wider">Property Age</span>
              <span className="text-slate-600">{age === 0 ? 'Brand New' : `${age} years`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full accent-slate-800 cursor-pointer"
            />
          </div>

          {/* Predict Action Button */}
          <button
            onClick={handlePredict}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/20 active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Evaluating Model...' : 'Calculate CatBoost Valuation'}</span>
          </button>
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        {/* Right Output: Model Estimation Cards */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          {result ? (
            <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              {/* Primary Prediction Display */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-200">
                  Primary CatBoost Regressor Output
                </span>
                <div className="text-4xl font-black text-slate-900 mt-2">
                  {formatPrice(result.catboost_price)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Estimated rate: <strong>₹{Math.round(result.estimated_price_per_sqft).toLocaleString()}/sqft</strong>
                </div>
              </div>

              {/* 95% Confidence Interval Range */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">95% Valuation Confidence Interval:</span>
                  <span className="text-slate-500">±{result.confidence_interval_pct}%</span>
                </div>
                <div className="flex justify-between items-center font-bold text-slate-900 text-sm">
                  <span className="text-slate-600">{formatPrice(result.confidence_lower)}</span>
                  <span className="text-xs text-slate-400 font-normal">to</span>
                  <span className="text-slate-600">{formatPrice(result.confidence_upper)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-400 to-indigo-500 h-2 rounded-full w-full"></div>
                </div>
              </div>

              {/* Benchmark Comparison: CatBoost vs Random Forest */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-teal-200">
                  <span className="text-slate-400 text-[10px]">CatBoost (Primary)</span>
                  <div className="text-base font-bold text-teal-800 mt-0.5">
                    {formatPrice(result.catboost_price)}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px]">Random Forest (Benchmark)</span>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    {formatPrice(result.rf_benchmark_price)}
                  </div>
                </div>
              </div>

              {/* Explanatory Note */}
              <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-3">
                Valuation accounts for property size ({areaSqft} sqft), bedroom structure ({bedrooms} BHK), age ({age} yrs), and micro-market locality premium ({localityName}).
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <Calculator className="w-12 h-12 text-slate-300" />
              <div>
                <p className="font-bold text-slate-700 text-sm">No Property Evaluated Yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Adjust locality, property type, area, bedrooms and age, then click "Calculate CatBoost Valuation".
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
