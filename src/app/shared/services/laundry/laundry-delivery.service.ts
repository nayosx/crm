import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CreateDispatchBody,
  DeliveryMetric,
  DeliveryPagination,
  DeliveryStatusLog,
  LaundryDelivery,
  LaundryDeliveryDetail,
  UpdateDispatchStatusBody
} from '@shared/interfaces/delivery-dispatch.interface';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class LaundryDeliveryService {
  private baseUrl = `${environment.API}/laundry_deliveries`;

  constructor(private http: HttpClient) {}

  getAll(params?: {
    page?: number;
    per_page?: number;
    laundry_service_id?: number;
    manager_id?: number;
    driver_id?: number;
    status?: string;
    from_date?: string;
    to_date?: string;
  }): Observable<DeliveryPagination> {
    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<DeliveryPagination>(this.baseUrl, { params: httpParams });
  }

  getById(id: number): Observable<LaundryDeliveryDetail> {
    return this.http.get<LaundryDeliveryDetail>(`${this.baseUrl}/${id}`);
  }

  create(body: CreateDispatchBody): Observable<LaundryDelivery> {
    return this.http.post<LaundryDelivery>(this.baseUrl, body);
  }

  update(id: number, body: Partial<CreateDispatchBody>): Observable<LaundryDelivery> {
    return this.http.put<LaundryDelivery>(`${this.baseUrl}/${id}`, body);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  updateStatus(id: number, body: UpdateDispatchStatusBody): Observable<LaundryDelivery> {
    return this.http.patch<LaundryDelivery>(`${this.baseUrl}/${id}/update_status`, body);
  }

  getStatusLogs(dispatchId: number): Observable<{ items: DeliveryStatusLog[] }> {
    return this.http.get<{ items: DeliveryStatusLog[] }>(`${this.baseUrl}/${dispatchId}/status-logs`);
  }

  getMetrics(params?: {
    driver_id?: number;
    date_from?: string;
    date_to?: string;
  }): Observable<{ items: DeliveryMetric[] }> {
    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<{ items: DeliveryMetric[] }>(`${this.baseUrl}/metrics`, { params: httpParams });
  }
}
