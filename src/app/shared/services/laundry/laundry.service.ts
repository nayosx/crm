import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import {
  LaundryServiceResp,
  LaundryServicePagination,
  LaundryServiceStatus,
  LaundryServiceWithMessages,
  LaundryServiceLitePagination,
  LaundryServiceDetailPagination,
  LaundryServiceCompactPagination
} from '@shared/interfaces/laundry-service.interface';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class LaundryService {
  private legacyBaseUrl = `${environment.API}/laundry_services`;
  private v2BaseUrl = `${environment.API}/v2/laundry_services`;

  constructor(private http: HttpClient) { }

  getAll(params?: {
    page?: number;
    per_page?: number;
    client_id?: number;
    status?: LaundryServiceStatus;
  }): Observable<LaundryServicePagination> {
    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<LaundryServicePagination>(this.v2BaseUrl, { params: httpParams });
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

    return this.getAll({
      page: params.page,
      per_page: params.per_page,
      client_id: params.client_id,
      status: params.status
    }).pipe(
      map((response) => ({
        ...response,
        items: response.items.map((item) => ({
          id: item.id,
          scheduled_pickup_at: item.scheduled_pickup_at,
          status: item.status,
          service_label: item.service_label,
          client: item.client ?? {
            id: item.client_id ?? 0,
            name: 'Cliente no definido'
          },
          created_by_user: {
            name: item.created_by_user?.name ?? item.created_by?.name ?? 'Sistema'
          }
        }))
      }))
    );
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

    return this.getAll({
      page: params.page,
      per_page: params.per_page,
      client_id: params.client_id,
      status: params.status
    }).pipe(
      map((response) => ({
        ...response,
        items: response.items.map((item) => ({
          id: item.id,
          scheduled_pickup_at: item.scheduled_pickup_at,
          status: item.status,
          service_label: item.service_label,
          client: {
            id: item.client?.id ?? item.client_id ?? 0,
            name: item.client?.name ?? 'Cliente no definido',
            email: item.client?.email,
            document_id: item.client?.document_id,
            is_deleted: item.client?.is_deleted,
            phones: item.client?.phones ?? []
          },
          client_address: item.client_address ?? {
            id: item.client_address_id ?? 0,
            client_id: item.client_id ?? 0,
            address_text: 'Sin dirección registrada',
            is_primary: false
          },
          transaction: item.transaction ? ({ ...item.transaction } as any) : null,
          weight_lb: item.weight_lb ?? null,
          notes: item.notes ?? null,
          items: item.items ?? [],
          extras: item.extras ?? [],
          items_total: item.items_total ?? null,
          extras_total: item.extras_total ?? null,
          grand_total: item.grand_total ?? null,
          created_by_user: {
            name: item.created_by_user?.name ?? item.created_by?.name ?? 'Sistema'
          }
        }))
      }))
    );
  }


  getCompact(params: {
    page?: number;
    per_page?: number;
    status?: LaundryServiceStatus;
    client_id?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
  }): Observable<LaundryServiceCompactPagination> {
    let httpParams = new HttpParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.getAll({
      page: params.page,
      per_page: params.per_page,
      client_id: params.client_id,
      status: params.status
    }).pipe(
      map((response) => ({
        ...response,
        items: response.items
          .map((item) => ({
            id: item.id,
            pending_order: item.pending_order ?? undefined,
            service_label: item.service_label,
            status: item.status,
            created_at: item.created_at,
            created_by_user: {
              name: item.created_by_user?.name ?? item.created_by?.name ?? 'Sistema'
            },
            created_by_user_id: item.created_by_user?.id ?? item.created_by?.id ?? 0,
            client: item.client ?? {
              id: item.client_id ?? 0,
              name: 'Cliente no definido'
            },
            client_id: item.client_id ?? item.client?.id ?? 0,
            client_address_id: item.client_address_id ?? item.client_address?.id ?? 0,
            client_address: item.client_address ?? null,
            has_transaction: Boolean(item.transaction_id ?? item.transaction)
          }))
          .sort((a, b) => {
            if (params.sort_by === 'pending_order') {
              const ao = a.pending_order ?? Number.MAX_SAFE_INTEGER;
              const bo = b.pending_order ?? Number.MAX_SAFE_INTEGER;
              if (ao !== bo) {
                return params.sort_dir === 'desc' ? bo - ao : ao - bo;
              }
            }

            return a.id - b.id;
          })
      }))
    );
  }

  getById(id: number): Observable<LaundryServiceResp> {
    return this.http.get<LaundryServiceResp>(`${this.v2BaseUrl}/${id}`);
  }

  create(data: Partial<LaundryServiceResp>): Observable<LaundryServiceResp> {
    return this.http.post<LaundryServiceResp>(this.v2BaseUrl, data);
  }

  update(id: number, data: Partial<LaundryServiceResp>): Observable<LaundryServiceResp> {
    return this.http.put<LaundryServiceResp>(`${this.v2BaseUrl}/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.v2BaseUrl}/${id}`);
  }

  updateStatus(id: number, status: LaundryServiceStatus): Observable<LaundryServiceResp> {
    return this.http.put<LaundryServiceResp>(`${this.v2BaseUrl}/${id}`, { status });
  }


  getWithMessages(id: number): Observable<LaundryServiceWithMessages> {
    return this.http.get<LaundryServiceWithMessages>(`${this.v2BaseUrl}/${id}/notes`);
  }

  reorderPending(ids: number[]): Observable<{ message?: string }> {
    return this.http.patch<{ message?: string }>(`${this.legacyBaseUrl}/pending/reorder`, { ids });
  }
}
