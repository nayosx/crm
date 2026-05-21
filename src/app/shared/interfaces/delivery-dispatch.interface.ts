import { TransactionFull } from './transaction.interface';

export type DispatchStatus = 'ASSIGNED' | 'EN_ROUTE' | 'DELIVERED' | 'REJECTED';

export interface ClientAddressDispatch {
  id: number;
  address_text: string;
  latitude: string;
  longitude: string;
  map_link: string;
}

export interface ClientPhoneDispatch {
  id: number;
  phone_number: string;
}

export interface ClientDispatch {
  id: number;
  name: string;
  is_deleted: boolean;
  addresses: ClientAddressDispatch[];
  phones: ClientPhoneDispatch[];
}

export interface UserDriverDispatch {
  name: string;
  phone: string;
  role_id: number;
  username: string;
}

export interface UserManagerDispatch {
  name: string;
  phone: string;
}

export interface LaundryDelivery {
  id: number;
  laundry_service_id: number;
  manager_id: number;
  driver_id: number;
  scheduled_departure_time: string;
  actual_departure_time: string | null;
  customer_expected_time: string;
  actual_delivery_time: string | null;
  status: DispatchStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaundryDeliveryDetail extends LaundryDelivery {
  service: { id: number; status: string; service_label: string } | null;
  client: ClientDispatch | null;
  transaction: TransactionFull | null;
  manager: UserManagerDispatch | null;
  driver: UserDriverDispatch | null;
  status_logs: DeliveryStatusLog[];
}

export interface DeliveryStatusLog {
  id: number;
  dispatch_id: number;
  status: DispatchStatus;
  logged_at: string;
}

export interface DeliveryMetric {
  dispatch_id: number;
  laundry_service_id: number;
  client_name: string | null;
  driver_reaction_minutes: number | null;
  customer_delay_minutes: number | null;
  time_on_road_minutes: number | null;
}

export interface CreateDispatchBody {
  laundry_service_id: number;
  manager_id: number;
  driver_id: number;
  scheduled_departure_time: string;
  customer_expected_time: string;
  notes?: string | null;
}

export interface UpdateDispatchStatusBody {
  status: DispatchStatus;
  notes?: string | null;
}

export interface LaundryDeliveryEnriched extends LaundryDelivery {
  service: { id: number; status: string; service_label: string } | null;
  client: ClientDispatch | null;
  transaction: TransactionFull | null;
  manager: UserManagerDispatch | null;
  driver: UserDriverDispatch | null;
}

export interface DeliveryPagination {
  items: LaundryDelivery[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
