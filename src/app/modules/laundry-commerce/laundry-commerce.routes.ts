import { Routes } from '@angular/router';

export const laundryCommerceRoutes: Routes = [
  {
    path: '',
    redirectTo: 'orders',
    pathMatch: 'full'
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/order-list/order-list.component').then((m) => m.OrderListComponent)
  },
  {
    path: 'orders/create',
    loadComponent: () => import('./pages/order-create/order-create.component').then((m) => m.OrderCreateComponent)
  },
  {
    path: 'orders/:id/edit',
    loadComponent: () => import('./pages/order-edit/order-edit.component').then((m) => m.OrderEditComponent)
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./pages/order-detail/order-detail.component').then((m) => m.OrderDetailComponent)
  },
  {
    path: 'categories',
    loadComponent: () => import('./pages/category-catalog/category-catalog.component').then((m) => m.CategoryCatalogComponent)
  },
  {
    path: 'services',
    loadComponent: () => import('./pages/service-catalog/service-catalog.component').then((m) => m.ServiceCatalogComponent)
  },
  {
    path: 'price-options',
    loadComponent: () => import('./pages/price-options-catalog/price-options-catalog.component').then((m) => m.PriceOptionsCatalogComponent)
  },
  {
    path: 'extras',
    loadComponent: () => import('./pages/extras-catalog/extras-catalog.component').then((m) => m.ExtrasCatalogComponent)
  },
  {
    path: 'delivery-zones',
    loadComponent: () => import('./pages/delivery-zones/delivery-zones.component').then((m) => m.DeliveryZonesComponent)
  },
  {
    path: 'weight-pricing/profiles',
    loadComponent: () => import('./pages/weight-pricing-profiles/weight-pricing-profiles.component').then((m) => m.WeightPricingProfilesComponent)
  },
  {
    path: 'weight-pricing/tiers',
    loadComponent: () => import('./pages/weight-pricing-tiers/weight-pricing-tiers.component').then((m) => m.WeightPricingTiersComponent)
  }
];
