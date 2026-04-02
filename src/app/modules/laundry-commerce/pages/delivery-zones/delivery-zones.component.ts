import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { DeliveryZone, DeliveryZonePayload } from '../../interfaces/delivery-zone.interface';
import { DeliveryZonesApiService } from '../../services/delivery-zones-api.service';

@Component({
  selector: 'app-delivery-zones-page',
  imports: [
    ReactiveFormsModule,
    ToolbarModule,
    TableModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    ToastModule,
    CurrencyPipe
  ],
  providers: [MessageService],
  templateUrl: './delivery-zones.component.html',
  styleUrl: './delivery-zones.component.scss'
})
export class DeliveryZonesComponent implements OnInit {
  private readonly deliveryZonesApi = inject(DeliveryZonesApiService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly drawerVisible = signal(false);
  readonly zones = signal<DeliveryZone[]>([]);
  readonly editingId = signal<number | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    code: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    defaultPriceLabel: new FormControl('Base', { nonNullable: true }),
    defaultPrice: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    isActive: new FormControl(true, { nonNullable: true })
  });

  ngOnInit(): void {
    this.loadZones();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      code: '',
      description: '',
      defaultPriceLabel: 'Base',
      defaultPrice: 0,
      isActive: true
    });
    this.drawerVisible.set(true);
  }

  openEdit(zone: DeliveryZone): void {
    const defaultPrice = zone.prices?.find((item) => item.is_default) ?? zone.prices?.[0];
    this.editingId.set(zone.id);
    this.form.reset({
      name: zone.name,
      code: zone.code ?? '',
      description: zone.description ?? '',
      defaultPriceLabel: defaultPrice?.label ?? 'Base',
      defaultPrice: Number(defaultPrice?.price ?? 0),
      isActive: zone.is_active
    });
    this.drawerVisible.set(true);
  }

  save(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload: DeliveryZonePayload = {
      name: this.form.controls.name.value,
      code: this.form.controls.code.value || null,
      description: this.form.controls.description.value || null,
      is_active: this.form.controls.isActive.value
    };

    const request = this.editingId()
      ? this.deliveryZonesApi.update(this.editingId()!, payload)
      : this.deliveryZonesApi.create(payload).pipe(
          switchMap((zone) => {
            if (this.form.controls.defaultPrice.value <= 0) {
              return of(zone);
            }

            return this.deliveryZonesApi.createPrice(zone.id, {
              label: this.form.controls.defaultPriceLabel.value,
              price: this.form.controls.defaultPrice.value,
              is_default: true
            }).pipe(switchMap(() => of(zone)));
          })
        );

    this.saving.set(true);
    request.pipe(
      finalize(() => this.saving.set(false)),
      catchError(() => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la zona.' });
        return of(null);
      })
    ).subscribe((response) => {
      if (!response) {
        return;
      }

      this.drawerVisible.set(false);
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Zona de delivery actualizada.' });
      this.loadZones();
    });
  }

  defaultPrice(zone: DeliveryZone): number {
    return Number(zone.prices?.find((item) => item.is_default)?.price ?? zone.prices?.[0]?.price ?? 0);
  }

  private loadZones(): void {
    this.loading.set(true);
    this.deliveryZonesApi.list({ page: 1, per_page: 200 }).pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => of({ items: [], total: 0, pages: 0, current_page: 1, per_page: 200 }))
    ).subscribe((response) => this.zones.set(response.items));
  }
}
