import { Injectable, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { map, Observable, forkJoin } from 'rxjs';
import { Client, ClientAddress, ClientFullResponse } from '@shared/interfaces/client.interface';
import { ClientAddressService } from '@shared/services/client/client-address.service';
import { ClientService } from '@shared/services/client/client.service';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/user/user.service';
import { CategoryApiService } from '../services/category-api.service';
import { DeliveryZonesApiService } from '../services/delivery-zones-api.service';
import { ExtrasApiService } from '../services/extras-api.service';
import { OrdersApiService } from '../services/orders-api.service';
import { ServicePriceOptionsApiService } from '../services/service-price-options-api.service';
import { ServicesApiService } from '../services/services-api.service';
import { WeightPricingApiService } from '../services/weight-pricing-api.service';
import { ServiceCategory } from '../interfaces/category.interface';
import { DeliveryZone } from '../interfaces/delivery-zone.interface';
import { Extra } from '../interfaces/extra.interface';
import { DeliveryFeeSuggestion, Order, OrderExtraItem, OrderItem, OrderPayload } from '../interfaces/order.interface';
import { ServicePriceOption } from '../interfaces/service-price-option.interface';
import { LaundryCommercialService } from '../interfaces/service.interface';
import { WeightPricingProfile, WeightPricingQuoteResponse } from '../interfaces/weight-pricing.interface';
import {
  calculateOrderExtraSubtotal,
  calculateOrderItemSubtotal,
  calculateOrderTotals,
  hasPriceOverride,
  OrderTotals
} from '../utils/order-totals.util';
import { roundCurrency, toNumber } from '../utils/decimal.util';

export interface OrderItemFormModel {
  serviceId: FormControl<number | null>;
  serviceType: FormControl<'UNIT' | 'WEIGHT' | null>;
  quantity: FormControl<number>;
  selectedPriceOptionId: FormControl<number | null>;
  suggestedUnitPrice: FormControl<number>;
  recommendedUnitPrice: FormControl<number | null>;
  finalUnitPrice: FormControl<number>;
  weightLb: FormControl<number | null>;
  discountAmount: FormControl<number>;
  notes: FormControl<string>;
  overrideReason: FormControl<string>;
  manualOverride: FormControl<boolean>;
  allowManualOverride: FormControl<boolean>;
  quote: FormControl<WeightPricingQuoteResponse | null>;
  subtotal: FormControl<number>;
}

export interface OrderExtraFormModel {
  extraId: FormControl<number | null>;
  quantity: FormControl<number>;
  suggestedUnitPrice: FormControl<number>;
  finalUnitPrice: FormControl<number>;
  subtotal: FormControl<number>;
  allowManualOverride: FormControl<boolean>;
}

export interface OrderFormModel {
  clientId: FormControl<number | null>;
  clientAddressId: FormControl<number | null>;
  pricingProfileId: FormControl<number | null>;
  deliveryZoneId: FormControl<number | null>;
  cashierUserId: FormControl<number | null>;
  deliverySuggestedAmount: FormControl<number>;
  deliveryFinalAmount: FormControl<number>;
  deliveryOverrideReason: FormControl<string>;
  globalDiscountAmount: FormControl<number>;
  globalDiscountReason: FormControl<string>;
  notes: FormControl<string>;
  status: FormControl<Order['status']>;
  subtotalItems: FormControl<number>;
  subtotalExtras: FormControl<number>;
  totalAmount: FormControl<number>;
  items: FormArray<FormGroup<OrderItemFormModel>>;
  extras: FormArray<FormGroup<OrderExtraFormModel>>;
}

export interface LaundryCommerceReferenceData {
  categories: ServiceCategory[];
  services: LaundryCommercialService[];
  priceOptions: ServicePriceOption[];
  extras: Extra[];
  deliveryZones: DeliveryZone[];
  profiles: WeightPricingProfile[];
  clients: ClientFullResponse[];
  cashiers: User[];
}

@Injectable({
  providedIn: 'root'
})
export class OrderFormFacade {
  private readonly categoryApi = inject(CategoryApiService);
  private readonly serviceApi = inject(ServicesApiService);
  private readonly priceOptionsApi = inject(ServicePriceOptionsApiService);
  private readonly extrasApi = inject(ExtrasApiService);
  private readonly deliveryZonesApi = inject(DeliveryZonesApiService);
  private readonly weightPricingApi = inject(WeightPricingApiService);
  private readonly clientService = inject(ClientService);
  private readonly clientAddressService = inject(ClientAddressService);
  private readonly userService = inject(UserService);
  private readonly ordersApi = inject(OrdersApiService);

  readonly quoteLoadingKeys = signal<Record<string, boolean>>({});

  loadReferenceData(): Observable<LaundryCommerceReferenceData> {
    return forkJoin({
      categories: this.categoryApi.list({ page: 1, per_page: 200 }).pipe(map((response) => response.items)),
      services: this.serviceApi.list({ page: 1, per_page: 300, is_active: true }).pipe(map((response) => response.items)),
      priceOptions: this.priceOptionsApi.list({ page: 1, per_page: 500, is_active: true }).pipe(map((response) => response.items)),
      extras: this.extrasApi.list({ page: 1, per_page: 300, is_active: true }).pipe(map((response) => response.items)),
      deliveryZones: this.deliveryZonesApi.list({ page: 1, per_page: 200, is_active: true }).pipe(map((response) => response.items)),
      profiles: this.weightPricingApi.listProfiles({ page: 1, per_page: 200, is_active: true }).pipe(map((response) => response.items)),
      clients: this.clientService.getClients({ page: 1, per_page: 200 }).pipe(map((response) => response.items)),
      cashiers: this.userService.getUserslite()
    });
  }

  getOrder(id: number): Observable<Order> {
    return this.ordersApi.getById(id);
  }

  getDeliveryFeeSuggestion(params: {
    client_id: number;
    client_address_id?: number | null;
    delivery_zone_id?: number | null;
  }): Observable<DeliveryFeeSuggestion> {
    return this.ordersApi.getDeliveryFeeSuggestion(params);
  }

  getClientAddresses(clientId: number): Observable<ClientAddress[]> {
    return this.clientAddressService.getAddressesByClientId(clientId);
  }

  saveOrder(mode: 'create' | 'edit', payload: OrderPayload, id?: number): Observable<Order> {
    if (mode === 'edit' && id) {
      return this.ordersApi.update(id, payload);
    }

    return this.ordersApi.create(payload);
  }

  createItemGroup(item?: Partial<OrderItem>): FormGroup<OrderItemFormModel> {
    const recommendedUnitPrice = item?.recommended_unit_price !== undefined && item?.recommended_unit_price !== null
      ? roundCurrency(item.recommended_unit_price)
      : null;
    const finalUnitPrice = roundCurrency(item?.final_unit_price ?? item?.suggested_unit_price ?? recommendedUnitPrice ?? 0);

    return new FormGroup<OrderItemFormModel>({
      serviceId: new FormControl(item?.service_id ?? null, {
        nonNullable: false,
        validators: [Validators.required]
      }),
      serviceType: new FormControl(item?.service_type ?? null, {
        nonNullable: false,
        validators: [Validators.required]
      }),
      quantity: new FormControl(item?.quantity ?? 1, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1)]
      }),
      selectedPriceOptionId: new FormControl(item?.selected_price_option_id ?? null),
      suggestedUnitPrice: new FormControl(roundCurrency(item?.suggested_unit_price ?? 0), {
        nonNullable: true
      }),
      recommendedUnitPrice: new FormControl(recommendedUnitPrice),
      finalUnitPrice: new FormControl(finalUnitPrice, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0)]
      }),
      weightLb: new FormControl(item?.weight_lb !== undefined && item?.weight_lb !== null ? roundCurrency(item.weight_lb) : null),
      discountAmount: new FormControl(roundCurrency(item?.discount_amount ?? 0), {
        nonNullable: true,
        validators: [Validators.min(0)]
      }),
      notes: new FormControl(item?.notes ?? '', {
        nonNullable: true
      }),
      overrideReason: new FormControl(item?.override_reason ?? '', {
        nonNullable: true
      }),
      manualOverride: new FormControl(Boolean(item?.manual_override), {
        nonNullable: true
      }),
      allowManualOverride: new FormControl(Boolean(item?.manual_override), {
        nonNullable: true
      }),
      quote: new FormControl(item?.pricing_snapshot ? this.quoteFromSnapshot(item.pricing_snapshot) : null),
      subtotal: new FormControl(roundCurrency(item?.subtotal ?? 0), {
        nonNullable: true
      })
    });
  }

  createExtraGroup(item?: Partial<OrderExtraItem> & { allowManualOverride?: boolean }): FormGroup<OrderExtraFormModel> {
    return new FormGroup<OrderExtraFormModel>({
      extraId: new FormControl(item?.extra_id ?? null, {
        nonNullable: false,
        validators: [Validators.required]
      }),
      quantity: new FormControl(item?.quantity ?? 1, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1)]
      }),
      suggestedUnitPrice: new FormControl(roundCurrency(item?.suggested_unit_price ?? 0), {
        nonNullable: true
      }),
      finalUnitPrice: new FormControl(roundCurrency(item?.final_unit_price ?? item?.suggested_unit_price ?? 0), {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0)]
      }),
      subtotal: new FormControl(roundCurrency(item?.subtotal ?? 0), {
        nonNullable: true
      }),
      allowManualOverride: new FormControl(Boolean(item?.allowManualOverride), {
        nonNullable: true
      })
    });
  }

  createOrderForm(order?: Order): FormGroup<OrderFormModel> {
    return new FormGroup<OrderFormModel>({
      clientId: new FormControl(order?.client_id ?? null, {
        nonNullable: false,
        validators: [Validators.required]
      }),
      clientAddressId: new FormControl(order?.client_address_id ?? null, {
        nonNullable: false,
        validators: [Validators.required]
      }),
      pricingProfileId: new FormControl(order?.pricing_profile_id ?? null, {
        nonNullable: false,
        validators: [Validators.required]
      }),
      deliveryZoneId: new FormControl(order?.delivery_zone_id ?? null),
      cashierUserId: new FormControl(order?.cashier_user_id ?? null),
      deliverySuggestedAmount: new FormControl(roundCurrency(order?.delivery_suggested_amount ?? 0), {
        nonNullable: true,
        validators: [Validators.min(0)]
      }),
      deliveryFinalAmount: new FormControl(roundCurrency(order?.delivery_final_amount ?? 0), {
        nonNullable: true,
        validators: [Validators.min(0)]
      }),
      deliveryOverrideReason: new FormControl(order?.delivery_override_reason ?? '', {
        nonNullable: true
      }),
      globalDiscountAmount: new FormControl(roundCurrency(order?.global_discount_amount ?? 0), {
        nonNullable: true,
        validators: [Validators.min(0)]
      }),
      globalDiscountReason: new FormControl(order?.global_discount_reason ?? '', {
        nonNullable: true
      }),
      notes: new FormControl(order?.notes ?? '', {
        nonNullable: true
      }),
      status: new FormControl(order?.status ?? 'DRAFT', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      subtotalItems: new FormControl(roundCurrency(order?.subtotal_items ?? 0), {
        nonNullable: true
      }),
      subtotalExtras: new FormControl(roundCurrency(order?.subtotal_extras ?? 0), {
        nonNullable: true
      }),
      totalAmount: new FormControl(roundCurrency(order?.total_amount ?? 0), {
        nonNullable: true
      }),
      items: new FormArray<FormGroup<OrderItemFormModel>>(
        order?.items?.length ? order.items.map((item) => this.createItemGroup(item)) : [this.createItemGroup()]
      ),
      extras: new FormArray<FormGroup<OrderExtraFormModel>>(
        order?.extras?.length ? order.extras.map((item) => this.createExtraGroup(item)) : []
      )
    });
  }

  applyServiceSelection(
    group: FormGroup<OrderItemFormModel>,
    service: LaundryCommercialService | undefined,
    priceOptions: ServicePriceOption[]
  ): void {
    if (!service) {
      return;
    }

    const serviceOptions = priceOptions.filter((option) => option.service_id === service.id);
    const defaultOption = serviceOptions.find((option) => option.is_default)
      ?? serviceOptions.find((option) => option.id === service.default_price_option_id)
      ?? serviceOptions[0];

    const suggestedUnitPrice = service.service_type === 'WEIGHT'
      ? 0
      : roundCurrency(defaultOption?.suggested_price ?? 0);

    group.patchValue({
      serviceId: service.id,
      serviceType: service.service_type,
      selectedPriceOptionId: defaultOption?.id ?? null,
      suggestedUnitPrice,
      recommendedUnitPrice: service.service_type === 'WEIGHT' ? null : suggestedUnitPrice,
      finalUnitPrice: service.service_type === 'WEIGHT' ? 0 : suggestedUnitPrice,
      weightLb: service.service_type === 'WEIGHT' ? group.controls.weightLb.value : null,
      manualOverride: false,
      allowManualOverride: service.allow_manual_override,
      overrideReason: '',
      quote: null
    }, { emitEvent: false });

    this.refreshItemValidators(group);
    this.recalculateItemSubtotal(group);
  }

  applyPriceOptionSelection(group: FormGroup<OrderItemFormModel>, option: ServicePriceOption | undefined): void {
    if (!option) {
      return;
    }

    const amount = roundCurrency(option.suggested_price);
    group.patchValue({
      selectedPriceOptionId: option.id,
      suggestedUnitPrice: amount,
      recommendedUnitPrice: amount,
      finalUnitPrice: amount,
      manualOverride: false,
      overrideReason: ''
    }, { emitEvent: false });

    this.refreshItemValidators(group);
    this.recalculateItemSubtotal(group);
  }

  applyExtraSelection(group: FormGroup<OrderExtraFormModel>, extra: Extra | undefined): void {
    if (!extra) {
      return;
    }

    const amount = roundCurrency(extra.suggested_unit_price);
    group.patchValue({
      extraId: extra.id,
      suggestedUnitPrice: amount,
      finalUnitPrice: amount,
      allowManualOverride: extra.allow_manual_price_override
    }, { emitEvent: false });

    this.recalculateExtraSubtotal(group);
  }

  requestQuote(
    key: string,
    payload: { profileId: number; weightLb: number }
  ): Observable<WeightPricingQuoteResponse> {
    this.setQuoteLoading(key, true);

    return this.weightPricingApi.quote({
      profile_id: payload.profileId,
      weight_lb: payload.weightLb
    }).pipe(
      map((response) => {
        this.setQuoteLoading(key, false);
        return response;
      })
    );
  }

  setQuoteError(key: string): void {
    this.setQuoteLoading(key, false);
  }

  applyQuote(group: FormGroup<OrderItemFormModel>, quote: WeightPricingQuoteResponse): void {
    const recommended = roundCurrency(quote.recommended_price);
    const finalPrice = roundCurrency(quote.final_price ?? quote.recommended_price);

    group.patchValue({
      suggestedUnitPrice: recommended,
      recommendedUnitPrice: recommended,
      finalUnitPrice: finalPrice,
      manualOverride: false,
      allowManualOverride: quote.allow_manual_override,
      overrideReason: '',
      quote
    }, { emitEvent: false });

    this.refreshItemValidators(group);
    this.recalculateItemSubtotal(group);
  }

  refreshItemValidators(group: FormGroup<OrderItemFormModel>): void {
    const serviceType = group.controls.serviceType.value;
    const quote = group.controls.quote.value;
    const recommended = group.controls.recommendedUnitPrice.value;
    const finalPrice = group.controls.finalUnitPrice.value;
    const allowManualOverride = serviceType === 'WEIGHT'
      ? Boolean(quote?.allow_manual_override)
      : group.controls.allowManualOverride.value;

    if (serviceType === 'WEIGHT') {
      group.controls.weightLb.setValidators([Validators.required, Validators.min(0.1)]);
      group.controls.selectedPriceOptionId.clearValidators();
    } else {
      group.controls.weightLb.clearValidators();
    }

    if (allowManualOverride && hasPriceOverride(recommended, finalPrice)) {
      group.controls.overrideReason.setValidators([Validators.required, Validators.minLength(3)]);
      group.controls.manualOverride.setValue(true, { emitEvent: false });
    } else {
      group.controls.overrideReason.clearValidators();
      if (!hasPriceOverride(recommended, finalPrice)) {
        group.controls.manualOverride.setValue(false, { emitEvent: false });
      }
    }

    group.controls.weightLb.updateValueAndValidity({ emitEvent: false });
    group.controls.overrideReason.updateValueAndValidity({ emitEvent: false });
  }

  refreshOrderValidators(form: FormGroup<OrderFormModel>): void {
    const deliveryChanged = Math.abs(form.controls.deliveryFinalAmount.value - form.controls.deliverySuggestedAmount.value) >= 0.01;
    const hasGlobalDiscount = form.controls.globalDiscountAmount.value > 0;

    if (deliveryChanged) {
      form.controls.deliveryOverrideReason.setValidators([Validators.required, Validators.minLength(3)]);
    } else {
      form.controls.deliveryOverrideReason.clearValidators();
    }

    if (hasGlobalDiscount) {
      form.controls.globalDiscountReason.setValidators([Validators.required, Validators.minLength(3)]);
    } else {
      form.controls.globalDiscountReason.clearValidators();
    }

    form.controls.deliveryOverrideReason.updateValueAndValidity({ emitEvent: false });
    form.controls.globalDiscountReason.updateValueAndValidity({ emitEvent: false });
  }

  recalculateItemSubtotal(group: FormGroup<OrderItemFormModel>): void {
    const subtotal = calculateOrderItemSubtotal({
      quantity: group.controls.quantity.value,
      final_unit_price: group.controls.finalUnitPrice.value,
      discount_amount: group.controls.discountAmount.value
    });

    group.controls.subtotal.setValue(subtotal, { emitEvent: false });
    this.refreshItemValidators(group);
  }

  recalculateExtraSubtotal(group: FormGroup<OrderExtraFormModel>): void {
    const subtotal = calculateOrderExtraSubtotal({
      quantity: group.controls.quantity.value,
      final_unit_price: group.controls.finalUnitPrice.value
    });

    group.controls.subtotal.setValue(subtotal, { emitEvent: false });
  }

  recalculateOrder(form: FormGroup<OrderFormModel>): OrderTotals {
    form.controls.items.controls.forEach((group) => this.recalculateItemSubtotal(group));
    form.controls.extras.controls.forEach((group) => this.recalculateExtraSubtotal(group));

    const totals = calculateOrderTotals({
      items: form.controls.items.getRawValue().map((item) => ({ subtotal: item.subtotal })),
      extras: form.controls.extras.getRawValue().map((item) => ({ subtotal: item.subtotal })),
      delivery_final_amount: form.controls.deliveryFinalAmount.value,
      global_discount_amount: form.controls.globalDiscountAmount.value
    });

    form.patchValue({
      subtotalItems: totals.subtotalItems,
      subtotalExtras: totals.subtotalExtras,
      totalAmount: totals.totalFinal
    }, { emitEvent: false });

    this.refreshOrderValidators(form);
    return totals;
  }

  buildPayload(form: FormGroup<OrderFormModel>): OrderPayload {
    const raw = form.getRawValue();

    return {
      client_id: raw.clientId,
      client_address_id: raw.clientAddressId,
      pricing_profile_id: raw.pricingProfileId,
      delivery_zone_id: raw.deliveryZoneId,
      cashier_user_id: raw.cashierUserId,
      charged_by_user_id: raw.cashierUserId,
      notes: raw.notes,
      global_discount_amount: raw.globalDiscountAmount,
      global_discount_reason: raw.globalDiscountReason || null,
      delivery_suggested_amount: raw.deliverySuggestedAmount,
      delivery_final_amount: raw.deliveryFinalAmount,
      delivery_override_reason: raw.deliveryOverrideReason || null,
      delivery_fee_suggested: raw.deliverySuggestedAmount,
      delivery_fee_final: raw.deliveryFinalAmount,
      delivery_fee_override_reason: raw.deliveryOverrideReason || null,
      status: raw.status,
      items: raw.items.map((item) => ({
        service_id: item.serviceId!,
        service_type: item.serviceType!,
        quantity: item.quantity,
        selected_price_option_id: item.selectedPriceOptionId,
        suggested_price_option_id: item.selectedPriceOptionId,
        suggested_unit_price: item.suggestedUnitPrice,
        recommended_unit_price: item.recommendedUnitPrice,
        final_unit_price: item.finalUnitPrice,
        weight_lb: item.weightLb,
        discount_amount: item.discountAmount,
        notes: item.notes || null,
        manual_override: item.manualOverride,
        override_reason: item.overrideReason || null,
        manual_price_override_reason: item.overrideReason || null,
        subtotal: item.subtotal,
        pricing_snapshot: item.quote ? {
          profile_id: item.quote.profile_id ?? null,
          profile_name: item.quote.profile_name ?? null,
          strategy_applied: item.quote.strategy_applied,
          recommended_price: item.quote.recommended_price,
          final_price: item.finalUnitPrice,
          min_valid_price: item.quote.min_valid_price,
          max_valid_price: item.quote.max_valid_price,
          business_reason: item.quote.business_reason ?? null,
          allow_manual_override: item.quote.allow_manual_override,
          evaluated_options: item.quote.evaluated_options
        } : null
      })),
      extras: raw.extras.map((item) => ({
        extra_id: item.extraId!,
        quantity: item.quantity,
        suggested_unit_price: item.suggestedUnitPrice,
        final_unit_price: item.finalUnitPrice,
        discount_amount: 0,
        subtotal: item.subtotal
      }))
    };
  }

  hydrateOrderForm(form: FormGroup<OrderFormModel>, order: Order): void {
    form.patchValue({
      clientId: order.client_id ?? null,
      clientAddressId: order.client_address_id ?? null,
      pricingProfileId: order.pricing_profile_id ?? null,
      deliveryZoneId: order.delivery_zone_id ?? null,
      cashierUserId: order.cashier_user_id ?? null,
      deliverySuggestedAmount: roundCurrency(order.delivery_suggested_amount ?? 0),
      deliveryFinalAmount: roundCurrency(order.delivery_final_amount ?? 0),
      deliveryOverrideReason: order.delivery_override_reason ?? '',
      globalDiscountAmount: roundCurrency(order.global_discount_amount ?? 0),
      globalDiscountReason: order.global_discount_reason ?? '',
      notes: order.notes ?? '',
      status: order.status
    }, { emitEvent: false });

    form.controls.items.clear();
    form.controls.extras.clear();

    order.items.forEach((item) => form.controls.items.push(this.createItemGroup(item)));
    order.extras.forEach((item) => form.controls.extras.push(this.createExtraGroup(item)));

    this.recalculateOrder(form);
  }

  matchDeliverySuggestedAmount(zoneId: number | null, deliveryZones: DeliveryZone[]): number {
    const zone = deliveryZones.find((item) => item.id === zoneId);
    const price = zone?.prices?.find((item) => item.is_default) ?? zone?.prices?.[0];
    return roundCurrency(price?.price ?? 0);
  }

  private quoteFromSnapshot(snapshot: OrderItem['pricing_snapshot']): WeightPricingQuoteResponse {
    return {
      service_id: 0,
      weight_lb: 0,
      profile_id: snapshot?.profile_id ?? null,
      profile_name: snapshot?.profile_name ?? null,
      strategy_applied: snapshot?.strategy_applied ?? 'MAX_REVENUE',
      recommended_price: snapshot?.recommended_price ?? 0,
      final_price: snapshot?.final_price ?? 0,
      min_valid_price: snapshot?.min_valid_price ?? 0,
      max_valid_price: snapshot?.max_valid_price ?? 0,
      business_reason: snapshot?.business_reason ?? null,
      allow_manual_override: Boolean(snapshot?.allow_manual_override),
      evaluated_options: snapshot?.evaluated_options ?? []
    };
  }

  private setQuoteLoading(key: string, isLoading: boolean): void {
    this.quoteLoadingKeys.update((state) => ({
      ...state,
      [key]: isLoading
    }));
  }
}
