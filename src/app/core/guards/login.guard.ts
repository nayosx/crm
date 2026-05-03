import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { KEYSTORE } from '@core/keystore';
import { ROUTE_PATH } from '@core/routes-path';

export const loginGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = sessionStorage.getItem(KEYSTORE.token);

  if (token) {
    return router.parseUrl(ROUTE_PATH.HOME);
  }

  return true;
};