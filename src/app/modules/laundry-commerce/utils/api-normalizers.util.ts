import { DeliveryZone, DeliveryZonePrice } from '../interfaces/delivery-zone.interface';
import { Extra } from '../interfaces/extra.interface';
import { Order, OrderExtraItem, OrderItem } from '../interfaces/order.interface';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';
import { ServicePriceOption } from '../interfaces/service-price-option.interface';
import { LaundryCommercialService } from '../interfaces/service.interface';
import {
  WeightPricingProfile,
  WeightPricingQuoteOption,
  WeightPricingQuoteResponse,
  WeightPricingQuoteSnapshot,
  WeightPricingTier
} from '../interfaces/weight-pricing.interface';
import { ServiceCategory } from '../interfaces/category.interface';
import { toNumber } from './decimal.util';

export const wrapArrayAsPage = <T>(items: T[]): PaginatedResponse<T> => ({
  items,
  total: items.length,
  page: 1,
  current_page: 1,
  per_page: items.length,
  pages: items.length ? 1 : 0
});

export const normalizePageResponse = <T>(response: {
  items?: T[];
  total?: number;
  page?: number;
  current_page?: number;
  per_page?: number;
  pages?: number;
}): PaginatedResponse<T> => ({
  items: response.items ?? [],
  total: response.total ?? 0,
  page: response.page ?? response.current_page ?? 1,
  current_page: response.current_page ?? response.page ?? 1,
  per_page: response.per_page ?? 10,
  pages: response.pages ?? 0
});

export const normalizeCategory = (item: any): ServiceCategory => ({
  id: item.id,
  code: item.code ?? null,
  name: item.name,
  description: item.description ?? null,
  is_active: Boolean(item.is_active),
  sort_order: item.sort_order ?? null,
  created_at: item.created_at,
  updated_at: item.updated_at
});

export const normalizePriceOption = (item: any): ServicePriceOption => ({
  id: item.id,
  service_id: item.service_id,
  label: item.label,
  suggested_price: item.suggested_price,
  min_quantity: item.min_quantity ?? null,
  max_quantity: item.max_quantity ?? null,
  is_default: Boolean(item.is_default),
  is_active: Boolean(item.is_active),
  sort_order: item.sort_order ?? null,
  notes: item.notes ?? null,
  created_at: item.created_at,
  updated_at: item.updated_at
});

export const normalizeService = (item: any): LaundryCommercialService => ({
  id: item.id,
  category_id: item.category_id,
  code: item.code ?? null,
  name: item.name,
  description: item.description ?? null,
  service_type: item.pricing_mode === 'WEIGHT' ? 'WEIGHT' : 'UNIT',
  pricing_mode: item.pricing_mode ?? 'FIXED',
  unit_label: item.unit_label ?? null,
  allow_manual_override: Boolean(item.allow_manual_price_override),
  allow_item_discount: Boolean(item.allow_item_discount),
  default_price_option_id: item.default_price_option_id ?? item.price_options?.[0]?.id ?? null,
  is_active: Boolean(item.is_active),
  sort_order: item.sort_order ?? null,
  category: item.category ? normalizeCategory(item.category) : null,
  price_options: Array.isArray(item.price_options) ? item.price_options.map(normalizePriceOption) : [],
  created_at: item.created_at,
  updated_at: item.updated_at
});

export const normalizeExtra = (item: any): Extra => ({
  id: item.id,
  code: item.code ?? null,
  name: item.name,
  description: item.description ?? null,
  unit_label: item.unit_label ?? null,
  suggested_unit_price: item.suggested_unit_price,
  allow_manual_price_override: Boolean(item.allow_manual_price_override),
  is_active: Boolean(item.is_active),
  sort_order: item.sort_order ?? null,
  created_at: item.created_at,
  updated_at: item.updated_at
});

export const normalizeDeliveryZonePrice = (item: any): DeliveryZonePrice => ({
  id: item.id,
  zone_id: item.delivery_zone_id ?? item.zone_id,
  delivery_zone_id: item.delivery_zone_id ?? item.zone_id,
  label: item.label ?? 'Tarifa actual',
  price: item.fee_amount ?? item.price ?? 0,
  fee_amount: item.fee_amount ?? item.price ?? 0,
  is_active: item.is_active ?? true,
  is_default: item.is_default ?? true,
  effective_from: item.effective_from ?? null,
  effective_to: item.effective_to ?? null,
  created_at: item.created_at,
  updated_at: item.updated_at
});

export const normalizeDeliveryZone = (item: any): DeliveryZone => ({
  id: item.id,
  code: item.code ?? null,
  name: item.name,
  description: item.description ?? null,
  is_active: Boolean(item.is_active),
  prices: Array.isArray(item.prices) ? item.prices.map(normalizeDeliveryZonePrice) : [],
  current_fee: item.current_fee ?? item.prices?.[0]?.fee_amount ?? null,
  created_at: item.created_at,
  updated_at: item.updated_at
});

