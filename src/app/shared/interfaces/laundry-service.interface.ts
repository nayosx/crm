import { Client, ClientAddress, ClientFullResponse } from "./client.interface";
import { TransactionFull } from "./transaction.interface";
import { User } from "./user.interface";

export type LaundryServiceLabel = 'NORMAL' | 'EXPRESS';
export type LaundryServiceFulfillmentType = 'WALK_IN' | 'DELIVERY' | 'PICKUP_DELIVERY';
export type LaundryUnitType = 'UNIT' | 'PAIR';

export interface LaundryServiceItem {
  garment_type_id: number;
  quantity: number;
  unit_type: LaundryUnitType;
  unit_price: number | null;
  notes: string | null;
  garment_type?: {
    id: number;
    name: string;
    icon?: string | null;
  };
}

export interface LaundryServiceExtra {
  service_extra_type_id: number;
  quantity: number;
  unit_price: number | null;
  notes: string | null;
  service_extra_type?: {
    id: number;
    code: string;
    name: string;
    unit_label?: string | null;
  };
}

export interface LaundryServiceExtraType {
  id: number;
  code: string;
  name: string;
  unit_label: string | null;
  default_unit_price: number | null;
  active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface LaundryServiceClientPhone {
  id: number;
  phone_number: string;
  is_primary: boolean;
}

export interface LaundryServiceSummaryItem {
  id: number;
  service_id: number;
  service_name: string;
  service_category_name: string;
  pricing_mode: string;
  service_variant_id: number | null;
  service_variant_name: string | null;
  garment_type_id: number | null;
  garment_type_name: string | null;
  quantity: string | number;
  catalog_price: string | number;
  applied_price: string | number;
  is_friendly_discount: boolean;
  calculation_snapshot: Record<string, unknown> | string | null;
}

export interface LaundryServiceSummaryExtra {
  id: number;
  extra_id: number;
  extra_name: string;
  quantity: number;
  unit_price: string | number;
  subtotal: string | number;
  is_courtesy: boolean;
}

export interface LaundryServiceSummaryWeightGarment {
  garment_type_id: number;
  garment_type_name?: string | null;
  quantity: string | number;
}

export interface LaundryServiceSummaryWeightDetail extends LaundryServiceSummaryItem {
  weight_lb: string | number;
  has_other_services: boolean;
  quote: Record<string, unknown> | null;
  garments: LaundryServiceSummaryWeightGarment[];
}

export interface LaundryServiceSummaryTotals {
  automatic_items_subtotal: string | number;
  weight_service_subtotal: string | number;
  manual_items_subtotal: string | number;
  extras_subtotal: string | number;
  grand_total: string | number;
}

/** Estados válidos del servicio de lavandería */
export type LaundryServiceStatus =
  | 'PENDING'
  | 'STARTED'
  | 'IN_PROGRESS'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export const LaundryServiceStatusValues: LaundryServiceStatus[] = [
  'PENDING',
  'STARTED',
  'IN_PROGRESS',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED'
];

/** Respuesta paginada de clientes */
export interface ClientPageResponse {
  total: number;
  pages: number;
  current_page: number;
  per_page: number;
  items: Client[];
}

/** Detalle resumido de una transacción */
export interface TransactionLite {
  id: number;
  amount: number;
  type: string;
  created_at: string;
}

/** Usuario completo (usado en logs o asignaciones) */
export interface UserFull {
  id: number;
  name: string;
  username: string;
  phone: string;
  role_id: number;
  created_at: string;
  updated_at: string;
}

/** Nota o comentario asociado al servicio */
export interface LaundryServiceLog {
  id: number;
  laundry_service_id: number;
  status: LaundryServiceStatus;
  detail: string;
  created_at: string;
  created_by?: User;
}

/** Payload para crear una nueva nota */
export interface LaundryServiceLogPayload {
  status: LaundryServiceStatus;
  detail: string;
}

/** Respuesta individual del servicio */
export interface LaundryServiceResp {
  id: number;
  scheduled_pickup_at: string;
  status: LaundryServiceStatus;
  service_label: LaundryServiceLabel;
  fulfillment_type?: LaundryServiceFulfillmentType;
  created_at: string;
  updated_at: string;
  client?: ClientFullResponse;
  client_id?: number;
  client_address?: ClientAddress;
  client_address_id?: number;
  transaction?: TransactionLite | TransactionFull | null;
  transaction_id?: number | null;
  created_by?: User;
  created_by_user?: User;
  pending_order?: number | null;
  weight_lb?: number | null;
  notes?: string | null;
  logs?: LaundryServiceLog[];
  items?: LaundryServiceItem[];
  extras?: LaundryServiceExtra[];
  items_total?: number | null;
  extras_total?: number | null;
  grand_total?: number | null;
  isRedirect?: boolean;
}

export interface LaundryServiceSummaryResponse {
  laundry_service: {
    id: number;
    scheduled_pickup_at: string;
    status: LaundryServiceStatus;
    service_label: LaundryServiceLabel;
    fulfillment_type: LaundryServiceFulfillmentType;
    transaction_id: number | null;
    notes: string | null;
  };
  client: {
    id: number;
    name: string;
  };
  client_phones: LaundryServiceClientPhone[];
  client_address: ClientAddress | null;
  automatic_items: LaundryServiceSummaryItem[];
  weight_service_detail: LaundryServiceSummaryWeightDetail | null;
  manual_items: LaundryServiceSummaryItem[];
  extras: LaundryServiceSummaryExtra[];
  summary: LaundryServiceSummaryTotals;
}

export interface LaundryServiceCreatePayload {
  client_id: number;
  client_address_id: number;
  scheduled_pickup_at: string;
  status: LaundryServiceStatus;
  service_label: LaundryServiceLabel;
  fulfillment_type: LaundryServiceFulfillmentType;
  transaction_id: number | null;
  notes?: string | null;
}

export type LaundryServiceUpdatePayload = Partial<LaundryServiceCreatePayload>;

export interface LaundryServiceHeaderPayload {
  service_label?: LaundryServiceLabel;
  fulfillment_type?: LaundryServiceFulfillmentType;
  distance_km?: number;
  manual_delivery_fee?: number;
}

export interface LaundryServiceCommercialDetailPayload {
  weight_service: {
    weight_lb: number;
    garments: Array<{
      garment_type_id: number;
      quantity: number;
    }>;
  } | null;
  order_items: Array<{
    service_id: number;
    service_variant_id?: number | null;
    quantity: number;
    catalog_price: string | number;
    applied_price: string | number;
    is_friendly_discount: boolean;
  }>;
  extras: Array<{
    extra_id: number;
    quantity: number;
    unit_price: string | number;
    is_courtesy: boolean;
  }>;
}

export interface LaundryDeliveryQuote {
  fulfillment_type: LaundryServiceFulfillmentType;
  distance_km: string;
  delivery_price_per_km: string;
  suggested_delivery_fee: string;
  manual_delivery_fee: string | null;
  final_delivery_fee: string;
  is_manual_override: boolean;
}

/** Servicio + comentarios (endpoint /messages) */
export interface LaundryServiceWithMessages extends LaundryServiceResp {
  logs: LaundryServiceLog[];
}

/** Paginación de servicios */
export interface LaundryServicePagination {
  items: LaundryServiceResp[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}



export interface LaundryServiceLite {
  id: number;
  scheduled_pickup_at: string;
  status: LaundryServiceStatus;
  service_label: LaundryServiceLabel;
  client: {
    id: number;
    name: string;
  };
  created_by_user: {
    name: string;
  };
}


export interface LaundryServiceDetail {
  id: number;
  scheduled_pickup_at: string;
  status: LaundryServiceStatus;
  service_label: LaundryServiceLabel;
  client: {
    id: number;
    name: string;
    email?: string;
    document_id?: string;
    is_deleted?: boolean;
    phones: {
      id: number;
      client_id: number;
      phone_number: string;
      description?: string;
      is_primary: boolean;
    }[];
  };
  client_address: ClientAddress;
  transaction?: TransactionFull | null;
  weight_lb?: number | null;
  notes?: string | null;
  items?: LaundryServiceItem[];
  extras?: LaundryServiceExtra[];
  items_total?: number | null;
  extras_total?: number | null;
  grand_total?: number | null;
  created_by_user: {
    name: string;
  };
}

export interface LaundryServiceCompact {
  id: number;
  pending_order?: number;
  service_label: LaundryServiceLabel;
  status: LaundryServiceStatus;
  created_at: string;
  created_by_user: {
    name: string;
  };
  created_by_user_id: number;
  client: {
    id: number;
    name: string;
  };
  client_id: number;
  client_address_id: number;
  client_address: {
    id: number;
    client_id: number;
    address_text: string;
  } | null;
  has_transaction: boolean;
}


export interface LaundryServiceLitePagination {
  items: LaundryServiceLite[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface LaundryServiceDetailPagination {
  items: LaundryServiceDetail[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}



export interface LaundryServiceCompactPagination {
  items: LaundryServiceCompact[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
