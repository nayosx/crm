import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ServicePriceOption, ServicePriceOptionPayload } from '../../interfaces/service-price-option.interface';
import { LaundryCommercialService } from '../../interfaces/service.interface';
import { ServicePriceOptionsApiService } from '../../services/service-price-options-api.service';
import { ServicesApiService } from '../../services/services-api.service';

@Component({
  selector: 'app-price-options-catalog-page',
  imports: [
    ReactiveFormsModule,
    ToolbarModule,
    TableModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ToastModule,
    CurrencyPipe
  ],
  providers: [MessageService],
  templateUrl: './price-options-catalog.component.html',
  styleUrl: './price-options-catalog.component.scss'
})
export class PriceOptionsCatalogComponent implements OnInit {
  private readonly servicesApi = inject(ServicesApiService);
  private readonly priceOptionsApi = inject(ServicePriceOptionsApiService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly drawerVisible = signal(false);
  readonly services = signal<LaundryCommercialService[]>([]);
  readonly options = signal<ServicePriceOption[]>([]);
  readonly editingId = signal<number | null>(null);

  readonly form = new FormGroup({
    serviceId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    suggestedPrice: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    minQuantity: new FormControl<number | null>(null),
    maxQuantity: new FormControl<number | null>(null),
    isDefault: new FormControl(false, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true })
  });

  ngOnInit(): void {
    this.loadData();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      serviceId: null,
      label: '',
      suggestedPrice: 0,
      minQuantity: null,
      maxQuantity: null,
      isDefault: false,
      isActive: true
    });
    this.drawerVisible.set(true);
  }

  openEdit(option: ServicePriceOption): void {
    this.editingId.set(option.id);
    this.form.reset({
      serviceId: option.service_id,
      label: option.label,
      suggestedPrice: Number(option.suggested_price),
      minQuantity: option.min_quantity ?? null,
      maxQuantity: option.max_quantity ?? null,
      isDefault: option.is_default,
      isActive: option.is_active
    });
    this.drawerVisible.set(true);
  }

  save(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload: ServicePriceOptionPayload = {
      service_id: this.form.controls.serviceId.value!,
      label: this.form.controls.label.value,
      suggested_price: this.form.controls.suggestedPrice.value,
      min_quantity: this.form.controls.minQuantity.value,
      max_quantity: this.form.controls.maxQuantity.value,
      is_default: this.form.controls.isDefault.value,
      is_active: this.form.controls.isActive.value
    };

    const request = this.editingId()
      ? this.priceOptionsApi.update(this.editingId()!, payload)
      : this.priceOptionsApi.create(payload);

    this.saving.set(true);
    request.pipe(
      finalize(() => this.saving.set(false)),
      catchError(() => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el precio sugerido.' });
        return of(null);
      })
    ).subscribe((response) => {
      if (!response) {
        return;
      }

      this.drawerVisible.set(false);
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Precio sugerido actualizado.' });
      this.loadData();
    });
  }

  serviceName(serviceId: number): string {
    return this.services().find((item) => item.id === serviceId)?.name ?? String(serviceId);
  }

  private loadData(): void {
    this.loading.set(true);
    forkJoin({
      services: this.servicesApi.list({ page: 1, per_page: 300 }),
      options: this.priceOptionsApi.list({ page: 1, per_page: 500 })
    }).pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => of(null))
    ).subscribe((result) => {
      if (!result) {
        return;
      }

      this.services.set(result.services.items);
      this.options.set(result.options.items);
    });
  }
}
