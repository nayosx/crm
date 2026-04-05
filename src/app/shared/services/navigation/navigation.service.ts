import { computed, Injectable, signal } from '@angular/core';
import { KEYSTORE } from '@core/keystore';
import { UserData } from '@shared/interfaces/auth.interface';
import { MenuItem } from 'primeng/api';
import {
  APP_NAVIGATION_TREE,
  AppNavigationItem,
  flattenNavigation,
  isShortcutCandidate,
  toMenuItems
} from '@shared/config/app-navigation.config';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private readonly shortcutStorageKey = 'crm.home.shortcuts';
  private readonly navigationTree: AppNavigationItem[] = APP_NAVIGATION_TREE;

  private readonly shortcutCatalog = flattenNavigation(this.navigationTree)
    .filter((item) => isShortcutCandidate(item));

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
    return toMenuItems(this.navigationTree, onSelect);
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

  reorderShortcuts(fromIndex: number, toIndex: number): void {
    const currentIds = [...this.shortcutIds()];

    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= currentIds.length ||
      toIndex >= currentIds.length
    ) {
      return;
    }

    const [movedId] = currentIds.splice(fromIndex, 1);
    currentIds.splice(toIndex, 0, movedId);

    this.persistShortcutIds(currentIds);
  }

  private readShortcutIds(): string[] {
    if (typeof localStorage === 'undefined') {
      return ['laundry-scheduler'];
    }

    const rawData = localStorage.getItem(this.getShortcutStorageKey())
      ?? localStorage.getItem(this.shortcutStorageKey);

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

    localStorage.setItem(this.getShortcutStorageKey(), JSON.stringify(nextIds));
  }

  private getShortcutStorageKey(): string {
    const userId = this.getLoggedUserId();
    return userId ? `${this.shortcutStorageKey}.user.${userId}` : this.shortcutStorageKey;
  }

  private getLoggedUserId(): number | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    const rawUser = sessionStorage.getItem(KEYSTORE.user);

    if (!rawUser) {
      return null;
    }

    try {
      const user = JSON.parse(rawUser) as Partial<UserData>;
      return typeof user.id === 'number' ? user.id : null;
    } catch {
      return null;
    }
  }
}
