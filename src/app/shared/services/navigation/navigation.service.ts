import { computed, Injectable, signal } from '@angular/core';
import { MenuItem } from 'primeng/api';

export interface AppNavigationItem {
  id: string;
  label: string;
  icon?: string;
  routerLink?: string[];
  shortcutEligible?: boolean;
  items?: AppNavigationItem[];
}

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private readonly shortcutStorageKey = 'crm.home.shortcuts';

  private readonly navigationTree: AppNavigationItem[] = [
    {
      id: 'home',
      label: 'Inicio',
      icon: 'pi pi-home',
      routerLink: ['/home'],
      shortcutEligible: true
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: 'pi pi-users',
      routerLink: ['/clients'],
      shortcutEligible: true
    },
    {
      id: 'transactions',
      label: 'Transacciones',
      icon: 'pi pi-dollar',
      routerLink: ['/transactions'],
      shortcutEligible: true
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: 'pi pi-users',
      routerLink: ['/users'],
      shortcutEligible: true
    },
    {
      id: 'laundry',
      label: 'Lavanderia',
      items: [
        {
          id: 'laundry-socket-queues',
          label: 'Monitor socket',
          icon: 'pi pi-bolt',
          routerLink: ['/laundry', 'socket-queues'],
          shortcutEligible: true
        },
        {
          id: 'laundry-services',
          label: 'Servicios Detallados',
          icon: 'pi pi-home',
          routerLink: ['/laundry'],
          shortcutEligible: true
        },
        {
          id: 'laundry-scheduler',
          label: 'Recolectas',
          icon: 'pi pi-calendar',
          routerLink: ['/laundry', 'scheduler'],
          shortcutEligible: true
        },
        {
          id: 'laundry-pending',
          label: 'Pendientes',
          icon: 'pi pi-clock',
          routerLink: ['/laundry', 'pending'],
          shortcutEligible: true
        },
        {
          id: 'laundry-pending-board',
          label: 'Servicios',
          icon: 'pi pi-address-book',
          routerLink: ['/laundry', 'pending-board'],
          shortcutEligible: true
        },
        {
          id: 'laundry-work-in-progress',
          label: 'En Progreso',
          icon: 'pi pi-list-check',
          routerLink: ['/laundry', 'work-in-progress'],
          shortcutEligible: true
        },
        {
          id: 'laundry-delivery',
          label: 'Listos para entrega',
          icon: 'pi pi-truck',
          routerLink: ['/laundry', 'delivery'],
          shortcutEligible: true
        }
      ]
    }
  ];

  private readonly shortcutCatalog = this.flattenNavigation(this.navigationTree)
    .filter((item) => item.shortcutEligible && item.routerLink);

  private readonly shortcutIds = signal<string[]>(this.readShortcutIds());

  readonly shortcuts = computed(() =>
    this.shortcutIds()
      .map((id) => this.shortcutCatalog.find((item) => item.id === id))
      .filter((item): item is AppNavigationItem => !!item)
  );

  readonly availableShortcuts = computed(() => {
    const selectedIds = new Set(this.shortcutIds());
    return this.shortcutCatalog.filter((item) => !selectedIds.has(item.id));
  });

  getMainMenuItems(onSelect?: () => void): MenuItem[] {
    return this.navigationTree.map((item) => this.toMenuItem(item, onSelect));
  }

  addShortcut(id: string): void {
    const nextIds = [...this.shortcutIds()];

    if (nextIds.includes(id) || !this.shortcutCatalog.some((item) => item.id === id)) {
      return;
    }

    nextIds.push(id);
    this.persistShortcutIds(nextIds);
  }

  removeShortcut(id: string): void {
    const nextIds = this.shortcutIds().filter((currentId) => currentId !== id);
    this.persistShortcutIds(nextIds);
  }

  private toMenuItem(item: AppNavigationItem, onSelect?: () => void): MenuItem {
    return {
      label: item.label,
      icon: item.icon,
      routerLink: item.routerLink,
      command: item.routerLink ? () => onSelect?.() : undefined,
      items: item.items?.map((child) => this.toMenuItem(child, onSelect))
    };
  }

  private flattenNavigation(items: AppNavigationItem[]): AppNavigationItem[] {
    return items.flatMap((item) => item.items?.length ? this.flattenNavigation(item.items) : [item]);
  }

  private readShortcutIds(): string[] {
    if (typeof localStorage === 'undefined') {
      return ['laundry-scheduler'];
    }

    const rawData = localStorage.getItem(this.shortcutStorageKey);

    if (!rawData) {
      return ['laundry-scheduler'];
    }

    try {
      const parsed = JSON.parse(rawData);

      if (!Array.isArray(parsed)) {
        return ['laundry-scheduler'];
      }

      const validIds = parsed.filter(
        (value): value is string => typeof value === 'string' && this.shortcutCatalog.some((item) => item.id === value)
      );

      return validIds.length ? validIds : ['laundry-scheduler'];
    } catch {
      return ['laundry-scheduler'];
    }
  }

  private persistShortcutIds(ids: string[]): void {
    const nextIds = ids.filter((id, index) => ids.indexOf(id) === index);
    this.shortcutIds.set(nextIds);

    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.shortcutStorageKey, JSON.stringify(nextIds));
  }
}
