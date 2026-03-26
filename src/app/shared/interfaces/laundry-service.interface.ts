import { Client, ClientAddress, ClientFullResponse } from "./client.interface";
import { TransactionFull } from "./transaction.interface";
import { User } from "./user.interface";

export type LaundryServiceLabel = 'NORMAL' | 'EXPRESS';
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
