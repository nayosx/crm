import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  LiteUser,
  WorkSession,
  WorkSessionFilters,
  WorkSessionLatestResponse,
  WorkSessionMutationResponse,
  WorkSessionReportResponse
} from '../models/work-session.model';

@Injectable({
  providedIn: 'root'
})
export class WorkSessionsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API}/work_sessions`;
  private readonly usersUrl = `${environment.API}/users`;

  start(): Observable<WorkSessionMutationResponse> {
    return this.http.post<WorkSessionMutationResponse>(`${this.baseUrl}/start`, {});
  }

  end(): Observable<WorkSessionMutationResponse> {
    return this.http.post<WorkSessionMutationResponse>(`${this.baseUrl}/end`, {});
  }

  latest(): Observable<WorkSessionLatestResponse> {
    return this.http.get<WorkSessionLatestResponse>(`${this.baseUrl}/latest`);
  }

  history(filters: WorkSessionFilters): Observable<WorkSession[]> {
    return this.http.get<WorkSession[]>(this.baseUrl, {
      params: this.buildParams(filters)
    });
  }

  forceEnd(payload: { user_id: number; comments: string }): Observable<WorkSessionMutationResponse> {
    return this.http.post<WorkSessionMutationResponse>(`${this.baseUrl}/force_end`, payload);
  }

  report(filters: { start_date: string; end_date: string; user_id?: number }): Observable<WorkSessionReportResponse> {
    return this.http.get<WorkSessionReportResponse>(`${this.baseUrl}/report`, {
      params: this.buildParams(filters)
    });
  }

  downloadReportCsv(filters: { start_date: string; end_date: string; user_id?: number }): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/report`, {
      params: this.buildParams({
        ...filters,
        download_csv: true
      }),
      responseType: 'blob'
    });
  }

  liteUsers(): Observable<LiteUser[]> {
    return this.http.get<LiteUser[]>(this.usersUrl, {
      params: new HttpParams().set('lite', 'true')
    });
  }

  private buildParams(
    filters: Record<string, string | number | boolean | undefined> | WorkSessionFilters
  ): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return params;
  }
}
