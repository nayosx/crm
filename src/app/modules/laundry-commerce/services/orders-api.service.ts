import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@env/environment';
import { DeliveryFeeSuggestion, Order, OrderFilters, OrderPayload } from '../interfaces/order.interface';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';
import { normalizeOrder, normalizePageResponse } from '../utils/api-normalizers.util';
import { buildHttpParams, roundCurrency } from '../utils/decimal.util';

@Injectable({
  providedIn: 'root'
})
export class OrdersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API}/v2/orders`;

  list(filters: OrderFilters = {}): import('rxjs').Observable<PaginatedResponse<Order>> {
    return this.http.get<any>(this.baseUrl, {
      params: buildHttpParams(filters)
    }).pipe(
      map((response) => normalizePageResponse({
        ...response,
        items: Array.isArray(response?.items) ? response.items.map(normalizeOrder) : []
      }))
    );
  }

  getById(id: number): import('rxjs').Observable<Order> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((response) => normalizeOrder(response))
    );
  }

  create(payload: OrderPayload): import('rxjs').Observable<Order> {
    return this.http.post<any>(this.baseUrl, payload).pipe(
      map((response) => normalizeOrder(response))
    );
  }

  update(id: number, payload: Partial<OrderPayload>): import('rxjs').Observable<Order> {
    return this.http.patch<any>(`${this.baseUrl}/${id}`, payload).pipe(
      map((response) => normalizeOrder(response))
    );
  }

  getDeliveryFeeSuggestion(params: {
    client_id: number;
    client_address_id?: number | null;
    delivery_zone_id?: number | null;
  }): import('rxjs').Observable<DeliveryFeeSuggestion> {
    return this.http.get<any>(`${this.baseUrl}/delivery-fee-suggestion`, {
      params: buildHttpParams(params)
    }).pipe(
      map((response) => ({
        client_id: Number(response?.client_id ?? 0),
        client_address_id: response?.client_address_id != null ? Number(response.client_address_id) : null,
        delivery_zone_id: response?.delivery_zone_id != null ? Number(response.delivery_zone_id) : null,
        delivery_zone_name: response?.delivery_zone_name ?? null,
        delivery_zone_price_id: response?.delivery_zone_price_id != null ? Number(response.delivery_zone_price_id) : null,
        delivery_fee_suggested_by_zone: roundCurrency(response?.delivery_fee_suggested_by_zone ?? 0),
        last_delivery_fee_final_for_client_address: roundCurrency(response?.last_delivery_fee_final_for_client_address ?? 0),
        last_delivery_fee_final_for_client: roundCurrency(response?.last_delivery_fee_final_for_client ?? 0),
        last_delivery_order_id_for_client_address: response?.last_delivery_order_id_for_client_address != null
          ? Number(response.last_delivery_order_id_for_client_address)
          : null,
        last_delivery_order_id_for_client: response?.last_delivery_order_id_for_client != null
          ? Number(response.last_delivery_order_id_for_client)
          : null,
        has_previous_delivery_for_client_address: Boolean(response?.has_previous_delivery_for_client_address),
        has_previous_delivery_for_client: Boolean(response?.has_previous_delivery_for_client),
        initial_delivery_fee_final: roundCurrency(response?.initial_delivery_fee_final ?? 0)
      }))
    );
  }
}
