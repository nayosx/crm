import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { PaymentSurchargeType, PaymentType } from '@shared/interfaces/transaction.interface';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PaymentTypeService {
  private readonly cacheKey = 'payment_types_cache';
  private readonly apiUrl = `${environment.API}/payment_types`;

  constructor(private http: HttpClient) {}

  getPaymentTypes(): Observable<PaymentType[]> {
    const cached = sessionStorage.getItem(this.cacheKey);

    if (cached) {
      return of(this.normalizeCollection(JSON.parse(cached) as PaymentType[]));
    }

    return this.http.get<PaymentType[]>(this.apiUrl).pipe(
      tap((data) => console.log('[PaymentTypeService] Raw payment types response:', data)),
      map((data) => this.normalizeCollection(data)),
      tap((data) => sessionStorage.setItem(this.cacheKey, JSON.stringify(data)))
    );
  }

  clearCache(): void {
    sessionStorage.removeItem(this.cacheKey);
  }

  private normalizeCollection(paymentTypes: PaymentType[]): PaymentType[] {
    return paymentTypes
      .map((paymentType) => this.normalizePaymentType(paymentType))
      .filter((paymentType) => paymentType.is_active !== false)
      .sort((left, right) => (left.sort_order ?? Number.MAX_SAFE_INTEGER) - (right.sort_order ?? Number.MAX_SAFE_INTEGER));
  }

  private normalizePaymentType(paymentType: PaymentType): PaymentType {
    return {
      id: paymentType.id,
      code: paymentType.code ?? '',
      name: paymentType.name,
      description: paymentType.description ?? null,
      surcharge_type: this.normalizeSurchargeType(paymentType.surcharge_type),
      surcharge_value: paymentType.surcharge_value ?? '0.0000',
      is_active: paymentType.is_active ?? true,
      sort_order: paymentType.sort_order ?? null,
      created_at: paymentType.created_at,
      updated_at: paymentType.updated_at
    };
  }

  private normalizeSurchargeType(value?: PaymentSurchargeType | null): PaymentSurchargeType {
    if (value === 'FIXED' || value === 'PERCENT' || value === 'NONE') {
      return value;
    }

    return 'NONE';
  }
}
