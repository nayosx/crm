import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { WorkSession, WorkSessionFilters } from '../models/work-session.model';
import { WorkSessionsApiService } from './work-sessions-api.service';

@Injectable({
  providedIn: 'root'
})
export class WorkSessionsHistoryService {
  private readonly api = inject(WorkSessionsApiService);

  readonly sessions = signal<WorkSession[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  load(filters: WorkSessionFilters): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.history(filters).pipe(
      tap((sessions) => this.sessions.set(sessions)),
      catchError((error: HttpErrorResponse) => {
        this.sessions.set([]);
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
      : 'No se pudo cargar el historial de jornadas.';
  }
}
