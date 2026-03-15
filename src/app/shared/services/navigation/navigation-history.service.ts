import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export type NavigationRouteTarget = string | string[];

export interface NavigationBackState {
  backTo?: NavigationRouteTarget;
  backLabel?: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class NavigationHistoryService {
  private readonly router = inject(Router);

  private readonly previousUrlSignal = signal<string | null>(null);
  private readonly currentUrlSignal = signal<string>(this.router.url);
  private readonly currentStateSignal = signal<Record<string, unknown> | null>(
    this.sanitizeState(typeof history !== 'undefined' ? history.state : null)
  );

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.previousUrlSignal.set(this.currentUrlSignal());
        this.currentUrlSignal.set(event.urlAfterRedirects);
        this.currentStateSignal.set(
          this.sanitizeState(this.router.getCurrentNavigation()?.extras.state ?? history.state)
        );
      });
  }

  getPreviousUrl(): string | null {
    return this.previousUrlSignal();
  }

  getCurrentUrl(): string {
    return this.currentUrlSignal();
  }

  getCurrentState<T extends Record<string, unknown>>(): T | null {
    const state = this.currentStateSignal();
    return state as T | null;
  }

  resolveBackTarget(fallbackRoute?: NavigationRouteTarget): NavigationRouteTarget | null {
    const state = this.getCurrentState<NavigationBackState>();

    if (state?.backTo) {
      return state.backTo;
    }

    if (this.getPreviousUrl()) {
      return this.getPreviousUrl();
    }

    return fallbackRoute ?? null;
  }

  private sanitizeState(state: unknown): Record<string, unknown> | null {
    if (!state || typeof state !== 'object') {
      return null;
    }

    const { navigationId, ɵrouterPageId, ...customState } = state as Record<string, unknown>;
    return Object.keys(customState).length > 0 ? customState : null;
  }
}
