import { MenuItem } from 'primeng/api';

export interface AppNavigationItem {
  id: string;
  label: string;
  icon?: string;
  routerLink?: string[];
  includeInShortcuts?: boolean;
  items?: AppNavigationItem[];
}

export const APP_NAVIGATION_TREE: AppNavigationItem[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: 'pi pi-home',
    routerLink: ['/home']
  },
  {
    id: 'clients',
    label: 'Clientes',
    icon: 'pi pi-users',
    routerLink: ['/clients']
  },
  {
    id: 'transactions',
    label: 'Transacciones',
    icon: 'pi pi-dollar',
    routerLink: ['/transactions']
  },
  {
    id: 'users',
    label: 'Usuarios',
    icon: 'pi pi-users',
    routerLink: ['/users']
  },
  {
    id: 'work-sessions',
    label: 'Jornadas',
    icon: 'pi pi-clock',
    items: [
      {
        id: 'work-sessions-self',
        label: 'Mi jornada',
        icon: 'pi pi-user',
        routerLink: ['/work-sessions']
      },
      {
        id: 'work-sessions-admin',
        label: 'Administrar jornadas',
        icon: 'pi pi-briefcase',
        routerLink: ['/work-sessions-admin']
      }
    ]
  },
  {
    id: 'laundry',
    label: 'Lavanderia',
    items: [
      {
        id: 'laundry-socket-queues',
        label: 'Monitor en tiempo real',
        icon: 'pi pi-bolt',
        routerLink: ['/laundry', 'socket-queues']
      },
      {
        id: 'laundry-services',
        label: 'Servicios Detallados',
        icon: 'pi pi-home',
        routerLink: ['/laundry']
      },
      {
        id: 'laundry-scheduler',
        label: 'Recolectas',
        icon: 'pi pi-calendar',
        routerLink: ['/laundry', 'scheduler']
      },
      {
        id: 'laundry-pending',
        label: 'Pendientes',
        icon: 'pi pi-clock',
        routerLink: ['/laundry', 'pending']
      },
      {
        id: 'laundry-pending-board',
        label: 'Servicios',
        icon: 'pi pi-address-book',
        routerLink: ['/laundry', 'pending-board']
      },
      {
        id: 'laundry-work-in-progress',
        label: 'En Progreso',
        icon: 'pi pi-list-check',
        routerLink: ['/laundry', 'work-in-progress']
      },
      {
        id: 'laundry-delivery',
        label: 'Listos para entrega',
        icon: 'pi pi-truck',
        routerLink: ['/laundry', 'delivery']
      }
    ]
  },
  {
    id: 'laundry-commerce',
    label: 'Comercial',
    icon: 'pi pi-shop',
    items: [
      {
        id: 'laundry-commerce-orders',
        label: 'Pedidos comerciales',
        icon: 'pi pi-shopping-cart',
        routerLink: ['/laundry', 'commerce', 'orders']
      },
      {
        id: 'laundry-commerce-categories',
        label: 'Categorias',
        icon: 'pi pi-tags',
        routerLink: ['/laundry', 'commerce', 'categories'],
        includeInShortcuts: false
      },
      {
        id: 'laundry-commerce-services',
        label: 'Servicios comerciales',
        icon: 'pi pi-briefcase',
        routerLink: ['/laundry', 'commerce', 'services'],
        includeInShortcuts: false
      },
      {
        id: 'laundry-commerce-price-options',
        label: 'Precios sugeridos',
        icon: 'pi pi-dollar',
        routerLink: ['/laundry', 'commerce', 'price-options'],
        includeInShortcuts: false
      },
      {
        id: 'laundry-commerce-extras',
        label: 'Extras comerciales',
        icon: 'pi pi-plus-circle',
        routerLink: ['/laundry', 'commerce', 'extras'],
        includeInShortcuts: false
      },
      {
        id: 'laundry-commerce-delivery-zones',
        label: 'Zonas delivery',
        icon: 'pi pi-map',
        routerLink: ['/laundry', 'commerce', 'delivery-zones'],
        includeInShortcuts: false
      },
      {
        id: 'laundry-commerce-weight-profiles',
        label: 'Perfiles por peso',
        icon: 'pi pi-sliders-h',
        routerLink: ['/laundry', 'commerce', 'weight-pricing', 'profiles'],
        includeInShortcuts: false
      },
      {
        id: 'laundry-commerce-weight-tiers',
        label: 'Tiers por perfil',
        icon: 'pi pi-sort-amount-up',
        routerLink: ['/laundry', 'commerce', 'weight-pricing', 'tiers'],
        includeInShortcuts: false
      }
    ]
  }
];

export function toMenuItems(items: AppNavigationItem[], onSelect?: () => void): MenuItem[] {
  return items.map((item) => ({
    label: item.label,
    icon: item.icon,
    routerLink: item.routerLink,
    command: item.routerLink ? () => onSelect?.() : undefined,
    items: item.items ? toMenuItems(item.items, onSelect) : undefined
  }));
}

export function flattenNavigation(items: AppNavigationItem[]): AppNavigationItem[] {
  return items.flatMap((item) => item.items?.length ? flattenNavigation(item.items) : [item]);
}

export function isShortcutCandidate(item: AppNavigationItem): boolean {
  return Boolean(item.routerLink?.length);
}