export const normalizeWeightPricingTier = (item: any, index = 0, previousMaxWeight?: number): WeightPricingTier => ({
  id: item.id,
  profile_id: item.profile_id,
  label: item.label ?? `Tier ${index + 1}`,
  min_weight_lb: item.min_weight_lb ?? previousMaxWeight ?? 0,
  max_weight_lb: item.max_weight_lb,
  price: item.price,
  rank: item.rank ?? item.sort_order ?? index + 1,
  sort_order: item.sort_order ?? item.rank ?? index + 1,
  is_active: Boolean(item.is_active),
  created_at: item.created_at,
  updated_at: item.updated_at
});

export const normalizeWeightPricingProfile = (item: any): WeightPricingProfile => {
  const normalizedTiers = Array.isArray(item.tiers)
    ? item.tiers.map((tier: any, index: number, tiers: any[]) => {
        const previous = index > 0 ? toNumber(tiers[index - 1].max_weight_lb) : 0;
        return normalizeWeightPricingTier(tier, index, previous);
      })
    : [];

  return {
    id: item.id,
    name: item.name,
    service_id: item.service_id ?? null,
    category_id: item.category_id ?? null,
    strategy: item.strategy,
    allow_manual_override: Boolean(item.allow_manual_override),
    notes: item.notes ?? null,
    is_active: Boolean(item.is_active),
    extra_lb_price: item.extra_lb_price ?? null,
    auto_upgrade_enabled: Boolean(item.auto_upgrade_enabled),
    auto_upgrade_margin: item.auto_upgrade_margin ?? null,
    force_upgrade_from_lb: item.force_upgrade_from_lb ?? null,
    compare_all_tiers: Boolean(item.compare_all_tiers),
    round_mode: item.round_mode ?? null,
    tiers: normalizedTiers,
    created_at: item.created_at,
    updated_at: item.updated_at
  };
};

export const normalizeQuoteOption = (item: any, index = 0, recommendedPrice?: string | number | null): WeightPricingQuoteOption => ({
  tier_id: item.tier_id ?? null,
  label: item.label ?? `Opcion ${index + 1}`,
  price: item.price ?? item.selected_price ?? 0,
  delta_vs_recommended: item.delta_vs_recommended ?? (
    recommendedPrice !== undefined && recommendedPrice !== null
      ? (toNumber(item.price ?? item.selected_price ?? 0) - toNumber(recommendedPrice)).toFixed(2)
      : 0
  ),
  delta_vs_lowest: item.delta_vs_lowest ?? null,
  delta_vs_highest: item.delta_vs_highest ?? null,
  rank: item.rank ?? item.sort_order ?? index + 1,
  is_recommended: Boolean(item.is_recommended)
});

export const normalizeWeightPricingQuote = (item: any): WeightPricingQuoteResponse => {
  const recommendedPrice = item.recommended_price ?? item.selected_price ?? 0;
  const finalPrice = item.final_price ?? item.selected_price ?? recommendedPrice;
  const optionsEvaluated = Array.isArray(item.options_evaluated)
    ? item.options_evaluated.map((option: any, index: number) => normalizeQuoteOption(option, index, recommendedPrice))
    : [];

  return {
    service_id: item.service_id ?? 0,
    weight_lb: item.weight_lb ?? 0,
    profile_id: item.profile_id ?? null,
    profile_name: item.profile_name ?? null,
    strategy_applied: item.strategy_applied ?? item.strategy_selected ?? 'MAX_REVENUE',
    recommended_price: recommendedPrice,
    final_price: finalPrice,
    min_valid_price: item.min_valid_price ?? item.lowest_valid_price ?? recommendedPrice,
    max_valid_price: item.max_valid_price ?? item.highest_valid_price ?? recommendedPrice,
    business_reason: item.business_reason ?? item.decision_reason ?? null,
    allow_manual_override: Boolean(item.allow_manual_override),
    evaluated_options: optionsEvaluated.length
      ? optionsEvaluated
      : [
          {
            tier_id: item.selected_tier_id ?? null,
            label: item.selected_tier_id ? `Tier ${item.selected_tier_id}` : 'Seleccionada',
            price: finalPrice,
            delta_vs_recommended: 0,
            delta_vs_lowest: item.difference_selected_vs_lowest ?? null,
            delta_vs_highest: item.difference_selected_vs_highest ?? null,
            is_recommended: true
          }
        ]
  };
};

export const normalizeWeightSnapshot = (item: any): WeightPricingQuoteSnapshot | null => {
  if (!item) {
    return null;
  }

  const normalized = normalizeWeightPricingQuote(item);

  return {
    profile_id: normalized.profile_id,
    profile_name: normalized.profile_name,
    strategy_applied: normalized.strategy_applied,
    recommended_price: normalized.recommended_price,
    final_price: normalized.final_price,
    min_valid_price: normalized.min_valid_price,
    max_valid_price: normalized.max_valid_price,
    business_reason: normalized.business_reason,
    allow_manual_override: normalized.allow_manual_override,
    evaluated_options: normalized.evaluated_options
  };
};

