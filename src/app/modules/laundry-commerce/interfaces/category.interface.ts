export interface ServiceCategory {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  sort_order?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceCategoryFilters {
  page?: number;
  per_page?: number;
  q?: string;
  is_active?: boolean;
}

export interface ServiceCategoryPayload {
  name: string;
  code?: string | null;
  description?: string | null;
  is_active: boolean;
}
