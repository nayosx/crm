export interface BackendMenuNode {
  id: number;
  key: string;
  label: string;
  path: string | null;
  icon: string | null;
  show_in_sidebar: boolean;
  order: number;
  parent_id: number | null;
  children: BackendMenuNode[];
  created_at?: string;
  updated_at?: string;
}

export interface BackendMenuFlatItem {
  id: number;
  key: string;
  label: string;
  path: string | null;
  icon: string | null;
  show_in_sidebar: boolean;
  order: number;
  parent_id: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface RoleMenuCatalogResponse {
  role: {
    id: number;
    name: string;
    description: string;
  };
  catalog: BackendMenuFlatItem[];
  assigned_menu_keys: string[];
}

export interface UpdateRoleMenusPayload {
  menu_keys: string[];
}

export interface CreateMenuPayload {
  key?: string | null;
  label: string;
  path?: string | null;
  icon?: string | null;
  show_in_sidebar?: boolean;
  order?: number | null;
  parent_id?: number | null;
}

export type UpdateMenuPayload = Partial<CreateMenuPayload>;

export interface NavigationMenuItem {
  key: string;
  label: string;
  icon?: string | null;
  routerLink?: string[];
  items?: NavigationMenuItem[];
}
