import { DecimalLike } from './common.interface';

export interface DeliveryZonePrice {
  id?: number;
  zone_id?: number;
  delivery_zone_id?: number;
  label: string;
  price: DecimalLike;
  fee_amount?: DecimalLike;
  is_active?: boolean;
  is_default?: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryZone {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  is_active: boolean;
  prices?: DeliveryZonePrice[];
  current_fee?: DecimalLike | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryZoneFilters {
  page?: number;
  per_page?: number;
  q?: string;
  is_active?: boolean;
}

export interface DeliveryZonePayload {
  name: string;
  code?: string | null;
  description?: string | null;
  is_active: boolean;
  current_fee?: DecimalLike | null;
}

export interface DeliveryZonePricePayload {
  label: string;
  price: DecimalLike;
  is_default?: boolean;
}
