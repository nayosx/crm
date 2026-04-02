import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@env/environment';
import { Order, OrderFilters, OrderPayload } from '../interfaces/order.interface';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';
import { normalizeOrder, normalizePageResponse } from '../utils/api-normalizers.util';
import { buildHttpParams } from '../utils/decimal.util';

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
}
