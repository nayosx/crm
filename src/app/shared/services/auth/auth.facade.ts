import { Injectable } from '@angular/core';
import { BehaviorSubject, finalize, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { KEYSTORE } from '@core/keystore';

@Injectable({
  providedIn: 'root'
})
export class AuthFacade {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  isLoading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(private authService: AuthService) {}

  login(username: string, password: string) {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.authService.login(username, password).pipe(
      tap(response => {
        sessionStorage.setItem(KEYSTORE.token, response.access_token);
        sessionStorage.setItem(KEYSTORE.refreshToken, response.refresh_token);
        sessionStorage.setItem(KEYSTORE.user, JSON.stringify(response.user));
      }),
      finalize(() => this.loadingSubject.next(false))
    );
  }
}
