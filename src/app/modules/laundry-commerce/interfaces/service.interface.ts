import { ServiceCategory } from './category.interface';
import { ServicePriceOption } from './service-price-option.interface';

export type LaundryCommercialServiceType = 'UNIT' | 'WEIGHT';

export interface LaundryCommercialService {
  id: number;
  category_id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  service_type: LaundryCommercialServiceType;
  pricing_mode?: 'FIXED' | 'WEIGHT' | string;
  unit_label?: string | null;
  allow_manual_override: boolean;
  allow_item_discount?: boolean;
  default_price_option_id?: number | null;
  is_active: boolean;
  sort_order?: number | null;
  category?: ServiceCategory | null;
  price_options?: ServicePriceOption[];
  created_at?: string;
  updated_at?: string;
}

export interface LaundryCommercialServiceFilters {
  page?: number;
  per_page?: number;
  q?: string;
  category_id?: number;
  service_type?: LaundryCommercialServiceType;
  is_active?: boolean;
}

export interface LaundryCommercialServicePayload {
  category_id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  service_type: LaundryCommercialServiceType;
  unit_label?: string | null;
  allow_manual_override: boolean;
  default_price_option_id?: number | null;
  is_active: boolean;
}
