import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@env/environment';
import { Extra, ExtraFilters, ExtraPayload } from '../interfaces/extra.interface';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';
import { normalizeExtra, wrapArrayAsPage } from '../utils/api-normalizers.util';
import { buildHttpParams } from '../utils/decimal.util';

@Injectable({
  providedIn: 'root'
})
export class ExtrasApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API}/v2/extras`;

  list(filters: ExtraFilters = {}): import('rxjs').Observable<PaginatedResponse<Extra>> {
    return this.http.get<any>(this.baseUrl, {
      params: buildHttpParams(filters)
    }).pipe(
      map((response) => wrapArrayAsPage((Array.isArray(response) ? response : response.items ?? []).map(normalizeExtra)))
    );
  }

  create(payload: ExtraPayload): import('rxjs').Observable<Extra> {
    return this.http.post<any>(this.baseUrl, {
      name: payload.name,
      code: payload.code ?? null,
      description: payload.description ?? null,
      unit_label: payload.unit_label ?? null,
      suggested_unit_price: payload.suggested_unit_price,
      is_active: payload.is_active
    }).pipe(
      map((response) => normalizeExtra(response.extra ?? response))
    );
  }

  update(id: number, payload: Partial<ExtraPayload>): import('rxjs').Observable<Extra> {
    return this.http.patch<any>(`${this.baseUrl}/${id}`, {
      name: payload.name,
      code: payload.code ?? null,
      description: payload.description ?? null,
      unit_label: payload.unit_label ?? null,
      suggested_unit_price: payload.suggested_unit_price,
      is_active: payload.is_active
    }).pipe(
      map((response) => normalizeExtra(response.extra ?? response))
    );
  }
}
