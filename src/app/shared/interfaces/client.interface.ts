export interface Client {
  id: number;
  name: string;
  email?: string;
  document_id?: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClientPageResponse {
  total: number;
  pages: number;
  current_page: number;
  per_page: number;
  items: Client[];
}

export interface ClientPhone {
  id: number;
  client_id: number;
  phone_number: string;
  description?: string;
  is_primary: boolean;
}

export interface ClientAddress {
  id: number;
  client_id: number;
  address_text: string;
  latitude?: number;
  longitude?: number;
  map_link?: string;
  image_path?: string;
  is_primary: boolean;
}
