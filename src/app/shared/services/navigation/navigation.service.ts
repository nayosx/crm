import { computed, Injectable, inject, signal } from '@angular/core';
import { KEYSTORE } from '@core/keystore';
import { UserData } from '@shared/interfaces/auth.interface';
import { BackendMenuNode, NavigationMenuItem } from '@shared/interfaces/menu.interface';
import { MenuItem } from 'primeng/api';
import { Observable, of } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { MenuService } from './menu.service';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private readonly shortcutStorageKey = 'crm.home.shortcuts';
  private readonly menuStorageKey = 'navigation_menu_tree';
  private readonly menuService = inject(MenuService);
  private readonly navigationTree = signal<BackendMenuNode[]>(this.readNavigationTree());
  private readonly hasLoadedNavigation = signal(this.navigationTree().length > 0);
  private loadingNavigation$: Observable<BackendMenuNode[]> | null = null;
  private readonly homeItem: NavigationMenuItem = {
    key: 'home',
    label: 'Inicio',
    icon: 'pi pi-home',
    routerLink: ['/home']
  };
  private readonly navigationItems = computed(() => [
    this.homeItem,
    ...this.toNavigationItems(this.navigationTree()).filter((item) => item.key !== this.homeItem.key)
  ]);
  private readonly shortcutCatalog = computed(() =>
    this.flattenNavigation(this.navigationItems())
      .filter((item) => this.isShortcutCandidate(item))
  );

  private readonly shortcutIds = signal<string[]>(this.readShortcutIds());

  readonly shortcuts = computed(() =>
    this.shortcutIds()
      .map((key) => this.shortcutCatalog().find((item) => item.key === key))
      .filter((item): item is NavigationMenuItem => !!item)
  );

  readonly availableShortcuts = computed(() => {
    const selectedIds = new Set(this.shortcutIds());
    return this.shortcutCatalog().filter((item) => !selectedIds.has(item.key));
  });

  getAvailableShortcutTree(): NavigationMenuItem[] {
    const selectedIds = new Set(this.shortcutIds());
    return this.filterAvailableShortcutTree(this.navigationItems(), selectedIds);
  }

  getMainMenuItems(onSelect?: () => void): MenuItem[] {
    return this.toPrimeMenuItems(this.navigationItems(), onSelect);
  }

  loadNavigation(): Observable<BackendMenuNode[]> {
    if (this.loadingNavigation$) {
      return this.loadingNavigation$;
    }

    this.loadingNavigation$ = this.menuService.getVisibleMenus().pipe(
      tap((tree) => this.setNavigationTree(tree)),
      finalize(() => this.loadingNavigation$ = null),
      shareReplay(1)
    );

    return this.loadingNavigation$;
  }

  ensureNavigationLoaded(): Observable<BackendMenuNode[]> {
    if (this.hasLoadedNavigation()) {
      return of(this.navigationTree());
    }
    return this.loadNavigation();
  }

  setNavigationTree(tree: BackendMenuNode[]): void {
    const normalizedTree = this.normalizeNavigationTree(tree);

    this.navigationTree.set(normalizedTree);
    this.hasLoadedNavigation.set(true);
    this.persistNavigationTree(normalizedTree);
  }

  clearNavigation(): void {
    this.navigationTree.set([]);
    this.hasLoadedNavigation.set(false);

    if (typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.removeItem(this.menuStorageKey);
  }

  addShortcut(key: string): void {
    const nextIds = [...this.shortcutIds()];

    if (nextIds.includes(key) || !this.shortcutCatalog().some((item) => item.key === key)) {
      return;
    }

    nextIds.push(key);
    this.persistShortcutIds(nextIds);
  }

  removeShortcut(key: string): void {
    const nextIds = this.shortcutIds().filter((currentId) => currentId !== key);
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
      return [this.homeItem.key];
    }

    const rawData = localStorage.getItem(this.getShortcutStorageKey())
      ?? localStorage.getItem(this.shortcutStorageKey);

    if (!rawData) {
      return [this.homeItem.key];
    }

    try {
      const parsed = JSON.parse(rawData);

      if (!Array.isArray(parsed)) {
        return [this.homeItem.key];
      }

      const validIds = parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
      return validIds.length ? validIds : [this.homeItem.key];
    } catch {
      return [this.homeItem.key];
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

  private readNavigationTree(): BackendMenuNode[] {
    if (typeof sessionStorage === 'undefined') {
      return [];
    }

    const rawData = sessionStorage.getItem(this.menuStorageKey);
    if (!rawData) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawData);
      return Array.isArray(parsed) ? this.normalizeNavigationTree(parsed as BackendMenuNode[]) : [];
    } catch {
      return [];
    }
  }

  private persistNavigationTree(tree: BackendMenuNode[]): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.setItem(this.menuStorageKey, JSON.stringify(tree));
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

  private toNavigationItems(items: BackendMenuNode[]): NavigationMenuItem[] {
    return items.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
      routerLink: this.toRouterLink(item.path),
      items: item.children?.length ? this.toNavigationItems(item.children) : undefined,
    }));
  }

  private toPrimeMenuItems(items: NavigationMenuItem[], onSelect?: () => void): MenuItem[] {
    return items.map((item) => ({
      label: item.label,
      icon: item.icon ?? undefined,
      routerLink: item.routerLink,
      command: item.routerLink ? () => onSelect?.() : undefined,
      items: item.items?.length ? this.toPrimeMenuItems(item.items, onSelect) : undefined
    }));
  }

  private flattenNavigation(items: NavigationMenuItem[]): NavigationMenuItem[] {
    return items.flatMap((item) => item.items?.length ? this.flattenNavigation(item.items) : [item]);
  }

  private filterAvailableShortcutTree(
    items: NavigationMenuItem[],
    selectedIds: Set<string>
  ): NavigationMenuItem[] {
    return items.flatMap((item) => {
      const children = item.items?.length
        ? this.filterAvailableShortcutTree(item.items, selectedIds)
        : undefined;
      const canSelectCurrent = this.isShortcutCandidate(item) && !selectedIds.has(item.key);

      if (!canSelectCurrent && !children?.length) {
        return [];
      }

      return [{
        ...item,
        items: children?.length ? children : undefined
      }];
    });
  }

  private isShortcutCandidate(item: NavigationMenuItem): boolean {
    return Boolean(item.routerLink?.length);
  }

  private toRouterLink(path: string | null): string[] | undefined {
    if (!path) {
      return undefined;
    }

    const segments = path.split('/').filter(Boolean);
    if (!segments.length) {
      return undefined;
    }

    return [`/${segments[0]}`, ...segments.slice(1)];
  }

  private normalizeNavigationTree(tree: BackendMenuNode[]): BackendMenuNode[] {
    const nodesById = new Map<number, BackendMenuNode>();
    const encounterOrder = new Map<number, number>();
    let sequence = 0;

    const visit = (node: BackendMenuNode): void => {
      const currentOrder = encounterOrder.get(node.id);
      if (currentOrder === undefined) {
        encounterOrder.set(node.id, sequence++);
      }

      const existing = nodesById.get(node.id);
      const normalizedChildren = Array.isArray(node.children) ? node.children : [];

      if (existing) {
        nodesById.set(node.id, {
          ...existing,
          ...node,
          children: this.mergeUniqueChildren(existing.children, normalizedChildren)
        });
      } else {
        nodesById.set(node.id, {
          ...node,
          children: normalizedChildren
        });
      }

      for (const child of normalizedChildren) {
        visit(child);
      }
    };

    for (const node of tree) {
      visit(node);
    }

    const sanitizedNodes = new Map<number, BackendMenuNode>();
    for (const [id, node] of nodesById.entries()) {
      sanitizedNodes.set(id, {
        ...node,
        children: []
      });
    }

    const roots: BackendMenuNode[] = [];
    const sortedNodes = [...sanitizedNodes.values()].sort((left, right) =>
      (left.order - right.order) ||
      ((encounterOrder.get(left.id) ?? 0) - (encounterOrder.get(right.id) ?? 0))
    );

    for (const node of sortedNodes) {
      if (node.parent_id && sanitizedNodes.has(node.parent_id)) {
        const parent = sanitizedNodes.get(node.parent_id)!;
        if (!parent.children.some((child) => child.id === node.id)) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    const sortRecursively = (nodes: BackendMenuNode[]): BackendMenuNode[] =>
      nodes
        .map((node) => ({
          ...node,
          children: sortRecursively(node.children)
        }))
        .sort((left, right) =>
          (left.order - right.order) ||
          ((encounterOrder.get(left.id) ?? 0) - (encounterOrder.get(right.id) ?? 0))
        );

    return sortRecursively(roots);
  }

  private mergeUniqueChildren(
    currentChildren: BackendMenuNode[],
    incomingChildren: BackendMenuNode[]
  ): BackendMenuNode[] {
    const merged = [...currentChildren];

    for (const child of incomingChildren) {
      if (!merged.some((current) => current.id === child.id)) {
        merged.push(child);
      }
    }

    return merged;
  }
}
