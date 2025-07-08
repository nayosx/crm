import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { KEYSTORE } from '@core/keystore';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = sessionStorage.getItem(KEYSTORE.token);

  if (token) {
    return true;
  }

  return router.parseUrl('/login');
};
