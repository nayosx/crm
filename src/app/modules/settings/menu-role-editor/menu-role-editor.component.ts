import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TreeModule } from 'primeng/tree';
import { finalize } from 'rxjs/operators';
import { BackendMenuFlatItem, RoleMenuCatalogResponse } from '@shared/interfaces/menu.interface';
import { Role } from '@shared/interfaces/user.interface';
import { RolService } from '@shared/services/user/rol.service';

@Component({
  selector: 'app-menu-role-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    TreeModule
  ],
  templateUrl: './menu-role-editor.component.html'
})
export class MenuRoleEditorComponent {
  private readonly rolService = inject(RolService);

  roles: Role[] = [];
  selectedRoleId: number | null = null;
  treeNodes: TreeNode[] = [];
  selection: TreeNode[] = [];
  roleMenuCatalog: RoleMenuCatalogResponse | null = null;
  errorMessage = '';
  successMessage = '';
  loadingRoles = false;
  loadingCatalog = false;
  saving = false;

  constructor() {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loadingRoles = true;
    this.rolService.getRoles()
      .pipe(finalize(() => this.loadingRoles = false))
      .subscribe({
        next: (roles) => {
          this.roles = roles;
        },
        error: () => {
          this.errorMessage = 'No se pudieron cargar los roles.';
        }
      });
  }

  onRoleChange(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.treeNodes = [];
    this.selection = [];

    if (!this.selectedRoleId) {
      this.roleMenuCatalog = null;
      return;
    }

    this.loadingCatalog = true;
    this.rolService.getMenusByRole(this.selectedRoleId)
      .pipe(finalize(() => this.loadingCatalog = false))
      .subscribe({
        next: (response) => {
          this.roleMenuCatalog = response;
          this.treeNodes = this.buildTreeNodes(response.catalog);
          this.selection = this.buildSelection(response.assigned_menu_keys);
        },
        error: () => {
          this.errorMessage = 'No se pudo cargar el catalogo del rol.';
        }
      });
  }

  save(): void {
    if (!this.selectedRoleId || !this.roleMenuCatalog) {
      return;
    }

    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.rolService.updateMenusByRole(this.selectedRoleId, {
      menu_keys: this.buildPayloadKeys()
    })
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: (response) => {
          this.successMessage = 'Menus guardados correctamente.';
          this.selection = this.buildSelection(response.assigned_menu_keys);
        },
        error: (error) => {
          this.errorMessage = error?.error?.error ?? 'No se pudieron guardar los menus.';
        }
      });
  }

  clearSelection(): void {
    this.selection = [];
    this.successMessage = '';
    this.errorMessage = '';
  }

  selectAll(): void {
    if (!this.roleMenuCatalog) {
      return;
    }

    this.selection = this.flattenTreeNodes(this.treeNodes);
    this.successMessage = '';
    this.errorMessage = '';
  }

  private buildTreeNodes(items: BackendMenuFlatItem[]): TreeNode[] {
    const sortedItems = [...items].sort((a, b) => a.order - b.order || a.id - b.id);
    const nodesById = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    for (const item of sortedItems) {
      nodesById.set(item.id, {
        key: item.key,
        label: item.label,
        icon: item.icon ?? undefined,
        data: item,
        children: []
      });
    }

    for (const item of sortedItems) {
      const node = nodesById.get(item.id)!;
      if (item.parent_id && nodesById.has(item.parent_id)) {
        nodesById.get(item.parent_id)!.children ??= [];
        nodesById.get(item.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private buildSelection(menuKeys: string[]): TreeNode[] {
    const keySet = new Set(menuKeys);
    const selectedNodes: TreeNode[] = [];
    const nodesByKey = new Map<string, TreeNode>();

    for (const node of this.flattenTreeNodes(this.treeNodes)) {
      if (node.key) {
        nodesByKey.set(node.key, node);
      }
    }

    for (const key of keySet) {
      const node = nodesByKey.get(key);
      if (node) {
        selectedNodes.push(node);
      }
      let parentKey = this.getParentKey(key);
      while (parentKey) {
        const parentNode = nodesByKey.get(parentKey);
        if (parentNode && !selectedNodes.some((item) => item.key === parentKey)) {
          selectedNodes.push(parentNode);
        }
        parentKey = this.getParentKey(parentKey);
      }
    }

    return selectedNodes;
  }

  private buildPayloadKeys(): string[] {
    const selectedKeys = new Set<string>();

    for (const node of this.selection) {
      if (!node.key) {
        continue;
      }

      selectedKeys.add(node.key);
      let parentKey = this.getParentKey(node.key);
      while (parentKey) {
        selectedKeys.add(parentKey);
        parentKey = this.getParentKey(parentKey);
      }
    }

    if (!this.roleMenuCatalog) {
      return [];
    }

    const orderByKey = new Map(this.roleMenuCatalog.catalog.map((item) => [item.key, item.order]));
    return [...selectedKeys].sort((a, b) => (orderByKey.get(a) ?? 0) - (orderByKey.get(b) ?? 0));
  }

  private getParentKey(childKey: string): string | null {
    const child = this.roleMenuCatalog?.catalog.find((item) => item.key === childKey);
    if (!child?.parent_id) {
      return null;
    }

    const parent = this.roleMenuCatalog?.catalog.find((item) => item.id === child.parent_id);
    return parent?.key ?? null;
  }

  private flattenTreeNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes.flatMap((node) => node.children?.length ? [node, ...this.flattenTreeNodes(node.children)] : [node]);
  }
}
