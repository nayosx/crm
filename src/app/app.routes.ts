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
                            import('./modules/client/client-page.component').then(m => m.ClientPageComponent)
                    },
                    {
                        path: 'create',
                        loadComponent: () =>
                            import('./modules/client/components/client-add/client-add.component').then(m => m.ClientAddComponent)
                    },
                    {
                        path: ':id/edit',
                        loadComponent: () =>
                            import('./modules/client/components/client-edit/client-edit.component').then(m => m.ClientEditComponent)
                    }
                ]
            },
            {
                path: ROUTE_PATH.TRANSACTIONS,
                children: [
                    {
                        path: '',
                        loadComponent: () =>
                            import('./modules/transaction/transaction.component').then(m => m.TransactionComponent)
                    },
                    {
                        path: 'create',
                        loadComponent: () =>
                            import('./modules/transaction/components/transaction-add/transaction-add.component').then(m => m.TransactionAddComponent)
                    },
                    {
                        path: ':id/edit',
                        loadComponent: () =>
                            import('./modules/transaction/components/transaction-edit/transaction-edit.component').then(m => m.TransactionEditComponent)
                    }
                ]
            },
            {
                path: ROUTE_PATH.SERVICES_TASK,
                children: [
                    {
                        path: '',
                        loadComponent: () =>
                            import('./modules/transaction/transaction.component').then(m => m.TransactionComponent)
                    },
                    {
                        path: 'create',
                        loadComponent: () =>
                            import('./modules/transaction/components/transaction-add/transaction-add.component').then(m => m.TransactionAddComponent)
                    },
                    {
                        path: ':id/edit',
                        loadComponent: () =>
                            import('./modules/transaction/components/transaction-edit/transaction-edit.component').then(m => m.TransactionEditComponent)
                    },
                    {
                        path: 'histories',
                        loadComponent: () =>
                            import('./modules/transaction/components/transaction-edit/transaction-edit.component').then(m => m.TransactionEditComponent)
                    },
                    {
                        path: 'assignments',
                        loadComponent: () =>
                            import('./modules/transaction/components/transaction-edit/transaction-edit.component').then(m => m.TransactionEditComponent)
                    }
                ]
            },
            {
                path: ROUTE_PATH.USERS,
                children: [
                    {
                        path: '',
                        loadComponent: () =>
                            import('./modules/users/users.component').then(m => m.UsersComponent)
                    },
                ]
            },
            {
                path: ROUTE_PATH.LAUNDRY,
                children: [
                    {
                        path: '',
                        loadComponent: () =>
                            import('./modules/laundry/laundry.component').then(m => m.LaundryComponent)
                    },
                    {
                        path: 'create',
                        loadComponent: () =>
                            import('./modules/laundry/components/laundry-add/laundry-add.component').then(m => m.LaundryAddComponent)
                    },
                    {
                        path: ':id/edit',
                        loadComponent: () =>
                            import('./modules/laundry/components/laundry-edit/laundry-edit.component').then(m => m.LaundryEditComponent)
                    },
                    {
                        path: 'delivery',
                        loadComponent: () =>
                            import('./modules/laundry/pages/delivery/delivery.component').then(m => m.DeliveryComponent)
                    },
                    {
                        path: 'scheduler',
                        loadComponent: () =>
                            import('./modules/laundry/pages/schedule/schedule.component').then(m => m.ScheduleComponent)
                    },
                    {
                        path: 'work-in-progress',
                        loadComponent: () =>
                            import('./modules/laundry/pages/process/process.component').then(m => m.ProcessComponent)
                    },

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
