import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { WorkSession } from '../models/work-session.model';
import { WorkSessionsApiService } from './work-sessions-api.service';

@Injectable({
  providedIn: 'root'
})
export class WorkSessionStatusService {
  private readonly api = inject(WorkSessionsApiService);

  readonly session = signal<WorkSession | null>(null);
  readonly loading = signal<boolean>(false);
  readonly mutating = signal<boolean>(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  loadLatest(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.latest().pipe(
      tap((response) => {
        this.session.set(response.session ?? null);
        this.message.set(response.message ?? null);
      }),
      catchError((error: HttpErrorResponse) => {
        this.session.set(null);
        this.error.set(this.getErrorMessage(error, 'No se pudo cargar la jornada actual.'));
        return EMPTY;
      }),
      finalize(() => this.loading.set(false))
    ).subscribe();
  }

  start(onSuccess?: () => void): void {
    this.runMutation(() => this.api.start(), onSuccess);
  }

  end(onSuccess?: () => void): void {
    this.runMutation(() => this.api.end(), onSuccess);
  }

  private runMutation(
    request: () => ReturnType<WorkSessionsApiService['start']>,
    onSuccess?: () => void
  ): void {
    this.mutating.set(true);
    this.error.set(null);

    request().pipe(
      tap((response) => {
        this.session.set(response.session ?? null);
        this.message.set(response.message);
        onSuccess?.();
      }),
      catchError((error: HttpErrorResponse) => {
        this.error.set(this.getErrorMessage(error, 'No se pudo completar la operación.'));
        return EMPTY;
      }),
      finalize(() => this.mutating.set(false))
    ).subscribe();
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const apiMessage = error.error && typeof error.error === 'object' && 'message' in error.error
      ? error.error.message
      : null;

    return typeof apiMessage === 'string' && apiMessage.trim().length ? apiMessage : fallback;
  }
}
