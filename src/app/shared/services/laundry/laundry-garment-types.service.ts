import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { LaundryGarmentType } from '@shared/interfaces/laundry-garment-type.interface';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LaundryGarmentTypesService {
  private cacheKey = 'laundry_garment_types_cache';
  private baseUrl = `${environment.API}/v2/garment_types`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<LaundryGarmentType[]> {
    const cached = sessionStorage.getItem(this.cacheKey);
    if (cached) {
      return of(JSON.parse(cached) as LaundryGarmentType[]);
    }

    return this.http.get<LaundryGarmentType[]>(this.baseUrl).pipe(
      tap((data) => sessionStorage.setItem(this.cacheKey, JSON.stringify(data)))
    );
  }

  getById(id: number): Observable<LaundryGarmentType> {
    return this.http.get<LaundryGarmentType>(`${this.baseUrl}/${id}`);
  }

  clearCache(): void {
    sessionStorage.removeItem(this.cacheKey);
  }
}
