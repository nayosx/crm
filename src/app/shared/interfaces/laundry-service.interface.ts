import { Client, ClientAddress, ClientFullResponse } from "./client.interface";
import { TransactionFull } from "./transaction.interface";
import { User } from "./user.interface";

export type LaundryServiceStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export const LaundryServiceStatusValues: LaundryServiceStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED'
];



export interface ClientPageResponse {
  total: number;
  pages: number;
  current_page: number;
  per_page: number;
  items: Client[];
}

export interface TransactionDetail {
  id: number;
  amount: number;
  type: string;
  created_at: string;
}

export interface UserFull {
  id: number;
  name: string;
  username: string;
  phone: string;
  role_id: number;
  created_at: string;
  updated_at: string;
}

export interface LaundryServiceResp {
  id: number;
  scheduled_pickup_at: string;
  status: LaundryServiceStatus;
  service_label: 'NORMAL' | 'EXPRESS';
  detail?: string;
  created_at: string;
  updated_at: string;
  client?: ClientFullResponse;
  client_id?: number;
  client_address?: ClientAddress;
  transaction?: TransactionDetail;
  created_by?: User;
}

export interface LaundryServicePagination {
  items: LaundryServiceResp[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
