import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  BackendMenuFlatItem,
  BackendMenuNode,
  CreateMenuPayload,
  UpdateMenuPayload
} from '@shared/interfaces/menu.interface';

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

  createMenu(payload: CreateMenuPayload): Observable<BackendMenuNode> {
    return this.http.post<BackendMenuNode>(this.apiUrl, payload);
  }

  updateMenu(menuId: number, payload: UpdateMenuPayload): Observable<BackendMenuNode> {
    return this.http.put<BackendMenuNode>(`${this.apiUrl}/${menuId}`, payload);
  }

  deleteMenu(menuId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${menuId}`);
  }

  getAllWithRoles(): Observable<Array<BackendMenuFlatItem & { roles: number[] }>> {
    return this.http.get<Array<BackendMenuFlatItem & { roles: number[] }>>(`${this.apiUrl}/allwithroles`);
  }
}
