export interface LaundryGarmentType {
  id: number;
  name: string;
  icon: string | null;
  is_frequent: boolean;
  category?: 'CLOTHING' | 'BEDDING' | 'FOOTWEAR' | 'PLUSH' | 'RUG' | 'HOUSEHOLD';
  active?: boolean;
  default_unit_type?: 'UNIT' | 'PAIR';
  default_unit_price?: number | null;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}
