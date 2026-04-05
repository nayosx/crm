import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { buildHttpParams } from '../utils/decimal.util';

export type LaundryServiceCommercialDraftPayload = {
  payload: Record<string, unknown>;
  laundry_service_id: number | null;
  is_confirmed: boolean;
  confirmed_at: string | null;
  charged_by_user_id: number | null;
};

export type LaundryServiceCommercialDraftRecord = {
  id: number;
  payload: Record<string, unknown>;
  laundry_service_id: number | null;
  is_confirmed: boolean;
  confirmed_at: string | null;
  charged_by_user_id: number | null;
  quoted_service_amount?: number | string | null;
};

@Injectable({
  providedIn: 'root'
})
export class LaundryServiceCommercialDraftsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API}/v2/laundry-service-commercial-drafts`;

  list(filters?: {
    laundry_service_id?: number | null;
    client_id?: number | null;
    is_confirmed?: boolean | null;
    page?: number;
    per_page?: number;
  }): import('rxjs').Observable<{
    items: LaundryServiceCommercialDraftRecord[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
  }> {
    return this.http.get<{
      items: LaundryServiceCommercialDraftRecord[];
      total: number;
      page: number;
      per_page: number;
      pages: number;
    }>(this.baseUrl, {
      params: buildHttpParams(filters ?? {})
    });
  }

  create(payload: LaundryServiceCommercialDraftPayload): import('rxjs').Observable<LaundryServiceCommercialDraftRecord> {
    return this.http.post<LaundryServiceCommercialDraftRecord>(this.baseUrl, payload);
  }

  getByService(laundryServiceId: number): import('rxjs').Observable<LaundryServiceCommercialDraftRecord> {
    return this.http.get<LaundryServiceCommercialDraftRecord>(`${this.baseUrl}/by-service/${laundryServiceId}`);
  }

  saveByService(
    laundryServiceId: number,
    payload: Omit<LaundryServiceCommercialDraftPayload, 'laundry_service_id'>
  ): import('rxjs').Observable<LaundryServiceCommercialDraftRecord> {
    return this.http.put<LaundryServiceCommercialDraftRecord>(`${this.baseUrl}/by-service/${laundryServiceId}`, payload);
  }

  update(id: number, payload: Partial<LaundryServiceCommercialDraftPayload>): import('rxjs').Observable<LaundryServiceCommercialDraftRecord> {
    return this.http.patch<LaundryServiceCommercialDraftRecord>(`${this.baseUrl}/${id}`, payload);
  }
}
