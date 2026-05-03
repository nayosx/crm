import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { LaundryServiceExtraType } from '@shared/interfaces/laundry-service.interface';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LaundryServiceExtraTypesService {
  private cacheKey = 'laundry_service_extra_types_cache';
  private baseUrl = `${environment.API}/v2/service_extra_types`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<LaundryServiceExtraType[]> {
    const cached = sessionStorage.getItem(this.cacheKey);
    if (cached) {
      return of(JSON.parse(cached) as LaundryServiceExtraType[]);
    }

    return this.http.get<LaundryServiceExtraType[]>(this.baseUrl).pipe(
      tap((data) => sessionStorage.setItem(this.cacheKey, JSON.stringify(data)))
    );
  }

  getById(id: number): Observable<LaundryServiceExtraType> {
    return this.http.get<LaundryServiceExtraType>(`${this.baseUrl}/${id}`);
  }

  clearCache(): void {
    sessionStorage.removeItem(this.cacheKey);
  }
}
