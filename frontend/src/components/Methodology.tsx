import React from 'react';
import {
  HelpCircle,
  Database,
  ShieldCheck,
  Cpu,
  TrendingUp,
  Award,
  FileCheck,
  AlertTriangle
} from 'lucide-react';

export const Methodology: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-5 h-5 text-teal-600" />
          <h2 className="text-xl font-black text-slate-900">Platform Data & Agent Methodology</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Detailed breakdown of machine learning algorithms, cooperative multi-agent orchestration, and operational limitations.
        </p>
      </div>

      {/* Critical Limitations Notice */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-900 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-950">Important Prototype Disclosures & Boundaries</p>
          <p className="text-amber-800">
            • <strong>Asking Prices vs Registered Deeds:</strong> All pricing data represents current active listing quotes. Final registered stamp duty deeds at Telangana SRO offices typically conclude 3% to 7% lower post negotiation.
          </p>
          <p className="text-amber-800">
            • <strong>Survey Demand Signals:</strong> Inquiries, clicks, and search indexes are simulated behavioral proxies, not actual registered transactions or approved bank mortgages.
          </p>
        </div>
      </div>

      {/* 6 Step Agent Breakdown */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Agent Roles & Mathematical Models
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Step 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center space-x-2 text-teal-800 font-bold">
              <Database className="w-4 h-4 text-teal-600" />
              <span>Step 1 — Data Agent</span>
            </div>
            <p className="text-slate-600">
              Retrieves available property listings, locality boundaries, and monthly historical price observations. Integrates REST API feeds and database records into normalized pandas DataFrames.
            </p>
            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
              FastAPI + SQLAlchemy
            </span>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center space-x-2 text-teal-800 font-bold">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Step 2 — Quality Agent</span>
            </div>
            <p className="text-slate-600">
              Removes duplicate listings via composite hashing. Uses <strong>Isolation Forest</strong> (scikit-learn) and IQR statistical bounds on price-per-sqft to flag anomalous typos and suspicious listings.
            </p>
            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
              Isolation Forest + IQR Rules
            </span>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center space-x-2 text-teal-800 font-bold">
              <Cpu className="w-4 h-4 text-teal-600" />
              <span>Step 3 — Price Agent</span>
            </div>
            <p className="text-slate-600">
              Trains a primary <strong>CatBoost Regressor</strong> on area (sqft), bedrooms, property age, property type, and locality. Benchmarks performance against <strong>Random Forest</strong>, logging R², MAE, and RMSE.
            </p>
            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
              CatBoost + Random Forest Benchmark
            </span>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center space-x-2 text-teal-800 font-bold">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <span>Step 4 — Demand & Trend Agents</span>
            </div>
            <p className="text-slate-600">
              Fits <strong>Holt's Linear Exponential Smoothing</strong> (with trend dampening) to historical price and inventory time-series to project 3-6 month growth. Computes normalized locality activity scores (0-100).
            </p>
            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
              Holt Exponential Smoothing
            </span>
          </div>

          {/* Step 5 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center space-x-2 text-teal-800 font-bold">
              <Award className="w-4 h-4 text-teal-600" />
              <span>Step 5 — Recommendation Agent</span>
            </div>
            <p className="text-slate-600">
              Applies transparent Python scoring rules based on user budget, projected capital appreciation, available supply liquidity, and investor risk profile (Conservative, Balanced, Aggressive).
            </p>
            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
              Rule-Based Locality Ranking
            </span>
          </div>

          {/* Step 6 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center space-x-2 text-teal-800 font-bold">
              <FileCheck className="w-4 h-4 text-teal-600" />
              <span>Step 6 — Validation Agent</span>
            </div>
            <p className="text-slate-600">
              Audits the completion of all upstream deliverables, computes 95% valuation prediction intervals, highlights data limitations, and synthesizes the official executive market report.
            </p>
            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
              Integrity Audit & Uncertainty Metrics
            </span>
          </div>
        </div>
      </div>

      {/* Production Stack Notes */}
      <div className="border-t border-slate-100 pt-5 text-xs text-slate-500 space-y-2">
        <h4 className="font-bold text-slate-800">Production Architecture Path:</h4>
        <p>
          Connects a React + Vite frontend, FastAPI asynchronous microservices, PostgreSQL with PostGIS for spatial queries, and multi-agent pipeline orchestration.
        </p>
      </div>
    </div>
  );
};
