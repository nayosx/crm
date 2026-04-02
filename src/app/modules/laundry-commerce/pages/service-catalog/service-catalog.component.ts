import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ServiceCategory } from '../../interfaces/category.interface';
import { ServicePriceOption } from '../../interfaces/service-price-option.interface';
import {
  LaundryCommercialService,
  LaundryCommercialServicePayload,
  LaundryCommercialServiceType
} from '../../interfaces/service.interface';
import { CategoryApiService } from '../../services/category-api.service';
import { ServicePriceOptionsApiService } from '../../services/service-price-options-api.service';
import { ServicesApiService } from '../../services/services-api.service';

@Component({
  selector: 'app-service-catalog-page',
  imports: [
    ReactiveFormsModule,
    ToolbarModule,
    TableModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    MessageModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './service-catalog.component.html',
  styleUrl: './service-catalog.component.scss'
})
export class ServiceCatalogComponent implements OnInit {
  private readonly categoryApi = inject(CategoryApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly priceOptionsApi = inject(ServicePriceOptionsApiService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly drawerVisible = signal(false);
  readonly categories = signal<ServiceCategory[]>([]);
  readonly services = signal<LaundryCommercialService[]>([]);
  readonly priceOptions = signal<ServicePriceOption[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly statusOptions = [
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false }
  ];
  readonly typeOptions = [
    { label: 'Unitario', value: 'UNIT' },
    { label: 'Por peso', value: 'WEIGHT' }
  ];

  readonly form = new FormGroup({
    categoryId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    code: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    serviceType: new FormControl<LaundryCommercialServiceType>('UNIT', { nonNullable: true, validators: [Validators.required] }),
    unitLabel: new FormControl('', { nonNullable: true }),
    allowManualOverride: new FormControl(false, { nonNullable: true }),
    defaultPriceOptionId: new FormControl<number | null>(null),
    isActive: new FormControl(true, { nonNullable: true, validators: [Validators.required] })
  });

  ngOnInit(): void {
    this.loadData();
  }

  get availablePriceOptions(): ServicePriceOption[] {
    return this.priceOptions().filter((item) => item.service_id === this.editingId());
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      categoryId: null,
      name: '',
      code: '',
      description: '',
      serviceType: 'UNIT',
      unitLabel: '',
      allowManualOverride: false,
      defaultPriceOptionId: null,
      isActive: true
    });
    this.drawerVisible.set(true);
  }

  openEdit(service: LaundryCommercialService): void {
    this.editingId.set(service.id);
    this.form.reset({
      categoryId: service.category_id,
      name: service.name,
      code: service.code ?? '',
      description: service.description ?? '',
      serviceType: service.service_type,
      unitLabel: service.unit_label ?? '',
      allowManualOverride: service.allow_manual_override,
      defaultPriceOptionId: service.default_price_option_id ?? null,
      isActive: service.is_active
    });
    this.drawerVisible.set(true);
  }

  save(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload: LaundryCommercialServicePayload = {
      category_id: this.form.controls.categoryId.value!,
      name: this.form.controls.name.value,
      code: this.form.controls.code.value || null,
      description: this.form.controls.description.value || null,
      service_type: this.form.controls.serviceType.value,
      unit_label: this.form.controls.unitLabel.value || null,
      allow_manual_override: this.form.controls.allowManualOverride.value,
      default_price_option_id: this.form.controls.defaultPriceOptionId.value,
      is_active: this.form.controls.isActive.value
    };

    const request = this.editingId()
      ? this.servicesApi.update(this.editingId()!, payload)
      : this.servicesApi.create(payload);

    this.saving.set(true);
    request.pipe(
      finalize(() => this.saving.set(false)),
      catchError(() => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el servicio.' });
        return of(null);
      })
    ).subscribe((response) => {
      if (!response) {
        return;
      }

      this.drawerVisible.set(false);
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Servicio actualizado correctamente.' });
      this.loadData();
    });
  }

  private loadData(): void {
    this.loading.set(true);
    forkJoin({
      categories: this.categoryApi.list({ page: 1, per_page: 200 }),
      services: this.servicesApi.list({ page: 1, per_page: 300 }),
      priceOptions: this.priceOptionsApi.list({ page: 1, per_page: 500 })
    }).pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => of(null))
    ).subscribe((result) => {
      if (!result) {
        return;
      }

      this.categories.set(result.categories.items);
      this.services.set(result.services.items);
      this.priceOptions.set(result.priceOptions.items);
    });
  }
}
