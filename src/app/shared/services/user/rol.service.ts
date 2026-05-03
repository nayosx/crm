import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role, User } from '@shared/interfaces/user.interface';
import { RoleMenuCatalogResponse, UpdateRoleMenusPayload } from '@shared/interfaces/menu.interface';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class RolService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.API}/roles`;

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}`);
  }

  getRole(id: number): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/${id}`);
  }

  createRole(data: Partial<Role>): Observable<Role> {
    return this.http.post<Role>(`${this.apiUrl}`, data);
  }

  updateRole(id: number, data: Partial<Role>): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/${id}`, data);
  }

  deleteRole(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getUsersByRole(roleId: number): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/${roleId}/users`);
  }

  getMenusByRole(roleId: number): Observable<RoleMenuCatalogResponse> {
    return this.http.get<RoleMenuCatalogResponse>(`${this.apiUrl}/${roleId}/menus`);
  }

  updateMenusByRole(
    roleId: number,
    payload: UpdateRoleMenusPayload
  ): Observable<{ message: string; role_id: number; assigned_menu_keys: string[] }> {
    return this.http.put<{ message: string; role_id: number; assigned_menu_keys: string[] }>(
      `${this.apiUrl}/${roleId}/menus`,
      payload
    );
  }
}
