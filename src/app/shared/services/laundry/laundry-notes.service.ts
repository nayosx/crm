import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  LaundryServiceLog,
  LaundryServiceLogPayload
} from '@shared/interfaces/laundry-service.interface';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class LaundryNotesService {

  private baseUrl = `${environment.API}/laundry_notes`;

  constructor(private http: HttpClient) { }

  getNotes(serviceId: number): Observable<LaundryServiceLog[]> {
    return this.http.get<LaundryServiceLog[]>(`${this.baseUrl}/${serviceId}/notes`);
  }

  createNote(serviceId: number, payload: LaundryServiceLogPayload): Observable<LaundryServiceLog> {
    return this.http.post<LaundryServiceLog>(`${this.baseUrl}/${serviceId}/notes`, payload);
  }

  deleteNote(logId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/notes/${logId}`);
  }
}
