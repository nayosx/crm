import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import {
  BackendMenuFlatItem,
  CreateMenuPayload,
  UpdateMenuPayload
} from '@shared/interfaces/menu.interface';
import { MenuService } from '@shared/services/navigation/menu.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs/operators';

interface SelectOption<T = string | number | null> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-menu-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoaderDialogComponent,
    TableModule,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './menu-admin.component.html'
})
export class MenuAdminComponent {
  private readonly fb = inject(FormBuilder);
  private readonly menuService = inject(MenuService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  @ViewChild(LoaderDialogComponent) loader?: LoaderDialogComponent;

  menus: BackendMenuFlatItem[] = [];
  loading = false;
  saving = false;
  deletingId: number | null = null;
  dialogVisible = false;
  errorMessage = '';
  editingMenuId: number | null = null;

  readonly form = this.fb.group({
    key: [''],
    label: ['', [Validators.required, Validators.maxLength(120)]],
    path: [''],
    icon: [''],
    show_in_sidebar: this.fb.nonNullable.control(true),
    order: [0],
    parent_id: [null as number | null]
  });

  ngOnInit(): void {
    this.loadMenus();
  }

  get parentOptions(): SelectOption<number | null>[] {
    const options = this.menus
      .filter((menu) => menu.id !== this.editingMenuId)
      .map((menu) => ({
        label: this.buildMenuTreeLabel(menu),
        value: menu.id
      }));

    return [{ label: 'Sin padre', value: null }, ...options];
  }

  openCreateDialog(): void {
    if (this.saving) {
      return;
    }

    this.editingMenuId = null;
    this.resetForm();
    this.dialogVisible = true;
  }

  openEditDialog(menu: BackendMenuFlatItem): void {
    if (this.saving) {
      return;
    }

    this.editingMenuId = menu.id;
    this.resetForm();
    this.form.patchValue({
      key: menu.key,
      label: menu.label,
      path: menu.path ?? '',
      icon: menu.icon ?? '',
      show_in_sidebar: menu.show_in_sidebar,
      order: menu.order,
      parent_id: menu.parent_id
    });
    this.dialogVisible = true;
  }

  closeDialog(): void {
    if (this.saving) {
      return;
    }

    this.dialogVisible = false;
    this.editingMenuId = null;
  }

  save(): void {
    if (this.saving) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const payload = this.buildPayload();
    this.saving = true;
    const request$ = this.editingMenuId
      ? this.menuService.updateMenu(this.editingMenuId, payload as UpdateMenuPayload)
      : this.menuService.createMenu(payload as CreateMenuPayload);

    request$
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: () => {
          this.dialogVisible = false;
          this.editingMenuId = null;
          this.messageService.add({
            severity: 'success',
            summary: 'Guardado',
            detail: 'Menu guardado correctamente.'
          });
          this.loadMenus();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.extractErrorMessage(error, 'No se pudo guardar el menu.')
          });
        }
      });
  }

  confirmDelete(menu: BackendMenuFlatItem): void {
    if (this.deletingId !== null || this.saving) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Eliminar menu',
      message: `Se eliminara "${menu.label}".`,
      icon: 'pi pi-exclamation-triangle',
      closable: true,
      closeOnEscape: true,
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true
      },
      acceptButtonProps: {
        label: 'Eliminar',
        severity: 'danger'
      },
      accept: () => {
        this.deletingId = menu.id;
        this.menuService.deleteMenu(menu.id)
          .pipe(finalize(() => this.deletingId = null))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Eliminado',
                detail: 'Menu eliminado correctamente.'
              });
              this.loadMenus();
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: this.extractErrorMessage(error, 'No se pudo eliminar el menu.')
              });
            }
          });
      }
    });
  }

  loadMenus(): void {
    this.loading = true;
    this.errorMessage = '';
    this.loader?.open('Cargando menus...');

    this.menuService.getCatalog()
      .pipe(finalize(() => {
        this.loading = false;
        this.loader?.close();
      }))
      .subscribe({
        next: (menus) => {
          this.menus = [...menus].sort((a, b) => a.order - b.order || a.id - b.id);
        },
        error: (error) => {
          this.menus = [];
          this.errorMessage = this.extractErrorMessage(error, 'No se pudo cargar el catalogo de menus.');
        }
      });
  }

  getParentLabel(parentId: number | null): string {
    if (!parentId) {
      return 'Raiz';
    }

    return this.menus.find((menu) => menu.id === parentId)?.label ?? `#${parentId}`;
  }

  private resetForm(): void {
    this.form.reset({
      key: '',
      label: '',
      path: '',
      icon: '',
      show_in_sidebar: true,
      order: 0,
      parent_id: null
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private buildPayload(): CreateMenuPayload {
    const rawValue = this.form.getRawValue();

    return {
      key: rawValue.key?.trim() || null,
      label: rawValue.label?.trim() || '',
      path: rawValue.path?.trim() || null,
      icon: rawValue.icon?.trim() || null,
      show_in_sidebar: rawValue.show_in_sidebar,
      order: typeof rawValue.order === 'number' ? rawValue.order : Number(rawValue.order ?? 0),
      parent_id: rawValue.parent_id ?? null
    };
  }

  private buildMenuTreeLabel(menu: BackendMenuFlatItem): string {
    const labels: string[] = [menu.label];
    let currentParentId = menu.parent_id;

    while (currentParentId) {
      const parent = this.menus.find((item) => item.id === currentParentId);
      if (!parent) {
        break;
      }

      labels.unshift(parent.label);
      currentParentId = parent.parent_id;
    }

    return labels.join(' / ');
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const httpError = error as {
      error?: unknown;
      message?: string;
      status?: number;
    };

    if (typeof httpError.error === 'string') {
      return this.stripHtml(httpError.error) || fallback;
    }

    if (httpError.error && typeof httpError.error === 'object') {
      const payload = httpError.error as Record<string, unknown>;
      const message = payload['error'] ?? payload['message'];
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    if (httpError.status === 404) {
      return 'Menu no encontrado.';
    }

    if (typeof httpError.message === 'string' && httpError.message.trim()) {
      return httpError.message;
    }

    return fallback;
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
