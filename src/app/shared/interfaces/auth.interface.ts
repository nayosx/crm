export interface UserData {
  id: number;
  name: string;
  username: string;
  phone: string;
  role_id: number;
  created_at: string;
  updated_at: string;
}


export interface LoginResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  user: UserData;
}
