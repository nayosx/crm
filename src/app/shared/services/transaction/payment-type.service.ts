import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { PaymentType } from '@shared/interfaces/transaction.interface';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class PaymentTypeService {
  private cacheKey = 'payment_types_cache';
  private apiUrl = `${environment.API}/payment_types`;

  constructor(private http: HttpClient) {}

  getPaymentTypes(): Observable<PaymentType[]> {
    const cached = sessionStorage.getItem(this.cacheKey);
    if (cached) {
      return of(JSON.parse(cached));
    }

    return this.http.get<PaymentType[]>(this.apiUrl).pipe(
      tap((data) => sessionStorage.setItem(this.cacheKey, JSON.stringify(data)))
    );
  }

  clearCache() {
    sessionStorage.removeItem(this.cacheKey);
  }
}
