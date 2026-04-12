import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import {
  LaundryServiceFulfillmentType,
  LaundryServiceHeaderPayload,
  LaundryServiceLabel,
  LaundryServiceSummaryExtra,
  LaundryServiceSummaryItem,
  LaundryServiceSummaryResponse,
  LaundryServiceSummaryWeightDetail,
  LaundryServiceStatus
} from '@shared/interfaces/laundry-service.interface';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { DialogLoadingService } from '@shared/services/dialog-loading.service';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { LaundryServiceLabelMap, LaundryStatusLabelMap } from '@shared/i18n/laundry-ui-texts';
import { ToBackLaundry } from '@modules/laundry/commons/route';

type SelectOption<T> = {
  label: string;
  value: T;
};

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined;

@Component({
  selector: 'app-laundry-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    TagModule,
    ToastModule,
    ToggleSwitchModule,
    LoaderDialogComponent,
    BackButtonComponent
  ],
  providers: [MessageService],
  templateUrl: './detail.component.html',
  styles: [`
    .summary-copy-button {
      transition: transform 180ms ease, filter 180ms ease;
    }

    .summary-copy-button--copied {
      animation: summary-copy-pop 420ms ease;
      filter: saturate(1.15);
    }

    @keyframes summary-copy-pop {
      0% {
        transform: scale(1);
      }
      45% {
        transform: scale(1.06);
      }
      100% {
        transform: scale(1);
      }
    }
  `]
})
export class DetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly laundryService = inject(LaundryService);
  private readonly messageService = inject(MessageService);
  private readonly dialogLoadingService = inject(DialogLoadingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(false);
  readonly summary = signal<LaundryServiceSummaryResponse | null>(null);
  readonly serviceId = signal<number>(0);
  readonly isSummaryCopied = signal(false);

  readonly headerForm = this.fb.group({
    is_express: this.fb.control(false, { nonNullable: true }),
    fulfillment_type: this.fb.control<LaundryServiceFulfillmentType>('WALK_IN', { nonNullable: true, validators: [Validators.required] }),
    distance_km: this.fb.control<number | null>(null),
    manual_delivery_fee: this.fb.control<number | null>(null)
  });

  readonly fulfillmentOptions: SelectOption<LaundryServiceFulfillmentType>[] = [
    { label: 'No tiene delivery', value: 'WALK_IN' },
    { label: 'Solo Envio/Entrega', value: 'DELIVERY' },
    { label: 'Delivery completo', value: 'PICKUP_DELIVERY' }
  ];

  readonly statusLabel = computed(() => {
    const status = this.summary()?.laundry_service.status;
    return status ? LaundryStatusLabelMap[status] : 'Sin estado';
  });

  readonly serviceLabel = computed(() => {
    const value = this.summary()?.laundry_service.service_label;
    return value ? LaundryServiceLabelMap[value] : 'Sin tipo';
  });

  readonly backRoute = computed(() => {
    const status = this.summary()?.laundry_service.status ?? (this.route.snapshot.queryParamMap.get('status') as LaundryServiceStatus | null);
    return status ? `/${ToBackLaundry(status)}` : '/laundry';
  });

  readonly deliveryControlsEnabled = signal(false);
  readonly distanceControlDisabled = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.serviceId.set(id);

    if (!id) {
      this.showError('No se encontró el servicio de lavandería.');
      return;
    }

    this.headerForm.controls.fulfillment_type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.syncDeliveryFieldState(value, this.headerForm.controls.manual_delivery_fee.value);
      });

    this.headerForm.controls.manual_delivery_fee.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.syncDeliveryFieldState(this.headerForm.controls.fulfillment_type.value, value);
      });

    this.loadSummary();
  }

  clientPhones(): string[] {
    return (this.summary()?.client_phones ?? []).map((phone) => phone.phone_number).filter(Boolean);
  }

  automaticItems(): LaundryServiceSummaryItem[] {
    return this.summary()?.automatic_items ?? [];
  }

  manualItems(): LaundryServiceSummaryItem[] {
    return (this.summary()?.manual_items ?? []).filter((item) => this.hasVisibleItemValues(item));
  }

  manualSummaryLabel(item: LaundryServiceSummaryItem): string {
    const variants = new Set(
      this.manualItems()
        .filter((manualItem) => manualItem.service_id === item.service_id)
        .map((manualItem) => manualItem.service_variant_name)
        .filter((variantName): variantName is string => Boolean(variantName))
    );

    return variants.size > 1 && item.service_variant_name
      ? `${item.service_name} - ${item.service_variant_name}`
      : item.service_name;
  }

  extras(): LaundryServiceSummaryExtra[] {
    return (this.summary()?.extras ?? []).filter((extra) => this.hasVisibleExtraValues(extra));
  }

  weightService(): LaundryServiceSummaryWeightDetail | null {
    return this.summary()?.weight_service_detail ?? null;
  }

  showWeightServiceSummary(): boolean {
    const summary = this.summary();
    if (!summary) {
      return false;
    }

    const subtotal = Number(summary.summary.weight_service_subtotal ?? 0);
    const weight = Number(summary.weight_service_detail?.weight_lb ?? 0);
    return subtotal > 0 || weight > 0;
  }

  async copySummaryForWhatsApp(): Promise<void> {
    const summary = this.summary();
    if (!summary) {
      this.showError('No hay resumen disponible para copiar.');
      return;
    }

    const content = this.buildWhatsAppSummary(summary);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        this.copyTextWithTextarea(content);
      }

      this.isSummaryCopied.set(true);
      window.setTimeout(() => this.isSummaryCopied.set(false), 1800);
      this.showSuccess('Resumen copiado para WhatsApp.');
    } catch {
      this.showError('No se pudo copiar el resumen.');
    }
  }

  saveHeader(): void {
    if (this.headerForm.invalid || !this.serviceId()) {
      this.headerForm.markAllAsTouched();
      this.showError('Revisa los campos de cabecera antes de guardar.');
      return;
    }

    const payload = this.buildHeaderPayload();
    this.setBusy(true, 'Guardando cabecera operativa...');

    this.laundryService.updateHeader(this.serviceId(), payload).pipe(
      finalize(() => this.setBusy(false))
    ).subscribe({
      next: (summary) => {
        this.applySummary(summary);
        this.showSuccess('Cabecera operativa actualizada.');
      },
      error: (error) => this.showError(this.extractErrorMessage(error, 'No se pudo guardar la cabecera operativa.'))
    });
  }

  itemSubtotal(item: LaundryServiceSummaryItem): number {
    return Number(item.quantity ?? 0) * Number(item.applied_price ?? 0);
  }

  itemMeta(item: LaundryServiceSummaryItem): string[] {
    const meta: string[] = [
      item.service_category_name,
      item.pricing_mode
    ];

    if (item.service_variant_name) {
      meta.push(item.service_variant_name);
    }

    if (item.garment_type_name) {
      meta.push(item.garment_type_name);
    }

    const snapshot = this.snapshotMeta(item);
    if (snapshot) {
      meta.push(snapshot);
    }

    return meta.filter(Boolean);
  }

  extraMeta(extra: LaundryServiceSummaryExtra): string[] {
    const meta: string[] = [];

    if (extra.is_courtesy) {
      meta.push('Cortesía');
    }

    meta.push(`Precio unitario ${this.formatMoney(extra.unit_price)}`);
    return meta;
  }

  weightGarmentMeta(garment: LaundryServiceSummaryWeightDetail['garments'][number]): string {
    return `${this.formatQuantity(garment.quantity)} prendas`;
  }

  private hasVisibleItemValues(item: LaundryServiceSummaryItem): boolean {
    const quantity = Number(item.quantity ?? 0);
    const appliedPrice = Number(item.applied_price ?? 0);
    return quantity > 0 || appliedPrice > 0 || this.itemSubtotal(item) > 0;
  }

  private hasVisibleExtraValues(extra: LaundryServiceSummaryExtra): boolean {
    const quantity = Number(extra.quantity ?? 0);
    const unitPrice = Number(extra.unit_price ?? 0);
    const subtotal = Number(extra.subtotal ?? 0);
    return quantity > 0 || unitPrice > 0 || subtotal > 0;
  }

  private buildWhatsAppSummary(summary: LaundryServiceSummaryResponse): string {
    const lines: string[] = [
      `*Resumen servicio #${summary.laundry_service.id}*`,
      `*Cliente:* ${summary.client.name}`,
      `*Programado:* ${this.formatDate(summary.laundry_service.scheduled_pickup_at)}`,
      `*Estado:* ${this.statusLabel()}`,
      `*Tipo:* ${this.serviceLabel()}`,
      ''
    ];

    const automaticLines = this.automaticItems().map((item) =>
      `- ${item.service_name}: ${this.formatMoney(this.itemSubtotal(item))} (${this.formatQuantity(item.quantity)} x ${this.formatMoney(item.applied_price)})`
    );

    if (automaticLines.length) {
      lines.push('*Servicios automáticos:*');
      lines.push(...automaticLines);
      lines.push('');
    }

    if (this.showWeightServiceSummary()) {
      const weight = this.weightService();
      lines.push('*Lavado por peso:*');
      lines.push(`- Subtotal: ${this.formatMoney(summary.summary.weight_service_subtotal)}`);

      if (weight) {
        lines.push(`- Peso: ${this.formatQuantity(weight.weight_lb)} lb`);
      }

      lines.push('');
    }

    const manualLines = this.manualItems().map((item) =>
      `- ${this.manualSummaryLabel(item)}: ${this.formatMoney(this.itemSubtotal(item))} (${this.formatQuantity(item.quantity)} x ${this.formatMoney(item.applied_price)})`
    );

    if (manualLines.length) {
      lines.push('*Servicios manuales:*');
      lines.push(...manualLines);
      lines.push('');
    }

    const extraLines = this.extras().map((extra) =>
      `- ${extra.extra_name}: ${this.formatMoney(Number(extra.subtotal ?? 0))} (${this.formatQuantity(extra.quantity)} x ${this.formatMoney(extra.unit_price)})`
    );

    if (extraLines.length) {
      lines.push('*Extras:*');
      lines.push(...extraLines);
      lines.push('');
    }

    lines.push(`*Total general:* ${this.formatMoney(summary.summary.grand_total)}`);
    return lines.join('\n').trim();
  }

  private copyTextWithTextarea(content: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  formatMoney(value: string | number | null | undefined): string {
    return `$${Number(value ?? 0).toFixed(2)}`;
  }

  formatQuantity(value: string | number | null | undefined): string {
    const numericValue = Number(value ?? 0);
    return Number.isInteger(numericValue) ? `${numericValue}` : numericValue.toFixed(2);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-SV', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  statusSeverity(status: LaundryServiceStatus | null | undefined): TagSeverity {
    switch (status) {
      case 'PENDING':
        return 'warn';
      case 'STARTED':
      case 'IN_PROGRESS':
        return 'info';
      case 'READY_FOR_DELIVERY':
        return 'success';
      case 'DELIVERED':
        return 'contrast';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  serviceLabelSeverity(label: LaundryServiceLabel | null | undefined): TagSeverity {
    return label === 'EXPRESS' ? 'success' : 'secondary';
  }

  hasDeliveryCharge(): boolean {
    const summary = this.summary();
    return Boolean(
      summary
      && summary.laundry_service.fulfillment_type !== 'WALK_IN'
      && summary.automatic_items.some((item) => item.pricing_mode.toUpperCase() === 'DELIVERY')
    );
  }

  private loadSummary(): void {
    this.setBusy(true, 'Cargando detalle del servicio...');

    this.laundryService.getSummary(this.serviceId()).pipe(
      finalize(() => this.setBusy(false))
    ).subscribe({
      next: (summary) => this.applySummary(summary),
      error: (error) => this.showError(this.extractErrorMessage(error, 'No se pudo cargar el detalle del servicio.'))
    });
  }

  private applySummary(summary: LaundryServiceSummaryResponse): void {
    this.summary.set(summary);
    this.headerForm.patchValue(this.buildHeaderFormValue(summary), { emitEvent: false });
    this.syncDeliveryFieldState(
      summary.laundry_service.fulfillment_type,
      this.headerForm.controls.manual_delivery_fee.value
    );
  }

  private buildHeaderFormValue(summary: LaundryServiceSummaryResponse) {
    const deliverySnapshot = summary.automatic_items.find((item) => item.pricing_mode.toUpperCase() === 'DELIVERY')
      ?.calculation_snapshot as Record<string, unknown> | null | undefined;

    return {
      is_express: summary.laundry_service.service_label === 'EXPRESS',
      fulfillment_type: summary.laundry_service.fulfillment_type,
      distance_km: this.toNullableNumber(deliverySnapshot?.['distance_km']),
      manual_delivery_fee: this.toNullableNumber(deliverySnapshot?.['manual_delivery_fee'])
    };
  }

  private buildHeaderPayload(): LaundryServiceHeaderPayload {
    const value = this.headerForm.getRawValue();
    const payload: LaundryServiceHeaderPayload = {
      service_label: value.is_express ? 'EXPRESS' : 'NORMAL',
      fulfillment_type: value.fulfillment_type
    };

    if (value.fulfillment_type !== 'WALK_IN') {
      if (value.distance_km != null) {
        payload.distance_km = Number(value.distance_km);
      }

      if (value.manual_delivery_fee != null) {
        payload.manual_delivery_fee = Number(value.manual_delivery_fee);
      }
    }

    return payload;
  }

  private syncDeliveryFieldState(
    fulfillmentType: LaundryServiceFulfillmentType,
    manualDeliveryFee: number | null
  ): void {
    const deliveryEnabled = fulfillmentType !== 'WALK_IN';
    this.deliveryControlsEnabled.set(deliveryEnabled);

    if (!deliveryEnabled) {
      this.distanceControlDisabled.set(false);
      this.headerForm.controls.distance_km.enable({ emitEvent: false });
      this.headerForm.patchValue({
        distance_km: null,
        manual_delivery_fee: null
      }, { emitEvent: false });
      return;
    }

    const shouldDisableDistance = Number(manualDeliveryFee ?? 0) > 0;
    this.distanceControlDisabled.set(shouldDisableDistance);

    if (shouldDisableDistance) {
      this.headerForm.patchValue({ distance_km: null }, { emitEvent: false });
      this.headerForm.controls.distance_km.disable({ emitEvent: false });
      return;
    }

    this.headerForm.controls.distance_km.enable({ emitEvent: false });
  }

  private snapshotMeta(item: LaundryServiceSummaryItem): string | null {
    if (!item.calculation_snapshot || typeof item.calculation_snapshot !== 'object') {
      return null;
    }

    const snapshot = item.calculation_snapshot as Record<string, unknown>;
    if (item.pricing_mode.toUpperCase() === 'DELIVERY') {
      const distance = this.toNullableNumber(snapshot['distance_km']);
      const finalFee = this.toNullableNumber(snapshot['final_delivery_fee']);

      if (distance != null && finalFee != null) {
        return `${distance.toFixed(2)} km · ${this.formatMoney(finalFee)}`;
      }
    }

    if (snapshot['service_label']) {
      return `Aplica ${snapshot['service_label']}`;
    }

    return null;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;

      if (typeof body === 'string') {
        const trimmed = body.trim();
        if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
          return error.status === 404 ? 'Servicio no encontrado.' : fallback;
        }

        return trimmed || fallback;
      }

      if (body && typeof body === 'object') {
        const message = (body as Record<string, unknown>)['error'] ?? (body as Record<string, unknown>)['msg'];
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }

      if (error.status === 404) {
        return 'Servicio no encontrado.';
      }
    }

    return fallback;
  }

  private setBusy(value: boolean, text?: string): void {
    this.isLoading.set(value);

    if (value) {
      this.dialogLoadingService.show(text);
      return;
    }

    this.dialogLoadingService.hide();
  }

  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Listo', detail });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }
}
