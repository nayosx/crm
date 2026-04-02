import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@env/environment';
import {
  LaundryCommercialService,
  LaundryCommercialServiceFilters,
  LaundryCommercialServicePayload
} from '../interfaces/service.interface';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';
import { normalizeService, wrapArrayAsPage } from '../utils/api-normalizers.util';
import { buildHttpParams } from '../utils/decimal.util';

@Injectable({
  providedIn: 'root'
})
export class ServicesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API}/v2/services`;

  list(filters: LaundryCommercialServiceFilters = {}): import('rxjs').Observable<PaginatedResponse<LaundryCommercialService>> {
    return this.http.get<any>(this.baseUrl, {
      params: buildHttpParams({
        category_id: filters.category_id,
        pricing_mode: filters.service_type === 'WEIGHT' ? 'WEIGHT' : filters.service_type === 'UNIT' ? 'FIXED' : undefined,
        is_active: filters.is_active
      })
    }).pipe(
      map((response) => wrapArrayAsPage((Array.isArray(response) ? response : response.items ?? []).map(normalizeService)))
    );
  }

  create(payload: LaundryCommercialServicePayload): import('rxjs').Observable<LaundryCommercialService> {
    return this.http.post<any>(this.baseUrl, {
      category_id: payload.category_id,
      name: payload.name,
      code: payload.code ?? null,
      description: payload.description ?? null,
      pricing_mode: payload.service_type === 'WEIGHT' ? 'WEIGHT' : 'FIXED',
      unit_label: payload.unit_label ?? null,
      allow_manual_price_override: payload.allow_manual_override,
      allow_item_discount: true,
      is_active: payload.is_active
    }).pipe(
      map((response) => normalizeService(response.service ?? response))
    );
  }

  update(id: number, payload: Partial<LaundryCommercialServicePayload>): import('rxjs').Observable<LaundryCommercialService> {
    return this.http.patch<any>(`${this.baseUrl}/${id}`, {
      category_id: payload.category_id,
      name: payload.name,
      code: payload.code ?? null,
      description: payload.description ?? null,
      pricing_mode: payload.service_type ? (payload.service_type === 'WEIGHT' ? 'WEIGHT' : 'FIXED') : undefined,
      unit_label: payload.unit_label ?? null,
      allow_manual_price_override: payload.allow_manual_override,
      is_active: payload.is_active
    }).pipe(
      map((response) => normalizeService(response.service ?? response))
    );
  }
}
