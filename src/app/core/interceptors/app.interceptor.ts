import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { KEYSTORE } from '@core/keystore';
import { AuthService } from '@shared/services/auth.service';

export const appInterceptor: HttpInterceptorFn = (req, next) => {
  const skipAuth = req.headers.has('skip-auth');
  const authServ = inject(AuthService);
  
  let modifiedReq = req;

  if (skipAuth) {
    modifiedReq = req.clone({
      headers: req.headers.delete('skip-auth')
    });
  } else {
    const token = sessionStorage.getItem(KEYSTORE.token);

    if (token) {
      modifiedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  }

  return next(modifiedReq).pipe(
    catchError((error) => {
      if (error.status === 401) {
        authServ.simpleLogout();
      }

      return throwError(() => error);
    })
  );
};
