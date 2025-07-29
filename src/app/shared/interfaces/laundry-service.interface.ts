import { Client, ClientAddress, ClientFullResponse } from "./client.interface";
import { TransactionFull } from "./transaction.interface";
import { User } from "./user.interface";

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
export interface TransactionDetail {
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
  service_label: 'NORMAL' | 'EXPRESS';
  created_at: string;
  updated_at: string;
  client?: ClientFullResponse;
  client_id?: number;
  client_address?: ClientAddress;
  transaction?: TransactionDetail;
  created_by?: User;
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
  service_label: 'NORMAL' | 'EXPRESS';
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
  service_label: 'NORMAL' | 'EXPRESS';
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
  transaction?: TransactionDetail | null;
  created_by_user: {
    name: string;
  };
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
