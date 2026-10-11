export interface Locality {
  id: number;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  property_count: number;
  data_status?: string;
}

export interface Property {
  id: number;
  external_id?: string;
  title: string;
  locality_id: number;
  locality_name?: string;
  city?: string;
  property_type: string;
  listing_type: 'sale' | 'rent';
  price: number;
  area_sqft: number;
  bedrooms?: number | null;
  price_per_sqft: number;
  listing_date: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  is_approximate_coords?: boolean;
  source: string;
  verification_status: string;
  image_url?: string;
  age?: number;
  is_suspicious?: boolean;
  suspicious_reason?: string;
  address?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  is_available?: boolean;
  amenities?: string;
  source_url?: string;
}

export interface PropertyListResponse {
  total: number;
  page: number;
  page_size: number;
  properties: Property[];
}

export interface MarketSummary {
  locality_id?: number | null;
  locality_name: string;
  city: string;
  listing_type: 'sale' | 'rent';
  property_type: string;
  active_listings: number;
  average_asking_price: number;
  median_asking_price: number;
  median_price_per_sqft: number;
  new_listings_30d: number;
  price_change_pct?: number | null;
  price_change_period: string;
  demand_score?: number | null;
  demand_status: string;
  sample_size: number;
  is_simulated: boolean;
  data_disclaimer: string;
}

export interface DistributionItem {
  property_type?: string;
  price_range?: string;
  count: number;
  percentage: number;
}

export interface SupplyAnalysis {
  locality_id?: number | null;
  locality_name: string;
  listing_type: 'sale' | 'rent';
  active_listings: number;
  new_listings_30d: number;
  listings_change_pct?: number | null;
  property_type_distribution: { property_type: string; count: number; percentage: number }[];
  price_range_distribution: { price_range: string; count: number; percentage: number }[];
  sample_size: number;
}

export interface ContributingSignal {
  signal_type: string;
  raw_value: number;
  weight: number;
  normalized_score: number;
  sample_size: number;
  source: string;
}

export interface DemandAnalysis {
  locality_id?: number | null;
  locality_name: string;
  has_sufficient_data: boolean;
  demand_score?: number | null;
  score_classification?: string | null;
  contributing_signals: ContributingSignal[];
  methodology_explanation: string;
  total_sample_size: number;
  data_period: string;
  status_message: string;
}

export interface TrendDataPoint {
  observation_date: string;
  period_label: string;
  average_asking_price: number;
  median_asking_price: number;
  median_price_per_sqft: number;
  active_listing_count: number;
  new_listing_count: number;
  sample_size: number;
}

export interface MarketTrends {
  locality_id?: number | null;
  locality_name: string;
  listing_type: string;
  property_type: string;
  data_points: TrendDataPoint[];
  overall_price_change_pct?: number | null;
  has_sufficient_history: boolean;
  message?: string | null;
}

export interface LocalityComparisonItem {
  locality_id: number;
  locality_name: string;
  city: string;
  listing_type: string;
  property_type: string;
  median_asking_price: number;
  average_asking_price: number;
  median_price_per_sqft: number;
  active_listing_count: number;
  new_listing_count_30d: number;
  price_change_pct?: number | null;
  demand_score?: number | null;
  demand_status: string;
  sample_size: number;
  data_freshness: string;
}

export interface MarketCompareResponse {
  listing_type: string;
  property_type: string;
  localities: LocalityComparisonItem[];
  comparison_notes: string;
}

export interface FilterState {
  locality_id?: number;
  search?: string;
  property_type: string;
  listing_type?: 'sale' | 'rent';
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  bedrooms?: number;
  sort_by: string;
}

export interface AgentTimelineStep {
  step: number;
  agent_name: string;
  status: string;
  timestamp: string;
  duration_ms: number;
  summary: string;
  key_metrics?: any;
  flagged_anomalies_count?: number;
  feature_importances?: Record<string, number>;
}

