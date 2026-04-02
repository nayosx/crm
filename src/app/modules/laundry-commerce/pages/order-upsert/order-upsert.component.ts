import { CurrencyPipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, catchError, finalize, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FieldsetModule } from 'primeng/fieldset';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ReactiveFormsModule } from '@angular/forms';
import { ClientAddress } from '@shared/interfaces/client.interface';
import { DeliveryZone } from '../../interfaces/delivery-zone.interface';
import { Extra } from '../../interfaces/extra.interface';
import { DeliveryFeeSuggestion } from '../../interfaces/order.interface';
import { LaundryCommercialService } from '../../interfaces/service.interface';
import { ServicePriceOption } from '../../interfaces/service-price-option.interface';
import { WeightPricingQuoteResponse } from '../../interfaces/weight-pricing.interface';
import {
  LaundryCommerceReferenceData,
  OrderExtraFormModel,
  OrderFormFacade,
  OrderFormModel,
  OrderItemFormModel
} from '../../store/order-form.facade';
import { OrderTotals } from '../../utils/order-totals.util';
import { roundCurrency } from '../../utils/decimal.util';
import { DeliveryZoneSelectorComponent } from '../../components/delivery-zone-selector/delivery-zone-selector.component';
import { OrderExtraFormRowComponent } from '../../components/order-extra-form-row/order-extra-form-row.component';
import { OrderItemFormRowComponent } from '../../components/order-item-form-row/order-item-form-row.component';
import { OrderSummaryCardComponent } from '../../components/order-summary-card/order-summary-card.component';

@Component({
  selector: 'app-order-upsert-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ToolbarModule,
    ButtonModule,
    CardModule,
    FieldsetModule,
    SelectModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    MessageModule,
    ToastModule,
    AccordionModule,
    CurrencyPipe,
    DeliveryZoneSelectorComponent,
    OrderItemFormRowComponent,
    OrderExtraFormRowComponent,
    OrderSummaryCardComponent
  ],
  providers: [MessageService],
  templateUrl: './order-upsert.component.html',
  styleUrl: './order-upsert.component.scss'
})
export class OrderUpsertComponent implements OnInit, OnDestroy {
  @Input({ required: true }) mode!: 'create' | 'edit';

