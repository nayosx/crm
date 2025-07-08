import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { loginGuard } from '@core/guards/login.guard';
import { ROUTE_PATH } from '@core/routes-path';
import { AuthComponent } from '@modules/auth/auth.component';
import { Error404Component } from '@modules/pages/error404/error404.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
    {
        path: ROUTE_PATH.LOGIN,
        component: AuthComponent,
        canActivate: [loginGuard]
    },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: ROUTE_PATH.HOME,
                loadComponent: () => import('./modules/home/home.component').then(m => m.HomeComponent),
            },

            {
                path: ROUTE_PATH.CLIENTS,
                children: [
                    {
                        path: '',
                        loadComponent: () =>
                            import('./modules/client-page/client-page.component').then(m => m.ClientPageComponent)
                    },
                    {
                        path: 'create',
                        loadComponent: () =>
                            import('./modules/client-page/components/client-add/client-add.component').then(m => m.ClientAddComponent)
                    },
                    {
                        path: ':id/edit',
                        loadComponent: () =>
                            import('./modules/client-page/components/client-edit/client-edit.component').then(m => m.ClientEditComponent)
                    }
                ]
            },
            {
                path: '',
                redirectTo: ROUTE_PATH.HOME,
                pathMatch: 'full'
            }
        ]
    },
    {
        path: '',
        redirectTo: ROUTE_PATH.LOGIN,
        pathMatch: 'full'
    },
    { path: '**', component: Error404Component }
];
