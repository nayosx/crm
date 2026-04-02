import { DecimalLike } from './common.interface';

export interface Extra {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  unit_label?: string | null;
  suggested_unit_price: DecimalLike;
  allow_manual_price_override: boolean;
  is_active: boolean;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExtraFilters {
  page?: number;
  per_page?: number;
  q?: string;
  is_active?: boolean;
}

export interface ExtraPayload {
  name: string;
  code?: string | null;
  description?: string | null;
  unit_label?: string | null;
  suggested_unit_price: DecimalLike;
  allow_manual_price_override: boolean;
  is_active: boolean;
}
