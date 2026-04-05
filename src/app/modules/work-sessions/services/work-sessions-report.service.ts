import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { WorkSessionsReportRow } from '../models/work-session.model';
import { WorkSessionsApiService } from './work-sessions-api.service';

@Injectable({
  providedIn: 'root'
})
export class WorkSessionsReportService {
  private readonly api = inject(WorkSessionsApiService);

  readonly rows = signal<WorkSessionsReportRow[]>([]);
  readonly dailyTargetTime = signal<string | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  load(filters: { start_date: string; end_date: string; user_id?: number }): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.report(filters).pipe(
      tap((response) => {
        this.rows.set(response.report);
        this.dailyTargetTime.set(response.daily_target_time ?? null);
      }),
      catchError((error: HttpErrorResponse) => {
        this.rows.set([]);
        this.dailyTargetTime.set(null);
        this.error.set(this.getErrorMessage(error));
        return EMPTY;
      }),
      finalize(() => this.loading.set(false))
    ).subscribe();
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    const apiMessage = error.error && typeof error.error === 'object' && 'message' in error.error
      ? error.error.message
      : null;

    return typeof apiMessage === 'string' && apiMessage.trim().length
      ? apiMessage
      : 'No se pudo cargar el reporte de jornadas.';
  }
}
