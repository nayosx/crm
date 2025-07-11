import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClientPhone } from '@shared/interfaces/client.interface';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientPhoneService {
  private readonly baseUrl = `${environment.API}/client-phones`;

  constructor(private http: HttpClient) {}

  getPhones(): Observable<ClientPhone[]> {
    return this.http.get<ClientPhone[]>(this.baseUrl);
  }

  getPhone(id: number): Observable<ClientPhone> {
    return this.http.get<ClientPhone>(`${this.baseUrl}/${id}`);
  }

  createPhone(phone: Partial<ClientPhone>): Observable<ClientPhone> {
    return this.http.post<ClientPhone>(this.baseUrl, phone);
  }

  updatePhone(id: number, phone: Partial<ClientPhone>): Observable<ClientPhone> {
    return this.http.put<ClientPhone>(`${this.baseUrl}/${id}`, phone);
  }

  deletePhone(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}
