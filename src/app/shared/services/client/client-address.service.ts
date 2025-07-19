import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { ClientAddress } from '@shared/interfaces/client.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClientAddressService {
  private readonly apiUrl = `${environment.API}/client-addresses`;

  constructor(private http: HttpClient) {}

  getAddresses(): Observable<ClientAddress[]> {
    return this.http.get<ClientAddress[]>(this.apiUrl);
  }

  getAddressesByClientId(clientId: number): Observable<ClientAddress[]> {
    return this.http.get<ClientAddress[]>(`${this.apiUrl}?client_id=${clientId}`);
  }

  getAddress(id: number): Observable<ClientAddress> {
    return this.http.get<ClientAddress>(`${this.apiUrl}/${id}`);
  }

  createAddress(address: Partial<ClientAddress>): Observable<ClientAddress> {
    return this.http.post<ClientAddress>(this.apiUrl, address);
  }

  updateAddress(id: number, address: Partial<ClientAddress>): Observable<ClientAddress> {
    return this.http.put<ClientAddress>(`${this.apiUrl}/${id}`, address);
  }

  deleteAddress(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}