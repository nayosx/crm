import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ForcePasswordRequest, ForcePasswordResponse, User } from '@shared/interfaces/user.interface';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.API}/users`;

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}`);
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  createUser(data: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, data);
  }

  updateUser(id: number, data: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, data);
  }

  deleteUser(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getUserslite(rol:number = 0): Observable<User[]> {
    
    if (rol > 0) {
      return this.http.get<User[]>(`${this.apiUrl}?lite=true&role_id=${rol}`);
    }

    return this.http.get<User[]>(`${this.apiUrl}?lite=true`);
  }

  updatePasswordByAdmin(userId: number, payload: ForcePasswordRequest): Observable<ForcePasswordResponse> {
    return this.http.put<ForcePasswordResponse>(`${this.apiUrl}/${userId}/force-password`, payload);
  }

}