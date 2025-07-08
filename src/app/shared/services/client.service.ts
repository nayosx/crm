import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Client, ClientPageResponse } from '@shared/interfaces/client.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly baseUrl = `${environment.API}/clients`;

  constructor(private http: HttpClient) {}

  getClients(params?: { page?: number; per_page?: number; q?: string }): Observable<ClientPageResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page !== undefined) {
        httpParams = httpParams.set('page', params.page.toString());
      }
      if (params.per_page !== undefined) {
        httpParams = httpParams.set('per_page', params.per_page.toString());
      }
      if (params.q) {
        httpParams = httpParams.set('q', params.q);
      }
    }

    return this.http.get<ClientPageResponse>(this.baseUrl, { params: httpParams });
  }

  getClient(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.baseUrl}/${id}`);
  }

  createClient(client: Partial<Client>): Observable<Client> {
    return this.http.post<Client>(this.baseUrl, client);
  }

  updateClient(id: number, client: Partial<Client>): Observable<Client> {
    return this.http.put<Client>(`${this.baseUrl}/${id}`, client);
  }

  deleteClient(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}