import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  Clock,
  Database,
  ShieldCheck,
  Cpu,
  TrendingUp,
  Award,
  FileCheck,
  Sparkles
} from 'lucide-react';
import type { AgentAnalysisResponse } from '../types';

interface MultiAgentWorkflowProps {
  agentData: AgentAnalysisResponse | null;
  isRunning: boolean;
  onRunAgents: (params: { budget_min: number; budget_max: number; risk_preference: string }) => void;
}

export const MultiAgentWorkflow: React.FC<MultiAgentWorkflowProps> = ({
  agentData,
  isRunning,
  onRunAgents
}) => {
  const [budgetMin, setBudgetMin] = useState(6_000_000); // 60L
  const [budgetMax, setBudgetMax] = useState(25_000_000); // 2.5 Cr
  const [riskPreference, setRiskPreference] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [activeTab, setActiveTab] = useState<'timeline' | 'price_models' | 'quality_audit' | 'recommendations' | 'report'>('timeline');

  const handleTriggerRun = () => {
    onRunAgents({
      budget_min: budgetMin,
      budget_max: budgetMax,
      risk_preference: riskPreference
    });
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return Database;
      case 2: return ShieldCheck;
      case 3: return Cpu;
      case 4: return TrendingUp;
      case 5: return Award;
      case 6: return FileCheck;
      default: return Sparkles;
    }
  };

  const priceMetrics = agentData?.agent_outputs?.price_agent?.metrics;
  const qualityMetrics = agentData?.agent_outputs?.quality_agent?.metrics;
  const qualityFlagged = agentData?.agent_outputs?.quality_agent?.flagged_properties || [];
  const recommendations = agentData?.agent_outputs?.recommendation_agent?.recommendations || [];
  const validationReport = agentData?.agent_outputs?.validation_agent?.report;
  const uncertainty = agentData?.agent_outputs?.validation_agent?.uncertainty;

  return (
    <div className="space-y-6">
      {/* Top Trigger Card: Configuration and Run Button */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-slate-700/60">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Autonomous AI Pipeline
              </span>
              <span className="text-xs text-slate-400">6 Specialized Cooperative Agents</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-1">Multi-Agent Market Intelligence Orchestrator</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Execute Data, Quality, CatBoost Price, Exponential Smoothing Trend, Recommendation, and Validation agents in real-time.
            </p>
          </div>

          <button
            onClick={handleTriggerRun}
            disabled={isRunning}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all ${
              isRunning
                ? 'bg-slate-700 cursor-not-allowed opacity-75 text-slate-300'
                : 'bg-gradient-to-r from-teal-400 to-indigo-500 hover:from-teal-300 hover:to-indigo-400 text-slate-950 active:scale-95 shadow-teal-500/30'
            }`}
          >
            <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : 'fill-slate-950'}`} />
            <span>{isRunning ? 'Agents Executing Pipeline...' : 'Run Agent Analysis'}</span>
          </button>
        </div>

        {/* User Preferences Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6 text-xs">
          {/* Budget Range */}
          <div>
            <label className="text-slate-400 font-semibold uppercase tracking-wider block mb-2">
              Target Budget Range
            </label>
            <div className="flex items-center space-x-2">
              <select
                value={budgetMin}
                onChange={(e) => setBudgetMin(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white w-full focus:ring-1 focus:ring-teal-400"
              >
                <option value={4000000}>Min: ₹40 Lakhs</option>
                <option value={6000000}>Min: ₹60 Lakhs</option>
                <option value={10000000}>Min: ₹1.0 Crore</option>
              </select>
              <span className="text-slate-500">to</span>
              <select
                value={budgetMax}
                onChange={(e) => setBudgetMax(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white w-full focus:ring-1 focus:ring-teal-400"
              >
                <option value={15000000}>Max: ₹1.5 Crores</option>
                <option value={20000000}>Max: ₹2.0 Crores</option>
                <option value={25000000}>Max: ₹2.5 Crores</option>
                <option value={40000000}>Max: ₹4.0 Crores</option>
                <option value={60000000}>Max: ₹6.0 Crores</option>
              </select>
            </div>
          </div>

          {/* Risk Preference */}
          <div>
            <label className="text-slate-400 font-semibold uppercase tracking-wider block mb-2">
              Investor Risk Profile
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-center font-medium">
              {(['conservative', 'balanced', 'aggressive'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setRiskPreference(mode)}
                  className={`py-1.5 rounded-lg capitalize transition-all ${
                    riskPreference === mode
                      ? 'bg-teal-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Pipeline Summary Badge */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-center">
            <span className="text-slate-400">Last Orchestration Run:</span>
            <span className="font-bold text-teal-300 text-sm mt-0.5">
              {agentData?.executed_at || 'Ready to run'}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Total pipeline latency: {agentData?.total_duration_ms ? `${agentData.total_duration_ms} ms` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 6 Step Visual Pipeline Stepper */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          6-Stage Cooperative Pipeline Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { step: 1, name: 'Data Agent', desc: 'Ingestion & APIs' },
            { step: 2, name: 'Quality Agent', desc: 'Isolation Forest' },
            { step: 3, name: 'Price Agent', desc: 'CatBoost vs RF' },
            { step: 4, name: 'Trend Agent', desc: 'Holt Forecast' },
            { step: 5, name: 'Recommend', desc: 'Multi-Ranking' },
            { step: 6, name: 'Validation', desc: 'Report & Audit' },
          ].map((item) => {
            const Icon = getStepIcon(item.step);
            const stepLog = agentData?.timeline?.find((t) => t.step === item.step);
            const isCompleted = Boolean(stepLog);

            return (
              <div
                key={item.step}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-teal-50/60 border-teal-200 text-teal-950'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200">
                    Step {item.step}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Icon className={`w-4 h-4 ${isCompleted ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span className="font-bold text-xs">{item.name}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{item.desc}</p>
                {stepLog && (
                  <span className="inline-block mt-2 text-[10px] font-semibold text-teal-700 bg-white px-1.5 py-0.5 rounded border border-teal-200">
                    {stepLog.duration_ms} ms
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Results View Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'timeline', label: 'Execution Timeline' },
            { id: 'price_models', label: 'CatBoost vs RF Models' },
            { id: 'quality_audit', label: 'Quality & Anomaly Audit' },
            { id: 'recommendations', label: 'Locality Recommendations' },
            { id: 'report', label: 'Validation Market Report' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-800 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* TAB 1: EXECUTION TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 mb-2">Sequential Agent Run Logs</h4>
              {agentData?.timeline?.map((step) => {
                const Icon = getStepIcon(step.step);
                return (
                  <div
                    key={step.step}
                    className="flex items-start space-x-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">
                          Step {step.step}: {step.agent_name}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {step.timestamp} ({step.duration_ms} ms)
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{step.summary}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: PRICE AGENT (CATBOOST VS RANDOM FOREST) */}
          {activeTab === 'price_models' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Step 3 — Price Valuation Model Benchmark
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trained on cleaned properties using CatBoost Regressor with Random Forest Regressor benchmark.
                </p>
              </div>

              {priceMetrics ? (
                <>
                  {/* Model Comparison Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">Model Architecture</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">R² Score (Accuracy)</th>
                          <th className="p-3">MAPE (Error %)</th>
                          <th className="p-3">MAE (INR)</th>
                          <th className="p-3">RMSE (INR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="bg-teal-50/40 font-medium">
                          <td className="p-3 font-bold text-teal-800">CatBoost Regressor</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                              Primary Engine
                            </span>
                          </td>
                          <td className="p-3 font-bold text-emerald-700">
                            {priceMetrics.catboost.r2_score}
                          </td>
                          <td className="p-3 font-bold text-teal-700">
                            ±{priceMetrics.catboost.mape_pct}%
                          </td>
                          <td className="p-3">₹{priceMetrics.catboost.mae_inr.toLocaleString()}</td>
                          <td className="p-3">₹{priceMetrics.catboost.rmse_inr.toLocaleString()}</td>
                        </tr>
                        <tr className="font-medium text-slate-700">
                          <td className="p-3 font-bold">Random Forest Regressor</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                              Benchmark
                            </span>
                          </td>
                          <td className="p-3 font-bold">{priceMetrics.random_forest.r2_score}</td>
                          <td className="p-3">±{priceMetrics.random_forest.mape_pct}%</td>
                          <td className="p-3">₹{priceMetrics.random_forest.mae_inr.toLocaleString()}</td>
                          <td className="p-3">₹{priceMetrics.random_forest.rmse_inr.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Feature Importance Drivers */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      CatBoost Feature Importance Weights
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {Object.entries(agentData?.agent_outputs?.price_agent?.feature_importances || {}).map(
                        ([feat, weight]) => (
                          <div key={feat} className="flex items-center justify-between">
                            <span className="capitalize font-medium text-slate-700">
                              {feat.replace('_', ' ')}:
                            </span>
                            <div className="flex items-center space-x-2 w-1/2">
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-teal-600 h-2 rounded-full"
                                  style={{ width: `${Math.min(100, (weight as number) * 1.5)}%` }}
                                ></div>
                              </div>
                              <span className="font-bold text-slate-900 shrink-0">{weight}%</span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">Run agent analysis to train and benchmark models.</p>
              )}
            </div>
          )}

          {/* TAB 3: QUALITY AGENT AUDIT */}
          {activeTab === 'quality_audit' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Step 2 — Quality Screening & Isolation Forest Anomaly Detection
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated deduplication and outlier screening before model ingestion.
                </p>
              </div>

              {qualityMetrics ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-500">Duplicates Purged</span>
                      <div className="text-xl font-black text-slate-900 mt-1">
                        {qualityMetrics.duplicates_removed}
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-500">Missing Information</span>
                      <div className="text-xl font-black text-slate-900 mt-1">
                        {qualityMetrics.missing_info_count}
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="text-slate-500">Suspicious Anomalies</span>
                      <div className="text-xl font-black text-amber-600 mt-1">
                        {qualityMetrics.suspicious_price_count}
                      </div>
                    </div>
                    <div className="p-3.5 bg-teal-50 rounded-xl border border-teal-200 text-xs">
                      <span className="text-teal-800 font-semibold">Data Health Score</span>
                      <div className="text-xl font-black text-teal-700 mt-1">
                        {qualityMetrics.data_quality_score}%
                      </div>
                    </div>
                  </div>

                  {/* Flagged Suspicious Listings Table */}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Flagged Suspicious Listings for Review
                    </h5>
                    <div className="space-y-2">
                      {qualityFlagged.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{item.title}</span>
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              {item.locality_name} • ₹{item.price_per_sqft?.toLocaleString()}/sqft • {item.area_sqft} sqft
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              {item.reasons.join(', ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">Run agent analysis to inspect data quality metrics.</p>
              )}
            </div>
          )}

          {/* TAB 4: RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Step 5 — Micro-Market Locality Rankings
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranks Hyderabad localities based on your budget, projected appreciation, and risk profile.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec) => (
                  <div
                    key={rec.locality_id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-900 text-white">
                          #{rec.rank}
                        </span>
                        <div className="text-right">
                          <span className="text-lg font-black text-teal-600">{rec.suitability_score}</span>
                          <span className="text-[10px] text-slate-400">/100</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-900 text-base">{rec.locality_name}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{rec.rationale}</p>

                      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px]">Projected Growth</span>
                          <div className="font-bold text-emerald-600">+{rec.projected_appreciation_pct}% /yr</div>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Median Entry</span>
                          <div className="font-bold text-slate-900">
                            ₹{(rec.median_price / 10000000).toFixed(2)} Cr
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 text-[11px] text-slate-600 border-t border-slate-100 space-y-1">
                      {rec.pros.slice(0, 1).map((pro, i) => (
                        <div key={i} className="flex items-center space-x-1 text-emerald-700">
                          <span>✓</span> <span>{pro}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: VALIDATION AGENT REPORT */}
          {activeTab === 'report' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Step 6 — Final Market Report & Verification Audit
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synthesized executive report with uncertainty metrics and limitation disclosures.
                </p>
              </div>

              {validationReport ? (
                <>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-900 text-sm">{validationReport.title}</span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        {validationReport.validation_verdict}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{validationReport.executive_summary}</p>
                  </div>

                  {/* Uncertainty Bounds */}
                  {uncertainty && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[11px]">Valuation Error Margin</span>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">
                          {uncertainty.valuation_error_margin_pct}
                        </div>
                        <span className="text-[10px] text-slate-500">{uncertainty.confidence_interval}</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[11px]">Mean Absolute Error</span>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">
                          {uncertainty.valuation_mean_absolute_error}
                        </div>
                        <span className="text-[10px] text-slate-500">Holdout validation split</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[11px]">Forecast Confidence</span>
                        <div className="font-bold text-teal-700 text-sm mt-0.5">
                          {uncertainty.forecast_confidence_level}
                        </div>
                        <span className="text-[10px] text-slate-500">{uncertainty.data_freshness}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">Run agent analysis to generate executive report.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
