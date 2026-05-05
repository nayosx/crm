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
  GarmentTypeCategory,
  PricingMode
} from '@shared/interfaces/catalog.interface';

@Injectable({
  providedIn: 'root'
})
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrlMap: Record<CatalogResourceKind, string> = {
    extras: `${environment.API}/catalog`,
    'service-categories': `${environment.API}/catalog`,
    services: `${environment.API}/catalog`,
    'service-variants': `${environment.API}/catalog`,
    'garment-types': `${environment.API}/v2`
  };
  private readonly resourcePath: Record<CatalogResourceKind, string> = {
    extras: 'extras',
    'service-categories': 'service-categories',
    services: 'services',
    'service-variants': 'service-variants',
    'garment-types': 'garment_types'
  };

  list(kind: CatalogResourceKind, filters: CatalogFilterParams = {}): Observable<CatalogListItem[]> {
    return this.http.get<unknown>(`${this.baseUrlMap[kind]}/${this.resourcePath[kind]}`, {
      params: this.buildParams(filters)
    }).pipe(
      map((response) => this.normalizeList(kind, response))
    );
  }

  create(kind: CatalogResourceKind, payload: CatalogMutationPayload): Observable<CatalogMutationResponse> {
    return this.http.post<CatalogMutationResponse>(`${this.baseUrlMap[kind]}/${this.resourcePath[kind]}`, payload);
  }

  update(
    kind: CatalogResourceKind,
    id: number,
    payload: Partial<CatalogMutationPayload>
  ): Observable<CatalogMutationResponse> {
    return this.http.put<CatalogMutationResponse>(`${this.baseUrlMap[kind]}/${this.resourcePath[kind]}/${id}`, payload);
  }

  delete(kind: CatalogResourceKind, id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrlMap[kind]}/${this.resourcePath[kind]}/${id}`);
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

    if (kind === 'garment-types') {
      return {
        ...baseItem,
        is_active: true,
        category: this.toGarmentCategory(source['category'])
      };
    }

    return baseItem;
  }

  private toGarmentCategory(value: unknown): GarmentTypeCategory | undefined {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }
    const upper = value.toUpperCase();
    const valid: GarmentTypeCategory[] = ['CLOTHING', 'BEDDING', 'FOOTWEAR', 'PLUSH', 'RUG', 'HOUSEHOLD'];
    return valid.includes(upper as GarmentTypeCategory) ? (upper as GarmentTypeCategory) : undefined;
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