export const normalizeOrderItem = (item: any): OrderItem => ({
  id: item.id,
  service_id: item.service_id,
  service_name: item.service_name ?? item.service_name_snapshot ?? null,
  category_name: item.category_name ?? item.category_name_snapshot ?? null,
  service_type: item.service_type ?? (item.pricing_mode === 'WEIGHT' ? 'WEIGHT' : 'UNIT'),
  pricing_mode: item.pricing_mode ?? (item.service_type === 'WEIGHT' ? 'WEIGHT' : 'FIXED'),
  quantity: toNumber(item.quantity),
  selected_price_option_id: item.selected_price_option_id ?? item.suggested_price_option_id ?? null,
  suggested_price_option_id: item.suggested_price_option_id ?? item.selected_price_option_id ?? null,
  suggested_price_label_snapshot: item.suggested_price_label_snapshot ?? null,
  unit_label_snapshot: item.unit_label_snapshot ?? null,
  suggested_unit_price: item.suggested_unit_price ?? 0,
  recommended_unit_price: item.recommended_unit_price ?? null,
  final_unit_price: item.final_unit_price ?? item.recommended_unit_price ?? item.suggested_unit_price ?? 0,
  weight_lb: item.weight_lb ?? null,
  discount_amount: item.discount_amount ?? 0,
  notes: item.notes ?? null,
  manual_override: Boolean(item.manual_override ?? item.manual_price_override_by_user_id ?? item.manual_price_override_reason),
  override_reason: item.override_reason ?? item.manual_price_override_reason ?? null,
  subtotal: item.subtotal ?? item.subtotal_after_discount ?? item.final_unit_price ?? 0,
  subtotal_before_discount: item.subtotal_before_discount ?? null,
  subtotal_after_discount: item.subtotal_after_discount ?? item.subtotal ?? null,
  pricing_snapshot: normalizeWeightSnapshot(item.pricing_snapshot ?? item.weight_pricing_snapshot)
});

export const normalizeOrderExtraItem = (item: any): OrderExtraItem => ({
  id: item.id,
  extra_id: item.extra_id,
  extra_name: item.extra_name ?? item.extra_name_snapshot ?? null,
  unit_label_snapshot: item.unit_label_snapshot ?? null,
  quantity: toNumber(item.quantity),
  suggested_unit_price: item.suggested_unit_price ?? 0,
  final_unit_price: item.final_unit_price ?? item.suggested_unit_price ?? 0,
  discount_amount: item.discount_amount ?? 0,
  subtotal: item.subtotal ?? item.subtotal_after_discount ?? item.final_unit_price ?? 0,
  subtotal_before_discount: item.subtotal_before_discount ?? null,
  subtotal_after_discount: item.subtotal_after_discount ?? item.subtotal ?? null,
  notes: item.notes ?? null
});

export const normalizeOrder = (item: any): Order => ({
  id: item.id,
  client_id: item.client_id ?? null,
  client_name: item.client_name ?? null,
  client_address_id: item.client_address_id ?? null,
  client_address_text: item.client_address_text ?? null,
  pricing_profile_id: item.pricing_profile_id ?? null,
  delivery_zone_id: item.delivery_zone_id ?? null,
  delivery_zone_name: item.delivery_zone_name ?? null,
  delivery_zone_price_id: item.delivery_zone_price_id ?? null,
  cashier_user_id: item.cashier_user_id ?? item.charged_by_user_id ?? null,
  cashier_user_name: item.cashier_user_name ?? null,
  charged_by_user_id: item.charged_by_user_id ?? item.cashier_user_id ?? null,
  status: item.status,
  notes: item.notes ?? null,
  global_discount_amount: item.global_discount_amount ?? 0,
  global_discount_reason: item.global_discount_reason ?? null,
  delivery_suggested_amount: item.delivery_suggested_amount ?? item.delivery_fee_suggested ?? 0,
  delivery_final_amount: item.delivery_final_amount ?? item.delivery_fee_final ?? 0,
  delivery_override_reason: item.delivery_override_reason ?? item.delivery_fee_override_reason ?? null,
  subtotal_items: item.subtotal_items ?? item.service_subtotal ?? 0,
  subtotal_extras: item.subtotal_extras ?? item.extras_subtotal ?? 0,
  total_amount: item.total_amount ?? 0,
  items: Array.isArray(item.items) ? item.items.map(normalizeOrderItem) : [],
  extras: Array.isArray(item.extras)
    ? item.extras.map(normalizeOrderExtraItem)
    : Array.isArray(item.extra_items)
      ? item.extra_items.map(normalizeOrderExtraItem)
      : [],
  created_at: item.created_at,
  updated_at: item.updated_at
});
