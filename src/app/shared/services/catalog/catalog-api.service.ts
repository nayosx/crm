import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { map, Observable } from 'rxjs';
import {
  CatalogFilterParams,
  CatalogListItem,
  CatalogMutationPayload,
  CatalogMutationResponse,
  CatalogResourceKind,
  PricingMode
} from '@shared/interfaces/catalog.interface';

@Injectable({
  providedIn: 'root'
})
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API}/catalog`;
  private readonly resourcePath: Record<CatalogResourceKind, string> = {
    extras: 'extras',
    'service-categories': 'service-categories',
    services: 'services',
    'service-variants': 'service-variants'
  };

  list(kind: CatalogResourceKind, filters: CatalogFilterParams = {}): Observable<CatalogListItem[]> {
    return this.http.get<unknown>(`${this.baseUrl}/${this.resourcePath[kind]}`, {
      params: this.buildParams(filters)
    }).pipe(
      map((response) => this.normalizeList(kind, response))
    );
  }

  create(kind: CatalogResourceKind, payload: CatalogMutationPayload): Observable<CatalogMutationResponse> {
    return this.http.post<CatalogMutationResponse>(`${this.baseUrl}/${this.resourcePath[kind]}`, payload);
  }

  update(
    kind: CatalogResourceKind,
    id: number,
    payload: Partial<CatalogMutationPayload>
  ): Observable<CatalogMutationResponse> {
    return this.http.put<CatalogMutationResponse>(`${this.baseUrl}/${this.resourcePath[kind]}/${id}`, payload);
  }

  delete(kind: CatalogResourceKind, id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${this.resourcePath[kind]}/${id}`);
  }

  private buildParams(filters: CatalogFilterParams): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return params;
  }

  private normalizeList(kind: CatalogResourceKind, response: unknown): CatalogListItem[] {
    const responseRecord = typeof response === 'object' && response !== null
      ? response as { items?: unknown }
      : null;
    const items = Array.isArray(response)
      ? response
      : (Array.isArray(responseRecord?.items)
        ? responseRecord.items
        : []);

    return items.map((item) => this.normalizeItem(kind, item));
  }

  private normalizeItem(kind: CatalogResourceKind, item: unknown): CatalogListItem {
    const source = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};
    const baseItem: CatalogListItem = {
      id: Number(source['id'] ?? 0),
      name: String(source['name'] ?? ''),
      is_active: source['is_active'] !== false
    };

    if (kind === 'extras') {
      return {
        ...baseItem,
        default_price: this.toMoneyString(source['default_price'])
      };
    }

    if (kind === 'services') {
      return {
        ...baseItem,
        category_id: Number(source['category_id'] ?? 0),
        pricing_mode: this.toPricingMode(source['pricing_mode'])
      };
    }

    if (kind === 'service-variants') {
      return {
        ...baseItem,
        service_id: Number(source['service_id'] ?? 0),
        price: this.toMoneyString(source['price'])
      };
    }

    return baseItem;
  }

  private toMoneyString(value: unknown): string {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value.toFixed(2);
    }

    return '0.00';
  }

  private toPricingMode(value: unknown): PricingMode {
    const normalized = String(value ?? 'FIXED').toUpperCase();
    if (normalized === 'WEIGHT' || normalized === 'DELIVERY') {
      return normalized;
    }
    return 'FIXED';
  }
}
