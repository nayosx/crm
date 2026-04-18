import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { BackendMenuFlatItem, BackendMenuNode } from '@shared/interfaces/menu.interface';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.API}/menus`;

  getVisibleMenus(): Observable<BackendMenuNode[]> {
    return this.http.get<BackendMenuNode[]>(this.apiUrl);
  }

  getCatalog(): Observable<BackendMenuFlatItem[]> {
    return this.http.get<BackendMenuFlatItem[]>(`${this.apiUrl}/all`);
  }
}
