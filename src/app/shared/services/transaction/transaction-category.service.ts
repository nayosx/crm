import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { TransactionCategory } from '@shared/interfaces/transaction.interface';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class TransactionCategoryService {
  private cacheKey = 'transaction_categories_cache';
  private apiUrl = `${environment.API}/transaction-categories`;

  constructor(private http: HttpClient) {}

  getCategories(): Observable<TransactionCategory[]> {
    const cached = sessionStorage.getItem(this.cacheKey);
    if (cached) {
      return of(JSON.parse(cached));
    }

    return this.http.get<TransactionCategory[]>(this.apiUrl).pipe(
      tap((data) => sessionStorage.setItem(this.cacheKey, JSON.stringify(data)))
    );
  }

  clearCache() {
    sessionStorage.removeItem(this.cacheKey);
  }
}
