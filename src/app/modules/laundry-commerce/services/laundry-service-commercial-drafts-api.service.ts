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

export type LaundryServiceCommercialOrderRecord = {
  id: number;
  payment_type_id?: number | null;
  payment_type_name?: string | null;
  status?: string | null;
  total_amount?: number | string | null;
  final_amount?: number | string | null;
  grand_total?: number | string | null;
  total?: number | string | null;
  [key: string]: unknown;
};

export type LaundryServiceCommercialDraftRecord = {
  id: number;
  payload: Record<string, unknown>;
  laundry_service_id: number | null;
  is_confirmed: boolean;
  confirmed_at: string | null;
  charged_by_user_id: number | null;
  quoted_service_amount?: number | string | null;
  order?: LaundryServiceCommercialOrderRecord | null;
};

export type LaundryServiceCommercialDraftConfirmResponse = {
  draft: LaundryServiceCommercialDraftRecord;
  order: LaundryServiceCommercialOrderRecord | null;
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

  confirmByService(laundryServiceId: number): import('rxjs').Observable<LaundryServiceCommercialDraftConfirmResponse> {
    return this.http.post<LaundryServiceCommercialDraftConfirmResponse>(
      `${this.baseUrl}/by-service/${laundryServiceId}/confirm`,
      {}
    );
  }

  update(id: number, payload: Partial<LaundryServiceCommercialDraftPayload>): import('rxjs').Observable<LaundryServiceCommercialDraftRecord> {
    return this.http.patch<LaundryServiceCommercialDraftRecord>(`${this.baseUrl}/${id}`, payload);
  }
}
