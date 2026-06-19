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
    canActivate: [loginGuard],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: ROUTE_PATH.HOME,
        loadComponent: () => import('./modules/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: ROUTE_PATH.DASBOARD,
        loadComponent: () => import('./modules/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: ROUTE_PATH.CLIENTS,
        children: [
          {
            path: '',
            loadComponent: () => import('./modules/client/client-page.component').then((m) => m.ClientPageComponent),
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./modules/client/components/client-add/client-add.component').then((m) => m.ClientAddComponent),
          },
          {
            path: ':id/edit',
            loadComponent: () =>
              import('./modules/client/components/client-edit/client-edit.component').then((m) => m.ClientEditComponent),
          },
        ],
      },
      {
        path: ROUTE_PATH.TRANSACTIONS,
        children: [
          {
            path: '',
            loadComponent: () => import('./modules/transaction/transaction.component').then((m) => m.TransactionComponent),
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./modules/transaction/components/transaction-add/transaction-add.component').then(
                (m) => m.TransactionAddComponent,
              ),
          },
          {
            path: ':id/edit',
            loadComponent: () =>
              import('./modules/transaction/components/transaction-edit/transaction-edit.component').then(
                (m) => m.TransactionEditComponent,
              ),
          },
        ],
      },
      {
        path: ROUTE_PATH.SERVICES_TASK,
        children: [
          {
            path: '',
            loadComponent: () => import('./modules/transaction/transaction.component').then((m) => m.TransactionComponent),
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./modules/transaction/components/transaction-add/transaction-add.component').then(
                (m) => m.TransactionAddComponent,
              ),
          },
          {
            path: ':id/edit',
            loadComponent: () =>
              import('./modules/transaction/components/transaction-edit/transaction-edit.component').then(
                (m) => m.TransactionEditComponent,
              ),
          },
          {
            path: 'histories',
            loadComponent: () =>
              import('./modules/transaction/components/transaction-edit/transaction-edit.component').then(
                (m) => m.TransactionEditComponent,
              ),
          },
          {
            path: 'assignments',
            loadComponent: () =>
              import('./modules/transaction/components/transaction-edit/transaction-edit.component').then(
                (m) => m.TransactionEditComponent,
              ),
          },
        ],
      },
      {
        path: ROUTE_PATH.USERS,
        children: [
          {
            path: '',
            loadComponent: () => import('./modules/users/users.component').then((m) => m.UsersComponent),
          },
        ],
      },
      {
        path: ROUTE_PATH.WORK_SESSIONS,
        loadComponent: () =>
          import('./modules/work-sessions/work-sessions-user.component').then((m) => m.WorkSessionsUserComponent),
      },
      {
        path: ROUTE_PATH.WORK_SESSIONS_ADMIN,
        loadComponent: () =>
          import('./modules/work-sessions/work-sessions-admin.component').then((m) => m.WorkSessionsAdminComponent),
      },
      {
        path: ROUTE_PATH.SETTINGS_MENUS,
        loadComponent: () =>
          import('./modules/settings/menu-admin/menu-admin.component').then((m) => m.MenuAdminComponent),
      },
      {
        path: ROUTE_PATH.SETTINGS_MENU_ROLES,
        loadComponent: () =>
          import('./modules/settings/menu-role-editor/menu-role-editor.component').then(
            (m) => m.MenuRoleEditorComponent,
          ),
      },
      {
        path: ROUTE_PATH.SETTINGS_MENU_ROLES_LEGACY,
        redirectTo: ROUTE_PATH.SETTINGS_MENU_ROLES,
        pathMatch: 'full',
      },
      {
        path: ROUTE_PATH.CATALOGS,
        children: [
          {
            path: 'extras',
            loadComponent: () => import('./modules/catalogs/catalog-page.component').then((m) => m.CatalogPageComponent),
            data: { kind: 'extras', title: 'Extras', subtitle: 'Administra extras, precio base y estado.' },
          },
          {
            path: 'service-categories',
            loadComponent: () => import('./modules/catalogs/catalog-page.component').then((m) => m.CatalogPageComponent),
            data: {
              kind: 'service-categories',
              title: 'Categorias de servicio',
              subtitle: 'Administra categorias activas para servicios de catalogo.',
            },
          },
          {
            path: 'services',
            loadComponent: () => import('./modules/catalogs/catalog-page.component').then((m) => m.CatalogPageComponent),
            data: {
              kind: 'services',
              title: 'Servicios',
              subtitle: 'Administra servicios, categoria y modo de precio.',
            },
          },
          {
            path: 'service-variants',
            loadComponent: () => import('./modules/catalogs/catalog-page.component').then((m) => m.CatalogPageComponent),
            data: {
              kind: 'service-variants',
              title: 'Variantes de servicio',
              subtitle: 'Administra variantes y precio por servicio.',
            },
          },
          {
            path: 'garment-types',
            loadComponent: () => import('./modules/catalogs/catalog-page.component').then((m) => m.CatalogPageComponent),
            data: {
              kind: 'garment-types',
              title: 'Tipos de Prenda',
              subtitle: 'Administra tipos de prenda, categoria y precio por defecto.',
            },
          },
          {
            path: '',
            redirectTo: 'extras',
            pathMatch: 'full',
          },
        ],
      },
      {
        path: ROUTE_PATH.LAUNDRY,
        children: [
          {
            path: '',
            loadComponent: () => import('./modules/laundry/laundry.component').then((m) => m.LaundryComponent),
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./modules/laundry/components/laundry-add/laundry-add.component').then((m) => m.LaundryAddComponent),
          },
          {
            path: ':id/edit',
            loadComponent: () =>
              import('./modules/laundry/components/laundry-edit/laundry-edit.component').then(
                (m) => m.LaundryEditComponent,
              ),
          },
          {
            path: 'delivery',
            loadComponent: () =>
              import('./modules/laundry/pages/delivery/delivery.component').then((m) => m.DeliveryComponent),
          },
          {
            path: 'scheduler',
            loadComponent: () =>
              import('./modules/laundry/pages/schedule/schedule.component').then((m) => m.ScheduleComponent),
          },
          {
            path: 'pending',
            loadComponent: () =>
              import('./modules/laundry/pages/pending-queue/pending-queue.component').then(
                (m) => m.PendingQueueComponent,
              ),
          },
          {
            path: 'pending-board',
            loadComponent: () =>
              import('./modules/laundry/pages/pending/pending.component').then((m) => m.PendingComponent),
          },
          {
            path: 'work-in-progress',
            loadComponent: () =>
              import('./modules/laundry/pages/process/process.component').then((m) => m.ProcessComponent),
          },
          {
            path: 'socket-queues',
            loadComponent: () =>
              import('./modules/laundry/pages/socket-queues/socket-queues.component').then(
                (m) => m.SocketQueuesComponent,
              ),
          },
          {
            path: ':id/detail',
            loadComponent: () =>
              import('./modules/laundry/pages/detail/detail.component').then((m) => m.DetailComponent),
          },
          {
            path: ':id/form-preview',
            loadComponent: () =>
              import('./modules/laundry/pages/form-preview/form-preview.component').then(
                (m) => m.FormPreviewComponent,
              ),
          },
        ],
      },
      {
        path: ROUTE_PATH.DELIVERY_MANAGER,
        loadComponent: () =>
          import('./modules/laundry/pages/dispatch-manager/dispatch-manager.component').then(
            (m) => m.ManagerDispatchComponent,
          ),
      },
      {
        path: ROUTE_PATH.DELIVERY_WORKING,
        loadComponent: () =>
          import('./modules/laundry/pages/dispatch-worker/dispatch-worker.component').then(
            (m) => m.WorkerDispatchComponent,
          ),
      },
      {
        path: '',
        redirectTo: ROUTE_PATH.HOME,
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: ROUTE_PATH.LOGIN,
    pathMatch: 'full',
  },
  {
    path: '**',
    component: Error404Component,
  },
];
