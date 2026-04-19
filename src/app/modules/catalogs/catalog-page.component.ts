import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  CatalogFilterParams,
  CatalogListItem,
  CatalogMutationPayload,
  CatalogResourceKind,
  PricingMode
} from '@shared/interfaces/catalog.interface';
import { DecimalInputComponent } from '@shared/components/decimal-input/decimal-input.component';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { CatalogApiService } from '@shared/services/catalog/catalog-api.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs/operators';

interface SelectOption<T = string | number> {
  label: string;
  value: T;
}

interface CatalogPageRouteData {
  kind: CatalogResourceKind;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-catalog-page',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    CheckboxModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    DecimalInputComponent,
    LoaderDialogComponent
  ],
  templateUrl: './catalog-page.component.html',
  providers: [ConfirmationService, MessageService]
})
export class CatalogPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  @ViewChild(LoaderDialogComponent) loader?: LoaderDialogComponent;

  readonly activeFilterOptions: SelectOption<'all' | 'true' | 'false'>[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Activos', value: 'true' },
    { label: 'Inactivos', value: 'false' }
  ];
  readonly pricingModeOptions: SelectOption<PricingMode>[] = [
    { label: 'Fijo', value: 'FIXED' },
    { label: 'Por peso', value: 'WEIGHT' },
    { label: 'Delivery', value: 'DELIVERY' }
  ];

  kind: CatalogResourceKind = 'extras';
  title = '';
  subtitle = '';
  items: CatalogListItem[] = [];
  categories: CatalogListItem[] = [];
  services: CatalogListItem[] = [];

  loading = false;
  saving = false;
  deletingId: number | null = null;
  dialogVisible = false;
  loadError = '';
  activeFilter: 'all' | 'true' | 'false' = 'all';
  selectedCategoryFilter: number | null = null;
  selectedServiceFilter: number | null = null;
  editingId: number | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    is_active: true,
    default_price: ['0.00'],
    category_id: [null as number | null],
    pricing_mode: ['FIXED' as PricingMode],
    service_id: [null as number | null],
    price: ['0.00']
  });

  constructor() {
    this.route.data.subscribe((data) => {
      this.applyRouteData(data as CatalogPageRouteData);
    });
  }

  get categoryOptions(): SelectOption<number>[] {
    return this.categories.map((item) => ({
      label: item.name,
      value: item.id
    }));
  }

  get serviceOptions(): SelectOption<number>[] {
    return this.services.map((item) => {
      const categoryName = this.categories.find((category) => category.id === item.category_id)?.name;
      return {
        label: categoryName ? `${item.name} · ${categoryName}` : item.name,
        value: item.id
      };
    });
  }

  get dialogTitle(): string {
    return this.editingId ? `Editar ${this.title}` : `Crear ${this.title}`;
  }

  get nameMaxLength(): number {
    return this.kind === 'service-variants' ? 50 : 100;
  }

  canCreate(): boolean {
    if (this.kind === 'services') {
      return this.categories.length > 0;
    }

    if (this.kind === 'service-variants') {
      return this.services.length > 0;
    }

    return true;
  }

  openCreateDialog(): void {
    if (!this.canCreate() || this.saving) {
      return;
    }

    this.editingId = null;
    this.resetForm();
    this.dialogVisible = true;
  }

  openEditDialog(item: CatalogListItem): void {
    if (this.saving) {
      return;
    }

    this.editingId = item.id;
    this.resetForm();
    this.form.patchValue({
      name: item.name,
      is_active: item.is_active,
      default_price: item.default_price ?? '0.00',
      category_id: item.category_id ?? null,
      pricing_mode: item.pricing_mode ?? 'FIXED',
      service_id: item.service_id ?? null,
      price: item.price ?? '0.00'
    });
    this.dialogVisible = true;
  }

  closeDialog(): void {
    if (this.saving) {
      return;
    }

    this.dialogVisible = false;
    this.editingId = null;
  }

  save(): void {
    if (this.saving) {
      return;
    }

    this.applyValidatorsForKind();
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload = this.buildPayload();
    this.saving = true;

    const request$ = this.editingId
      ? this.catalogApi.update(this.kind, this.editingId, payload)
      : this.catalogApi.create(this.kind, payload);

    request$
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: (response) => {
          this.dialogVisible = false;
          this.editingId = null;
          this.messageService.add({
            severity: 'success',
            summary: 'Guardado',
            detail: response.message || 'Catalogo guardado correctamente.'
          });
          this.reloadAfterMutation();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.extractErrorMessage(error, 'No se pudo guardar el catalogo.')
          });
        }
      });
  }

  confirmDelete(item: CatalogListItem): void {
    if (this.deletingId !== null || this.saving) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Eliminar registro',
      message: `Se eliminara "${item.name}". Esta accion no se puede deshacer desde esta pantalla.`,
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
        this.deletingId = item.id;
        this.catalogApi.delete(this.kind, item.id)
          .pipe(finalize(() => this.deletingId = null))
          .subscribe({
            next: (response) => {
              this.messageService.add({
                severity: 'success',
                summary: 'Eliminado',
                detail: response.message || 'Registro eliminado correctamente.'
              });
              this.reloadAfterMutation();
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: this.extractErrorMessage(error, 'No se pudo eliminar el registro.')
              });
            }
          });
      }
    });
  }

  loadData(options?: { showLoader?: boolean; onComplete?: () => void }): void {
    const showLoader = options?.showLoader ?? true;

    this.loading = true;
    this.loadError = '';
    if (showLoader) {
      this.loader?.open('Cargando catalogo...');
    }

    this.catalogApi.list(this.kind, this.buildFilters())
      .pipe(finalize(() => {
        this.loading = false;
        if (showLoader) {
          this.loader?.close();
        }
        options?.onComplete?.();
      }))
      .subscribe({
        next: (items) => {
          this.items = items;
        },
        error: (error) => {
          this.items = [];
          this.loadError = this.extractErrorMessage(error, 'No se pudo cargar el catalogo.');
        }
      });
  }

  onFiltersChange(): void {
    this.loadData();
  }

  trackById(_: number, item: CatalogListItem): number {
    return item.id;
  }

  getCategoryName(categoryId: number | undefined): string {
    if (!categoryId) {
      return '-';
    }

    return this.categories.find((category) => category.id === categoryId)?.name ?? `#${categoryId}`;
  }

  getServiceName(serviceId: number | undefined): string {
    if (!serviceId) {
      return '-';
    }

    return this.services.find((service) => service.id === serviceId)?.name ?? `#${serviceId}`;
  }

  private applyRouteData(data: CatalogPageRouteData): void {
    this.kind = data.kind;
    this.title = data.title;
    this.subtitle = data.subtitle;
    this.dialogVisible = false;
    this.editingId = null;
    this.activeFilter = 'all';
    this.selectedCategoryFilter = null;
    this.selectedServiceFilter = null;
    this.resetForm();
    this.loadDependenciesAndData();
  }

  private loadDependenciesAndData(): void {
    this.loader?.open('Cargando catalogo...');
    this.loadDependencyCatalogs(() =>
      this.loadData({
        showLoader: false,
        onComplete: () => this.loader?.close()
      })
    );
  }

  private reloadAfterMutation(): void {
    this.loadDependencyCatalogs(() => this.loadData());
  }

  private loadDependencyCatalogs(onDone: () => void): void {
    if (this.kind === 'services') {
      this.catalogApi.list('service-categories', { is_active: true }).subscribe({
        next: (categories) => {
          this.categories = categories;
          onDone();
        },
        error: () => {
          this.categories = [];
          onDone();
        }
      });
      return;
    }

    if (this.kind === 'service-variants') {
      this.catalogApi.list('service-categories', { is_active: true }).subscribe({
        next: (categories) => {
          this.categories = categories;
          this.catalogApi.list('services', { is_active: true }).subscribe({
            next: (services) => {
              this.services = services;
              onDone();
            },
            error: () => {
              this.services = [];
              onDone();
            }
          });
        },
        error: () => {
          this.categories = [];
          this.catalogApi.list('services', { is_active: true }).subscribe({
            next: (services) => {
              this.services = services;
              onDone();
            },
            error: () => {
              this.services = [];
              onDone();
            }
          });
        }
      });
      return;
    }

    this.categories = [];
    this.services = [];
    onDone();
  }

  private buildFilters(): CatalogFilterParams {
    const filters: CatalogFilterParams = {};

    if (this.activeFilter !== 'all') {
      filters.is_active = this.activeFilter === 'true';
    }

    if (this.kind === 'services' && this.selectedCategoryFilter) {
      filters.category_id = this.selectedCategoryFilter;
    }

    if (this.kind === 'service-variants' && this.selectedServiceFilter) {
      filters.service_id = this.selectedServiceFilter;
    }

    return filters;
  }

  private resetForm(): void {
    this.form.reset({
      name: '',
      is_active: true,
      default_price: '0.00',
      category_id: null,
      pricing_mode: 'FIXED',
      service_id: null,
      price: '0.00'
    });
    this.applyValidatorsForKind();
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private applyValidatorsForKind(): void {
    const nameControl = this.form.controls.name;
    const defaultPriceControl = this.form.controls.default_price;
    const categoryIdControl = this.form.controls.category_id;
    const pricingModeControl = this.form.controls.pricing_mode;
    const serviceIdControl = this.form.controls.service_id;
    const priceControl = this.form.controls.price;

    nameControl.setValidators([Validators.required, Validators.maxLength(this.kind === 'service-variants' ? 50 : 100)]);
    defaultPriceControl.clearValidators();
    categoryIdControl.clearValidators();
    pricingModeControl.clearValidators();
    serviceIdControl.clearValidators();
    priceControl.clearValidators();

    if (this.kind === 'extras') {
      defaultPriceControl.setValidators([Validators.required]);
    }

    if (this.kind === 'services') {
      categoryIdControl.setValidators([Validators.required]);
      pricingModeControl.setValidators([Validators.required]);
    }

    if (this.kind === 'service-variants') {
      serviceIdControl.setValidators([Validators.required]);
      priceControl.setValidators([Validators.required]);
    }

    nameControl.updateValueAndValidity({ emitEvent: false });
    defaultPriceControl.updateValueAndValidity({ emitEvent: false });
    categoryIdControl.updateValueAndValidity({ emitEvent: false });
    pricingModeControl.updateValueAndValidity({ emitEvent: false });
    serviceIdControl.updateValueAndValidity({ emitEvent: false });
    priceControl.updateValueAndValidity({ emitEvent: false });
  }

  private buildPayload(): CatalogMutationPayload {
    const rawValue = this.form.getRawValue();

    if (this.kind === 'extras') {
      return {
        name: rawValue.name.trim(),
        default_price: rawValue.default_price || '0.00',
        is_active: rawValue.is_active
      };
    }

    if (this.kind === 'service-categories') {
      return {
        name: rawValue.name.trim(),
        is_active: rawValue.is_active
      };
    }

    if (this.kind === 'services') {
      return {
        category_id: Number(rawValue.category_id),
        name: rawValue.name.trim(),
        pricing_mode: rawValue.pricing_mode,
        is_active: rawValue.is_active
      };
    }

    return {
      service_id: Number(rawValue.service_id),
      name: rawValue.name.trim(),
      price: rawValue.price || '0.00',
      is_active: rawValue.is_active
    };
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
      return this.extractTextFromHtml(httpError.error) || httpError.error || fallback;
    }

    if (httpError.error && typeof httpError.error === 'object') {
      const payload = httpError.error as Record<string, unknown>;
      const directMessage = payload['error'] ?? payload['msg'] ?? payload['message'];

      if (typeof directMessage === 'string' && directMessage.trim()) {
        return directMessage;
      }
    }

    if (typeof httpError.message === 'string' && httpError.message.trim()) {
      return httpError.message;
    }

    if (httpError.status === 404) {
      return 'Registro no encontrado.';
    }

    return fallback;
  }

  private extractTextFromHtml(value: string): string {
    const stripped = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return stripped;
  }
}
