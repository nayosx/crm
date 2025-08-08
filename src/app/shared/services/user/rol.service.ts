import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role, User } from '@shared/interfaces/user.interface';
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
}