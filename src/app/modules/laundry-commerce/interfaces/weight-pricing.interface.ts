import { DecimalLike } from './common.interface';

export interface WeightPricingProfile {
  id: number;
  name: string;
  service_id?: number | null;
  category_id?: number | null;
  strategy: string;
  allow_manual_override: boolean;
  extra_lb_price?: DecimalLike | null;
  auto_upgrade_enabled?: boolean;
  auto_upgrade_margin?: DecimalLike | null;
  force_upgrade_from_lb?: DecimalLike | null;
  compare_all_tiers?: boolean;
  round_mode?: string | null;
  notes?: string | null;
  is_active: boolean;
  tiers?: WeightPricingTier[];
  created_at?: string;
  updated_at?: string;
}

export interface WeightPricingTier {
  id: number;
  profile_id: number;
  label?: string | null;
  min_weight_lb: DecimalLike;
  max_weight_lb: DecimalLike;
  price: DecimalLike;
  rank?: number | null;
  sort_order?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WeightPricingQuoteOption {
  tier_id?: number | null;
  label: string;
  price: DecimalLike;
  delta_vs_recommended?: DecimalLike;
  delta_vs_lowest?: DecimalLike;
  delta_vs_highest?: DecimalLike;
  rank?: number | null;
  is_recommended?: boolean;
}

export interface WeightPricingQuoteSnapshot {
  profile_id?: number | null;
  profile_name?: string | null;
  strategy_applied: string;
  recommended_price: DecimalLike;
  final_price: DecimalLike;
  min_valid_price: DecimalLike;
  max_valid_price: DecimalLike;
  business_reason?: string | null;
  allow_manual_override: boolean;
  evaluated_options: WeightPricingQuoteOption[];
}

export interface WeightPricingQuoteRequest {
  profile_id: number;
  weight_lb: DecimalLike;
}

export interface WeightPricingQuoteResponse {
  service_id: number;
  weight_lb: DecimalLike;
  profile_id?: number | null;
  profile_name?: string | null;
  strategy_applied: string;
  recommended_price: DecimalLike;
  final_price: DecimalLike;
  min_valid_price: DecimalLike;
  max_valid_price: DecimalLike;
  business_reason?: string | null;
  allow_manual_override: boolean;
  evaluated_options: WeightPricingQuoteOption[];
  snapshot?: WeightPricingQuoteSnapshot | null;
}

export interface WeightPricingProfileFilters {
  page?: number;
  per_page?: number;
  q?: string;
  service_id?: number;
  category_id?: number;
  is_active?: boolean;
}

export interface WeightPricingTierFilters {
  page?: number;
  per_page?: number;
  q?: string;
  profile_id?: number;
  is_active?: boolean;
}

export interface WeightPricingProfilePayload {
  name: string;
  service_id?: number | null;
  category_id?: number | null;
  strategy: string;
  allow_manual_override: boolean;
  notes?: string | null;
  is_active: boolean;
}

export interface WeightPricingTierPayload {
  profile_id: number;
  label?: string | null;
  min_weight_lb: DecimalLike;
  max_weight_lb: DecimalLike;
  price: DecimalLike;
  rank?: number | null;
  is_active: boolean;
}
