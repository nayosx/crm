import { DecimalLike } from './common.interface';

export interface ServicePriceOption {
  id: number;
  service_id: number;
  label: string;
  suggested_price: DecimalLike;
  min_quantity?: number | null;
  max_quantity?: number | null;
  is_default: boolean;
  is_active: boolean;
  sort_order?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ServicePriceOptionFilters {
  page?: number;
  per_page?: number;
  q?: string;
  service_id?: number;
  is_active?: boolean;
}

export interface ServicePriceOptionPayload {
  service_id: number;
  label: string;
  suggested_price: DecimalLike;
  min_quantity?: number | null;
  max_quantity?: number | null;
  is_default: boolean;
  is_active: boolean;
  sort_order?: number | null;
  notes?: string | null;
}
