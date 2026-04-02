import { DecimalLike } from './common.interface';
import { WeightPricingQuoteSnapshot } from './weight-pricing.interface';

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type OrderItemType = 'UNIT' | 'WEIGHT';

export interface OrderItem {
  id?: number;
  service_id: number;
  service_name?: string | null;
  category_name?: string | null;
  service_type: OrderItemType;
  pricing_mode?: 'FIXED' | 'WEIGHT' | string;
  quantity: number;
  selected_price_option_id?: number | null;
  suggested_price_option_id?: number | null;
  suggested_price_label_snapshot?: string | null;
  unit_label_snapshot?: string | null;
  suggested_unit_price: DecimalLike;
  recommended_unit_price?: DecimalLike | null;
  final_unit_price: DecimalLike;
  weight_lb?: DecimalLike | null;
  discount_amount?: DecimalLike;
  notes?: string | null;
  manual_override?: boolean;
  override_reason?: string | null;
  manual_price_override_reason?: string | null;
  subtotal: DecimalLike;
  subtotal_before_discount?: DecimalLike | null;
  subtotal_after_discount?: DecimalLike | null;
  pricing_snapshot?: WeightPricingQuoteSnapshot | null;
}

export interface OrderExtraItem {
  id?: number;
  extra_id: number;
  extra_name?: string | null;
  unit_label_snapshot?: string | null;
  quantity: number;
  suggested_unit_price: DecimalLike;
  final_unit_price: DecimalLike;
  discount_amount?: DecimalLike;
  subtotal: DecimalLike;
  subtotal_before_discount?: DecimalLike | null;
  subtotal_after_discount?: DecimalLike | null;
  notes?: string | null;
}

export interface OrderWeightPricingSnapshot extends WeightPricingQuoteSnapshot {}

export interface DeliveryFeeSuggestion {
  client_id: number;
  client_address_id: number | null;
  delivery_zone_id: number | null;
  delivery_zone_name: string | null;
  delivery_zone_price_id: number | null;
  delivery_fee_suggested_by_zone: number;
  last_delivery_fee_final_for_client_address: number;
  last_delivery_fee_final_for_client: number;
  last_delivery_order_id_for_client_address: number | null;
  last_delivery_order_id_for_client: number | null;
  has_previous_delivery_for_client_address: boolean;
  has_previous_delivery_for_client: boolean;
  initial_delivery_fee_final: number;
}

export interface Order {
  id: number;
  client_id?: number | null;
  client_name?: string | null;
  client_address_id?: number | null;
  client_address_text?: string | null;
  pricing_profile_id?: number | null;
  delivery_zone_id?: number | null;
  delivery_zone_name?: string | null;
  delivery_zone_price_id?: number | null;
  cashier_user_id?: number | null;
  cashier_user_name?: string | null;
  charged_by_user_id?: number | null;
  status: OrderStatus;
  notes?: string | null;
  global_discount_amount: DecimalLike;
  global_discount_reason?: string | null;
  delivery_suggested_amount?: DecimalLike;
  delivery_final_amount?: DecimalLike;
  delivery_override_reason?: string | null;
  subtotal_items: DecimalLike;
  subtotal_extras: DecimalLike;
  total_amount: DecimalLike;
  items: OrderItem[];
  extras: OrderExtraItem[];
  created_at?: string;
  updated_at?: string;
}

export interface OrderFilters {
  page?: number;
  per_page?: number;
  client?: string;
  status?: OrderStatus | '';
  cashier_user_id?: number | null;
  date_from?: string | null;
  date_to?: string | null;
}

export interface OrderPayload {
  client_id?: number | null;
  client_address_id?: number | null;
  pricing_profile_id?: number | null;
  delivery_zone_id?: number | null;
  cashier_user_id?: number | null;
  charged_by_user_id?: number | null;
  notes?: string | null;
  global_discount_amount: DecimalLike;
  global_discount_reason?: string | null;
  delivery_suggested_amount?: DecimalLike;
  delivery_final_amount?: DecimalLike;
  delivery_override_reason?: string | null;
  delivery_fee_suggested?: DecimalLike;
  delivery_fee_final?: DecimalLike;
  delivery_fee_override_reason?: string | null;
  items: OrderItem[];
  extras: OrderExtraItem[];
  status?: OrderStatus;
}
