import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  LaundryServiceResp,
  LaundryServicePagination,
  LaundryServiceStatus,
  LaundryServiceWithMessages,
  LaundryServiceLitePagination,
  LaundryServiceDetailPagination
} from '@shared/interfaces/laundry-service.interface';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class LaundryService {
  private baseUrl = `${environment.API}/laundry_services`;

  constructor(private http: HttpClient) {}

  getAll(params?: {
    page?: number;
    per_page?: number;
    client_id?: number;
    status?: LaundryServiceStatus;
    from_date?: string;
    to_date?: string;
  }): Observable<LaundryServicePagination> {
    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<LaundryServicePagination>(this.baseUrl, { params: httpParams });
  }

  getLite(params: {
    page?: number;
    per_page?: number;
    status: LaundryServiceStatus;
    client_id?: number;
  }): Observable<LaundryServiceLitePagination> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<LaundryServiceLitePagination>(`${this.baseUrl}/lite`, { params: httpParams });
  }

  getDetail(params: {
    page?: number;
    per_page?: number;
    status: LaundryServiceStatus;
    client_id?: number;
  }): Observable<LaundryServiceDetailPagination> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<LaundryServiceDetailPagination>(`${this.baseUrl}/detail`, { params: httpParams });
  }

  getById(id: number): Observable<LaundryServiceResp> {
    return this.http.get<LaundryServiceResp>(`${this.baseUrl}/${id}`);
  }

  create(data: Partial<LaundryServiceResp>): Observable<LaundryServiceResp> {
    return this.http.post<LaundryServiceResp>(this.baseUrl, data);
  }

  update(id: number, data: Partial<LaundryServiceResp>): Observable<LaundryServiceResp> {
    return this.http.put<LaundryServiceResp>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  updateStatus(id: number, status: LaundryServiceStatus): Observable<LaundryServiceResp> {
    return this.http.patch<LaundryServiceResp>(`${this.baseUrl}/${id}/update_status`, { status });
  }


  getWithMessages(id: number): Observable<LaundryServiceWithMessages> {
    return this.http.get<LaundryServiceWithMessages>(`${this.baseUrl}/${id}/notes`);
  }
}
