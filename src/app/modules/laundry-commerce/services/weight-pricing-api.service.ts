import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@env/environment';
import {
  WeightPricingProfile,
  WeightPricingProfileFilters,
  WeightPricingProfilePayload,
  WeightPricingQuoteRequest,
  WeightPricingQuoteResponse,
  WeightPricingTier,
  WeightPricingTierFilters,
  WeightPricingTierPayload
} from '../interfaces/weight-pricing.interface';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';
import {
  normalizeWeightPricingProfile,
  normalizeWeightPricingQuote,
  normalizeWeightPricingTier,
  wrapArrayAsPage
} from '../utils/api-normalizers.util';
import { buildHttpParams } from '../utils/decimal.util';

@Injectable({
  providedIn: 'root'
})
export class WeightPricingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API}/v2/weight-pricing`;

  listProfiles(filters: WeightPricingProfileFilters = {}): import('rxjs').Observable<PaginatedResponse<WeightPricingProfile>> {
    return this.http.get<any>(`${this.baseUrl}/profiles`, {
      params: buildHttpParams(filters)
    }).pipe(
      map((response) => wrapArrayAsPage((Array.isArray(response) ? response : response.items ?? []).map(normalizeWeightPricingProfile)))
    );
  }

  createProfile(payload: WeightPricingProfilePayload): import('rxjs').Observable<WeightPricingProfile> {
    return this.http.post<any>(`${this.baseUrl}/profiles`, payload).pipe(
      map((response) => normalizeWeightPricingProfile(response.weight_pricing_profile ?? response))
    );
  }

  updateProfile(id: number, payload: Partial<WeightPricingProfilePayload>): import('rxjs').Observable<WeightPricingProfile> {
    return this.http.patch<any>(`${this.baseUrl}/profiles/${id}`, payload).pipe(
      map((response) => normalizeWeightPricingProfile(response.weight_pricing_profile ?? response))
    );
  }

  listTiers(filters: WeightPricingTierFilters = {}): import('rxjs').Observable<PaginatedResponse<WeightPricingTier>> {
    return this.http.get<any>(`${this.baseUrl}/tiers`, {
      params: buildHttpParams(filters)
    }).pipe(
      map((response) => wrapArrayAsPage((Array.isArray(response) ? response : response.items ?? []).map(normalizeWeightPricingTier)))
    );
  }

  createTier(payload: WeightPricingTierPayload): import('rxjs').Observable<WeightPricingTier> {
    return this.http.post<any>(`${this.baseUrl}/tiers`, payload).pipe(
      map((response) => normalizeWeightPricingTier(response.weight_pricing_tier ?? response))
    );
  }

  updateTier(id: number, payload: Partial<WeightPricingTierPayload>): import('rxjs').Observable<WeightPricingTier> {
    return this.http.patch<any>(`${this.baseUrl}/tiers/${id}`, payload).pipe(
      map((response) => normalizeWeightPricingTier(response.weight_pricing_tier ?? response))
    );
  }

  quote(payload: WeightPricingQuoteRequest): import('rxjs').Observable<WeightPricingQuoteResponse> {
    return this.http.post<any>(`${this.baseUrl}/quote`, payload).pipe(
      map((response) => normalizeWeightPricingQuote(response))
    );
  }
}