export interface RecommendationItem {
  rank: number;
  locality_id: number;
  locality_name: string;
  suitability_score: number;
  projected_appreciation_pct: number;
  median_price: number;
  avg_price_per_sqft: number;
  active_inventory: number;
  activity_score: number;
  risk_profile: string;
  pros: string[];
  cons: string[];
  rationale: string;
}

export interface AgentAnalysisResponse {
  status: string;
  executed_at: string;
  total_duration_ms: number;
  timeline: AgentTimelineStep[];
  agent_outputs: {
    data_agent: {
      total_properties: number;
      total_localities: number;
      total_snapshots: number;
      total_signals: number;
      primary_localities: string[];
    };
    quality_agent: {
      metrics: {
        total_received: number;
        duplicates_removed: number;
        missing_info_count: number;
        suspicious_price_count: number;
        clean_records_count: number;
        data_quality_score: number;
        model_used: string;
      };
      flagged_properties: Array<{
        id: number;
        external_id: string;
        title: string;
        locality_name: string;
        price: number;
        price_per_sqft: number;
        area_sqft: number;
        reasons: string[];
      }>;
      missing_info_records: Array<{
        id: number;
        title: string;
        reasons: string[];
      }>;
    };
    price_agent: {
      metrics: {
        catboost: {
          name: string;
          mae_inr: number;
          rmse_inr: number;
          r2_score: number;
          mape_pct: number;
        };
        random_forest: {
          name: string;
          mae_inr: number;
          rmse_inr: number;
          r2_score: number;
          mape_pct: number;
        };
        comparison: {
          preferred_model: string;
          catboost_r2_improvement: number;
          catboost_mae_reduction_pct: number;
        };
      };
      feature_importances: Record<string, number>;
    };
    trend_agent: {
      forecasts: Record<string, {
        historical: Array<{ observation_date: string; period_label: string; median_price_per_sqft: number; active_listing_count: number; is_forecast: boolean }>;
        forecast: Array<{ observation_date: string; period_label: string; median_price_per_sqft: number; active_listing_count: number; is_forecast: boolean }>;
        combined: Array<{ observation_date: string; period_label: string; median_price_per_sqft: number; active_listing_count: number; is_forecast: boolean }>;
        projected_appreciation_pct: number;
        trend_direction: string;
        model_used: string;
      }>;
      activity_scores: Record<string, {
        score: number;
        label: string;
        velocity_index: number;
      }>;
    };
    recommendation_agent: {
      recommendations: RecommendationItem[];
      top_pick?: RecommendationItem;
    };
    validation_agent: {
      report: {
        title: string;
        generated_at: string;
        status: string;
        executive_summary: string;
        top_investment_picks: string[];
        pipeline_verifications: Array<{ deliverable: string; exists: boolean; detail: string }>;
        validation_verdict: string;
      };
      uncertainty: {
        valuation_error_margin_pct: string;
        valuation_mean_absolute_error: string;
        confidence_interval: string;
        forecast_confidence_level: string;
        data_freshness: string;
      };
      limitations: Array<{ aspect: string; status: string; impact: string }>;
    };
  };
}

export interface PricePredictionResult {
  locality_name: string;
  property_type: string;
  area_sqft: number;
  bedrooms: number;
  age: number;
  catboost_price: number;
  rf_benchmark_price: number;
  estimated_price_per_sqft: number;
  confidence_lower: number;
  confidence_upper: number;
  confidence_interval_pct: number;
  model_status: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  role: 'admin' | 'user';
  share_contact_consent: boolean;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface FavoriteItem {
  id: number;
  property_id: number;
  created_at: string;
  property: Property;
}

export interface FavoriteActionResponse {
  success: boolean;
  message: string;
  property_id: number;
  is_favorited: boolean;
  notification_sent: boolean;
  owner_notified?: string;
}

export interface NotificationLog {
  id: number;
  property_id: number;
  owner_email: string;
  owner_name: string;
  user_name: string;
  user_email: string;
  user_phone?: string | null;
  subject: string;
  message: string;
  sent_at: string;
  status: string;
}

export interface ApifySyncResponse {
  status: string;
  source: string;
  records_fetched: number;
  records_imported: number;
  records_updated: number;
  message: string;
}


