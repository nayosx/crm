import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { map, Observable } from 'rxjs';

export interface LaundryCommercialCatalogServiceItem {
  id: number;
  name: string;
  pricing_mode: string;
  category_name: string | null;
  is_active: boolean;
  default_catalog_price: number;
}

export interface LaundryCommercialCatalogVariantItem {
  id: number;
  service_id: number;
  name: string;
  catalog_price: number;
}

export interface LaundryCommercialCatalogExtraItem {
  id: number;
  name: string;
  is_active: boolean;
  default_unit_price: number;
}

@Injectable({
  providedIn: 'root'
})
export class LaundryCommercialCatalogService {
  constructor(private readonly http: HttpClient) {}

  listManualServices(): Observable<LaundryCommercialCatalogServiceItem[]> {
    const params = new HttpParams().set('is_active', 'true');

    return this.http.get<any>(`${environment.API}/catalog/services`, { params }).pipe(
      map((response) => {
        const items = Array.isArray(response) ? response : response.items ?? [];

        return items
          .map((item: any) => ({
            id: Number(item.id),
            name: item.name ?? 'Servicio',
            pricing_mode: String(item.pricing_mode ?? ''),
            category_name: item.category_name ?? item.category?.name ?? null,
            is_active: item.is_active !== false,
            default_catalog_price: Number(
              item.default_catalog_price
              ?? item.default_price
              ?? item.catalog_price
              ?? item.price
              ?? 0
            )
          }))
          .filter((item: LaundryCommercialCatalogServiceItem) => {
            const pricingMode = item.pricing_mode.toUpperCase();
            const categoryName = (item.category_name ?? '').toLowerCase();

            return item.is_active
              && pricingMode !== 'DELIVERY'
              && !categoryName.includes('delivery')
              && !categoryName.includes('recargo')
              && !categoryName.includes('surcharge');
          });
      })
    );
  }

  listVariantsByService(serviceId: number): Observable<LaundryCommercialCatalogVariantItem[]> {
    const params = new HttpParams().set('service_id', String(serviceId));

    return this.http.get<any>(`${environment.API}/catalog/service-variants`, { params }).pipe(
      map((response) => {
        const items = Array.isArray(response) ? response : response.items ?? [];

        return items.map((item: any) => ({
          id: Number(item.id),
          service_id: Number(item.service_id ?? serviceId),
          name: item.name ?? 'Variante',
          catalog_price: Number(
            item.catalog_price
            ?? item.default_catalog_price
            ?? item.default_price
            ?? item.price
            ?? 0
          )
        }));
      })
    );
  }

  listExtras(): Observable<LaundryCommercialCatalogExtraItem[]> {
    const params = new HttpParams().set('is_active', 'true');

    return this.http.get<any>(`${environment.API}/catalog/extras`, { params }).pipe(
      map((response) => {
        const items = Array.isArray(response) ? response : response.items ?? [];

        return items.map((item: any) => ({
          id: Number(item.id),
          name: item.name ?? 'Extra',
          is_active: item.is_active !== false,
          default_unit_price: Number(
            item.default_price
            ?? item.default_unit_price
            ?? item.unit_price
            ?? item.price
            ?? 0
          )
        }));
      })
    );
  }
}
