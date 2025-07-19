import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { LoginResponse } from '@shared/interfaces/auth.interface';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { KEYSTORE } from '@core/keystore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = `${environment.API}/auth`;

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<LoginResponse> {
    const body = { username, password };
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, body, {
      headers: { 'skip-auth': 'true' }
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {});
  }

  simpleLogout(): void {
    this.clearTokens();
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<string> {
    const token = this.getRefreshToken();
    if (!token) return throwError(() => new Error('No refresh token'));

    console.log('[AuthService] Intentando refresh con token:', token);

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post<{ access_token: string }>(
      `${this.baseUrl}/refresh`, {},
      { headers }
    ).pipe(
      map(response => {
        this.setAccessToken(response.access_token);
        console.log('[AuthService] Nuevo access_token recibido:', response.access_token);
        return response.access_token;
      })
    );
  }

  setTokens(access: string, refresh: string): void {
    sessionStorage.setItem(KEYSTORE.token, access);
    sessionStorage.setItem(KEYSTORE.refreshToken, refresh);
  }

  setAccessToken(token: string): void {
    sessionStorage.setItem(KEYSTORE.token, token);
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(KEYSTORE.token);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(KEYSTORE.refreshToken);
  }

  clearTokens(): void {
    sessionStorage.removeItem(KEYSTORE.token);
    sessionStorage.removeItem(KEYSTORE.refreshToken);
    sessionStorage.removeItem(KEYSTORE.user);
  }
}
