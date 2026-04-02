import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
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
import { Extra, ExtraPayload } from '../../interfaces/extra.interface';
import { ExtrasApiService } from '../../services/extras-api.service';

@Component({
  selector: 'app-extras-catalog-page',
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
  templateUrl: './extras-catalog.component.html',
  styleUrl: './extras-catalog.component.scss'
})
export class ExtrasCatalogComponent implements OnInit {
  private readonly extrasApi = inject(ExtrasApiService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly drawerVisible = signal(false);
  readonly extras = signal<Extra[]>([]);
  readonly editingId = signal<number | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    code: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    unitLabel: new FormControl('', { nonNullable: true }),
    suggestedUnitPrice: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    allowManualPriceOverride: new FormControl(false, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true })
  });

  ngOnInit(): void {
    this.loadExtras();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      code: '',
      description: '',
      unitLabel: '',
      suggestedUnitPrice: 0,
      allowManualPriceOverride: false,
      isActive: true
    });
    this.drawerVisible.set(true);
  }

  openEdit(extra: Extra): void {
    this.editingId.set(extra.id);
    this.form.reset({
      name: extra.name,
      code: extra.code ?? '',
      description: extra.description ?? '',
      unitLabel: extra.unit_label ?? '',
      suggestedUnitPrice: Number(extra.suggested_unit_price),
      allowManualPriceOverride: extra.allow_manual_price_override,
      isActive: extra.is_active
    });
    this.drawerVisible.set(true);
  }

  save(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload: ExtraPayload = {
      name: this.form.controls.name.value,
      code: this.form.controls.code.value || null,
      description: this.form.controls.description.value || null,
      unit_label: this.form.controls.unitLabel.value || null,
      suggested_unit_price: this.form.controls.suggestedUnitPrice.value,
      allow_manual_price_override: this.form.controls.allowManualPriceOverride.value,
      is_active: this.form.controls.isActive.value
    };

    const request = this.editingId()
      ? this.extrasApi.update(this.editingId()!, payload)
      : this.extrasApi.create(payload);

    this.saving.set(true);
    request.pipe(
      finalize(() => this.saving.set(false)),
      catchError(() => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el extra.' });
        return of(null);
      })
    ).subscribe((response) => {
      if (!response) {
        return;
      }

      this.drawerVisible.set(false);
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Extra actualizado correctamente.' });
      this.loadExtras();
    });
  }

  private loadExtras(): void {
    this.loading.set(true);
    this.extrasApi.list({ page: 1, per_page: 300 }).pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => of({ items: [], total: 0, pages: 0, current_page: 1, per_page: 300 }))
    ).subscribe((response) => this.extras.set(response.items));
  }
}
