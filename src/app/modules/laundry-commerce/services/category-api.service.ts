import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@env/environment';
import { ServiceCategory, ServiceCategoryFilters, ServiceCategoryPayload } from '../interfaces/category.interface';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';
import { normalizeCategory, wrapArrayAsPage } from '../utils/api-normalizers.util';
import { buildHttpParams } from '../utils/decimal.util';

@Injectable({
  providedIn: 'root'
})
export class CategoryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API}/v2/service-categories`;

  list(filters: ServiceCategoryFilters = {}): import('rxjs').Observable<PaginatedResponse<ServiceCategory>> {
    return this.http.get<any>(this.baseUrl, {
      params: buildHttpParams(filters)
    }).pipe(
      map((response) => wrapArrayAsPage((Array.isArray(response) ? response : response.items ?? []).map(normalizeCategory)))
    );
  }

  create(payload: ServiceCategoryPayload): import('rxjs').Observable<ServiceCategory> {
    return this.http.post<any>(this.baseUrl, payload).pipe(
      map((response) => normalizeCategory(response.service_category ?? response))
    );
  }

  update(id: number, payload: Partial<ServiceCategoryPayload>): import('rxjs').Observable<ServiceCategory> {
    return this.http.patch<any>(`${this.baseUrl}/${id}`, payload).pipe(
      map((response) => normalizeCategory(response.service_category ?? response))
    );
  }
}
