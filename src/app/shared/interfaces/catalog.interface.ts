export type PricingMode = 'FIXED' | 'WEIGHT' | 'DELIVERY';

export type GarmentTypeCategory = 'CLOTHING' | 'BEDDING' | 'FOOTWEAR' | 'PLUSH' | 'RUG' | 'HOUSEHOLD';

export type CatalogResourceKind =
  | 'extras'
  | 'service-categories'
  | 'services'
  | 'service-variants'
  | 'garment-types';

export interface CatalogListItem {
  id: number;
  name: string;
  is_active: boolean;
  default_price?: string;
  category_id?: number;
  pricing_mode?: PricingMode;
  service_id?: number;
  price?: string;
  category?: GarmentTypeCategory;
}

export interface ExtraCatalog extends CatalogListItem {
  default_price: string;
}

export interface ServiceCategoryCatalog extends CatalogListItem {}

export interface CatalogService extends CatalogListItem {
  category_id: number;
  pricing_mode: PricingMode;
}

export interface ServiceVariantCatalog extends CatalogListItem {
  service_id: number;
  price: string;
}

export interface CreateExtraPayload {
  name: string;
  default_price: string;
  is_active?: boolean;
}

export interface CreateServiceCategoryPayload {
  name: string;
  is_active?: boolean;
}

export interface CreateCatalogServicePayload {
  category_id: number;
  name: string;
  pricing_mode?: PricingMode;
  is_active?: boolean;
}

export interface CreateServiceVariantPayload {
  service_id: number;
  name: string;
  price: string;
  is_active?: boolean;
}

export interface CreateGarmentTypePayload {
  name: string;
  category?: GarmentTypeCategory | null;
}

export type CatalogMutationPayload =
  | CreateExtraPayload
  | CreateServiceCategoryPayload
  | CreateCatalogServicePayload
  | CreateServiceVariantPayload
  | CreateGarmentTypePayload;

export type CatalogUpdatePayload = Partial<CatalogMutationPayload>;

export interface CatalogMutationResponse {
  message: string;
  extra?: ExtraCatalog;
  service_category?: ServiceCategoryCatalog;
  service?: CatalogService;
  service_variant?: ServiceVariantCatalog;
  garment_type?: CatalogListItem;
}

export interface CatalogFilterParams {
  is_active?: boolean;
  category_id?: number;
  pricing_mode?: PricingMode;
  service_id?: number;
  category?: GarmentTypeCategory;
}
