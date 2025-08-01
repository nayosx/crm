export interface Role {
  id: number;
  name: string;
  description: string;
}

export interface User {
  id: number;
  username: string;
  role_id: number;
  phone: string;
  name: string;
  role?: Role;
}

export interface ForcePasswordRequest {
  new_password: string;
}

export interface ForcePasswordResponse {
  message: string;
}