  private readonly facade = inject(OrderFormFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly subscription = new Subscription();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly pageError = signal('');
  readonly addresses = signal<ClientAddress[]>([]);
  readonly referenceData = signal<LaundryCommerceReferenceData | null>(null);
  readonly deliveryFeeSuggestion = signal<DeliveryFeeSuggestion | null>(null);
  readonly deliveryFeeSuggestionLoading = signal(false);
  readonly deliveryFeeSuggestionError = signal('');
  readonly totals = signal<OrderTotals>({
    subtotalItems: 0,
    subtotalExtras: 0,
    delivery: 0,
    globalDiscount: 0,
    totalFinal: 0
  });

  readonly form = this.facade.createOrderForm();
  readonly statusOptions = [
    { label: 'Borrador', value: 'DRAFT' },
    { label: 'Confirmado', value: 'CONFIRMED' },
    { label: 'En proceso', value: 'IN_PROGRESS' },
    { label: 'Listo', value: 'READY' },
    { label: 'Entregado', value: 'DELIVERED' },
    { label: 'Cancelado', value: 'CANCELLED' }
  ];

  readonly clients = computed(() => this.referenceData()?.clients ?? []);
  readonly cashiers = computed(() => this.referenceData()?.cashiers ?? []);
  readonly services = computed(() => this.referenceData()?.services ?? []);
  readonly priceOptions = computed(() => this.referenceData()?.priceOptions ?? []);
  readonly extras = computed(() => this.referenceData()?.extras ?? []);
  readonly deliveryZones = computed(() => this.referenceData()?.deliveryZones ?? []);
  readonly profiles = computed(() => this.referenceData()?.profiles ?? []);

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get itemGroups() {
    return this.form.controls.items.controls;
  }

  get extraGroups() {
    return this.form.controls.extras.controls;
  }

  ngOnInit(): void {
    this.loadInitialState();
    this.bindFormRecalculation();
    this.bindClientChanges();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  addItem(): void {
    this.form.controls.items.push(this.facade.createItemGroup());
    this.recalculateTotals();
  }

  removeItem(index: number): void {
    if (this.form.controls.items.length === 1) {
      return;
    }

    this.form.controls.items.removeAt(index);
    this.recalculateTotals();
  }

  addExtra(): void {
    this.form.controls.extras.push(this.facade.createExtraGroup());
    this.recalculateTotals();
  }

  removeExtra(index: number): void {
    this.form.controls.extras.removeAt(index);
    this.recalculateTotals();
  }

  onServiceSelected(index: number, serviceId: number | null): void {
    const service = this.services().find((item) => item.id === serviceId);
    const group = this.form.controls.items.at(index);
    this.facade.applyServiceSelection(group, service, this.priceOptions());
    this.recalculateTotals();

    if (service?.service_type === 'WEIGHT' && (group.controls.weightLb.value ?? 0) > 0) {
      this.requestQuote(index);
    }
  }

  onPriceOptionSelected(index: number, optionId: number | null): void {
    const option = this.priceOptions().find((item) => item.id === optionId);
    const group = this.form.controls.items.at(index);
    this.facade.applyPriceOptionSelection(group, option);
    this.recalculateTotals();
  }

  onExtraSelected(index: number, extraId: number | null): void {
    const extra = this.extras().find((item) => item.id === extraId);
    const group = this.form.controls.extras.at(index);
    this.facade.applyExtraSelection(group, extra);
    this.recalculateTotals();
  }

  onDeliveryZoneSelected(zoneId: number | null): void {
    this.requestDeliveryFeeSuggestion({
      deliveryZoneId: zoneId,
      syncFinalAmount: !this.isEditMode
    });
  }

  requestQuote(index: number): void {
    const group = this.form.controls.items.at(index);
    const serviceId = group.controls.serviceId.value;
    const weightLb = group.controls.weightLb.value;
    const profileId = this.form.controls.pricingProfileId.value;

    if (!serviceId || !weightLb || !profileId) {
      return;
    }

    this.facade.requestQuote(this.quoteKey(index), {
      profileId,
      weightLb
    }).pipe(
      catchError(() => {
        this.facade.setQuoteError(this.quoteKey(index));
        this.messageService.add({
          severity: 'error',
          summary: 'Cotización fallida',
          detail: 'No fue posible calcular el pricing por peso.'
        });
        return of(null);
      })
    ).subscribe((quote) => {
      if (!quote) {
        return;
      }

      const service = this.services().find((item) => item.id === serviceId);
      this.facade.applyQuote(group, {
        ...quote,
        service_id: serviceId,
        weight_lb: weightLb
      } as WeightPricingQuoteResponse);
      this.recalculateTotals();
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    this.recalculateTotals();

    if (this.form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Revisa los campos obligatorios y los motivos de override.'
      });
      return;
    }

    const payload = this.facade.buildPayload(this.form);
    const orderId = Number(this.route.snapshot.paramMap.get('id'));

    this.saving.set(true);
    this.facade.saveOrder(this.mode, payload, Number.isFinite(orderId) ? orderId : undefined).pipe(
      finalize(() => this.saving.set(false)),
      catchError(() => {
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo guardar',
          detail: 'El pedido no pudo guardarse. Verifica la conexión con el backend.'
        });
        return of(null);
      })
    ).subscribe((order) => {
      if (!order) {
        return;
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Pedido guardado',
        detail: `Pedido #${order.id} guardado correctamente.`
      });
      this.router.navigate(['/laundry', 'commerce', 'orders', order.id]);
    });
  }

  quoteLoading(index: number): boolean {
    return Boolean(this.facade.quoteLoadingKeys()[this.quoteKey(index)]);
  }

  private loadInitialState(): void {
    this.loading.set(true);
    this.facade.loadReferenceData().pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => {
        this.pageError.set('No fue posible cargar los catálogos comerciales.');
        return of(null);
      })
    ).subscribe((referenceData) => {
      if (!referenceData) {
        return;
      }

      this.referenceData.set(referenceData);
      this.setDefaultCashier(referenceData);

      if (this.isEditMode) {
        this.loadOrderForEdit();
        return;
      }

      this.recalculateTotals();
    });
  }

  private loadOrderForEdit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
      this.pageError.set('No se encontró el identificador del pedido a editar.');
      return;
    }

    this.loading.set(true);
    this.facade.getOrder(id).pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => {
        this.pageError.set('No se pudo cargar el pedido.');
        return of(null);
      })
    ).subscribe((order) => {
      if (!order) {
        return;
      }

      this.facade.hydrateOrderForm(this.form, order);

      if (order.client_id) {
        this.loadAddresses(order.client_id, order.client_address_id ?? null);
      }

      this.recalculateTotals();
    });
  }

  private bindFormRecalculation(): void {
    this.subscription.add(
      this.form.valueChanges.subscribe(() => {
        this.recalculateTotals();
      })
    );
  }

  private bindClientChanges(): void {
    this.subscription.add(
      this.form.controls.clientId.valueChanges.subscribe((clientId) => {
        this.form.controls.clientAddressId.setValue(null, { emitEvent: false });
        this.clearDeliverySuggestionState();
        if (!clientId) {
          this.addresses.set([]);
          return;
        }

        this.loadAddresses(clientId, null);
      })
    );

    this.subscription.add(
      this.form.controls.clientAddressId.valueChanges.subscribe((clientAddressId) => {
        this.requestDeliveryFeeSuggestion({
          clientAddressId,
          syncFinalAmount: !this.isEditMode
        });
      })
    );
  }

  private loadAddresses(clientId: number, selectedAddressId: number | null): void {
    this.facade.getClientAddresses(clientId).pipe(
      catchError(() => {
        this.addresses.set([]);
        this.messageService.add({
          severity: 'warn',
          summary: 'Direcciones no disponibles',
          detail: 'No fue posible cargar las direcciones del cliente.'
        });
        return of([]);
      })
    ).subscribe((addresses) => {
      this.addresses.set(addresses);

      if (selectedAddressId) {
        this.form.controls.clientAddressId.setValue(selectedAddressId, { emitEvent: false });
        this.requestDeliveryFeeSuggestion({
          clientId,
          clientAddressId: selectedAddressId,
          syncFinalAmount: false
        });
        return;
      }

      const defaultAddressId = addresses[0]?.id ?? null;
      this.form.controls.clientAddressId.setValue(defaultAddressId, { emitEvent: false });
      this.requestDeliveryFeeSuggestion({
        clientId,
        clientAddressId: defaultAddressId,
        syncFinalAmount: !this.isEditMode
      });
    });
  }

  private recalculateTotals(): void {
    this.itemGroups.forEach((group) => this.facade.refreshItemValidators(group));
    this.totals.set(this.facade.recalculateOrder(this.form));
  }

  private setDefaultCashier(referenceData: LaundryCommerceReferenceData): void {
    if (this.form.controls.cashierUserId.value || !referenceData.cashiers.length) {
      if (!this.form.controls.pricingProfileId.value && referenceData.profiles.length) {
        this.form.controls.pricingProfileId.setValue(referenceData.profiles[0].id, { emitEvent: false });
      }
      return;
    }

    this.form.controls.cashierUserId.setValue(referenceData.cashiers[0].id, { emitEvent: false });

    if (!this.form.controls.pricingProfileId.value && referenceData.profiles.length) {
      this.form.controls.pricingProfileId.setValue(referenceData.profiles[0].id, { emitEvent: false });
    }
  }

  getDeliveryReferenceLabel(): string {
    const suggestion = this.deliveryFeeSuggestion();
    if (!suggestion) {
      return 'Ultimo costo cobrado';
    }

    if (suggestion.has_previous_delivery_for_client_address) {
      return 'Ultimo costo en esta direccion';
    }

    if (suggestion.has_previous_delivery_for_client) {
      return 'Ultimo costo a este cliente';
    }

    return 'Ultimo costo cobrado';
  }

  getDeliveryReferenceAmount(): number {
    const suggestion = this.deliveryFeeSuggestion();
    if (!suggestion) {
      return 0;
    }

    if (suggestion.has_previous_delivery_for_client_address) {
      return suggestion.last_delivery_fee_final_for_client_address;
    }

    if (suggestion.has_previous_delivery_for_client) {
      return suggestion.last_delivery_fee_final_for_client;
    }

    return 0;
  }

  hasDeliveryHistory(): boolean {
    const suggestion = this.deliveryFeeSuggestion();
    return Boolean(
      suggestion?.has_previous_delivery_for_client_address
      || suggestion?.has_previous_delivery_for_client
    );
  }

  private quoteKey(index: number): string {
    const serviceId = this.form.controls.items.at(index).controls.serviceId.value ?? 'new';
    return `${index}-${serviceId}`;
  }

  private requestDeliveryFeeSuggestion(options?: {
    clientId?: number | null;
    clientAddressId?: number | null;
    deliveryZoneId?: number | null;
    syncFinalAmount?: boolean;
  }): void {
    const clientId = options?.clientId ?? this.form.controls.clientId.value;
    const clientAddressId = options?.clientAddressId ?? this.form.controls.clientAddressId.value;
    const deliveryZoneId = options?.deliveryZoneId ?? this.form.controls.deliveryZoneId.value;

    if (!clientId) {
      this.clearDeliverySuggestionState();
      return;
    }

    this.deliveryFeeSuggestionLoading.set(true);
    this.deliveryFeeSuggestionError.set('');

    this.facade.getDeliveryFeeSuggestion({
      client_id: clientId,
      client_address_id: clientAddressId,
      delivery_zone_id: deliveryZoneId
    }).pipe(
      finalize(() => this.deliveryFeeSuggestionLoading.set(false)),
      catchError(() => {
        this.deliveryFeeSuggestion.set(null);
        this.deliveryFeeSuggestionError.set('No fue posible obtener la sugerencia de delivery.');
        return of(null);
      })
    ).subscribe((suggestion) => {
      if (!suggestion) {
        return;
      }

      this.deliveryFeeSuggestion.set(suggestion);

      const patch: Partial<{
        deliverySuggestedAmount: number;
        deliveryFinalAmount: number;
        deliveryOverrideReason: string;
      }> = {
        deliverySuggestedAmount: suggestion.delivery_fee_suggested_by_zone
      };

      if (options?.syncFinalAmount) {
        patch.deliveryFinalAmount = suggestion.initial_delivery_fee_final;
        patch.deliveryOverrideReason = '';
      }

      this.form.patchValue(patch, { emitEvent: false });
      this.recalculateTotals();
    });
  }

  private clearDeliverySuggestionState(): void {
    this.deliveryFeeSuggestion.set(null);
    this.deliveryFeeSuggestionLoading.set(false);
    this.deliveryFeeSuggestionError.set('');
    this.form.patchValue({
      deliverySuggestedAmount: 0,
      deliveryFinalAmount: this.isEditMode ? this.form.controls.deliveryFinalAmount.value : 0,
      deliveryOverrideReason: this.isEditMode ? this.form.controls.deliveryOverrideReason.value : ''
    }, { emitEvent: false });
    this.recalculateTotals();
  }
}
