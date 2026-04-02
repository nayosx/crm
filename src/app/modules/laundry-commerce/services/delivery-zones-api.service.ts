import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@env/environment';
import {
  DeliveryZone,
  DeliveryZoneFilters,
  DeliveryZonePayload,
  DeliveryZonePrice,
  DeliveryZonePricePayload
} from '../interfaces/delivery-zone.interface';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';
import { normalizeDeliveryZone, normalizeDeliveryZonePrice, wrapArrayAsPage } from '../utils/api-normalizers.util';
import { buildHttpParams } from '../utils/decimal.util';

@Injectable({
  providedIn: 'root'
})
export class DeliveryZonesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API}/v2/delivery-zones`;

  list(filters: DeliveryZoneFilters = {}): import('rxjs').Observable<PaginatedResponse<DeliveryZone>> {
    return this.http.get<any>(this.baseUrl, {
      params: buildHttpParams(filters)
    }).pipe(
      map((response) => wrapArrayAsPage((Array.isArray(response) ? response : response.items ?? []).map(normalizeDeliveryZone)))
    );
  }

  create(payload: DeliveryZonePayload): import('rxjs').Observable<DeliveryZone> {
    return this.http.post<any>(this.baseUrl, {
      name: payload.name,
      code: payload.code ?? null,
      description: payload.description ?? null,
      is_active: payload.is_active,
      current_fee: payload.current_fee ?? null
    }).pipe(
      map((response) => normalizeDeliveryZone(response.delivery_zone ?? response))
    );
  }

  update(id: number, payload: Partial<DeliveryZonePayload>): import('rxjs').Observable<DeliveryZone> {
    return this.http.patch<any>(`${this.baseUrl}/${id}`, {
      name: payload.name,
      code: payload.code ?? null,
      description: payload.description ?? null,
      is_active: payload.is_active
    }).pipe(
      map((response) => normalizeDeliveryZone(response.delivery_zone ?? response))
    );
  }

  createPrice(id: number, payload: DeliveryZonePricePayload): import('rxjs').Observable<DeliveryZonePrice> {
    return this.http.post<any>(`${this.baseUrl}/${id}/prices`, {
      fee_amount: payload.price
    }).pipe(
      map((response) => normalizeDeliveryZonePrice(response.delivery_zone_price ?? response))
    );
  }
}
