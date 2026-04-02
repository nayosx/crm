import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@env/environment';
import {
  ServicePriceOption,
  ServicePriceOptionFilters,
  ServicePriceOptionPayload
} from '../interfaces/service-price-option.interface';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';
import { normalizePriceOption, wrapArrayAsPage } from '../utils/api-normalizers.util';
import { buildHttpParams } from '../utils/decimal.util';

@Injectable({
  providedIn: 'root'
})
export class ServicePriceOptionsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API}/v2/service-price-options`;

  list(filters: ServicePriceOptionFilters = {}): import('rxjs').Observable<PaginatedResponse<ServicePriceOption>> {
    return this.http.get<any>(this.baseUrl, {
      params: buildHttpParams(filters)
    }).pipe(
      map((response) => wrapArrayAsPage((Array.isArray(response) ? response : response.items ?? []).map(normalizePriceOption)))
    );
  }

  create(payload: ServicePriceOptionPayload): import('rxjs').Observable<ServicePriceOption> {
    return this.http.post<any>(this.baseUrl, {
      service_id: payload.service_id,
      label: payload.label,
      suggested_price: payload.suggested_price,
      sort_order: payload.sort_order ?? null,
      is_active: payload.is_active,
      notes: payload.notes ?? null
    }).pipe(
      map((response) => normalizePriceOption(response.service_price_option ?? response))
    );
  }

  update(id: number, payload: Partial<ServicePriceOptionPayload>): import('rxjs').Observable<ServicePriceOption> {
    return this.http.patch<any>(`${this.baseUrl}/${id}`, {
      service_id: payload.service_id,
      label: payload.label,
      suggested_price: payload.suggested_price,
      sort_order: payload.sort_order ?? null,
      is_active: payload.is_active,
      notes: payload.notes ?? null
    }).pipe(
      map((response) => normalizePriceOption(response.service_price_option ?? response))
    );
  }
}
