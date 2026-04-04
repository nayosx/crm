import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class GlobalSettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API}/v2/global-settings`;

  getDeliveryPricePerKm(): import('rxjs').Observable<number> {
    return this.http.get<any>(`${this.baseUrl}/delivery_price_per_km`).pipe(
      map((response) => Number(response?.value ?? response?.setting?.value ?? 0))
    );
  }

  getExpressServiceSurcharge(): import('rxjs').Observable<number> {
    return this.http.get<any>(`${this.baseUrl}/express_service_surcharge`).pipe(
      map((response) => Number(response?.value ?? response?.setting?.value ?? 0))
    );
  }
}
