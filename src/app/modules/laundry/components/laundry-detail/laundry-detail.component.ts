import { Component, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription, catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, of, switchMap } from 'rxjs';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { LaundryServiceExtraType, LaundryServiceLog, LaundryServiceResp, LaundryServiceStatus, LaundryUnitType } from '@shared/interfaces/laundry-service.interface';
import { LaundryGarmentType } from '@shared/interfaces/laundry-garment-type.interface';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { formatDate } from '@angular/common';
import { ClientDetailComponent } from "@modules/client/components/client-detail/client-detail.component";
import { ClientFullResponse } from '@shared/interfaces/client.interface';
import { LaundryStatusColorMap } from '@shared/utils/color.util';
import { BackButtonComponent } from "@shared/components/back/back-button.component";
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { AccordionModule } from 'primeng/accordion';
import { ConfirmationService, MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { LaundryNoteListComponent } from '../laundry-note-list/laundry-note-list.component';
import { LaundryNoteComponent } from '../laundry-note/laundry-note.component';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { ToBackLaundry } from '@modules/laundry/commons/route';
import { NavigationHistoryService } from '@shared/services/navigation/navigation-history.service';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { LaundryGarmentTypesService } from '@shared/services/laundry/laundry-garment-types.service';
import { LaundryServiceExtraTypesService } from '@shared/services/laundry/laundry-service-extra-types.service';
import { GlobalSettingsApiService } from '@modules/laundry-commerce/services/global-settings-api.service';
import { WeightPricingApiService } from '@modules/laundry-commerce/services/weight-pricing-api.service';
import {
  LaundryServiceCommercialDraftRecord,
  LaundryServiceCommercialDraftsApiService,
  LaundryServiceCommercialOrderRecord
} from '@modules/laundry-commerce/services/laundry-service-commercial-drafts-api.service';
import { WeightPricingProfile, WeightPricingQuoteResponse } from '@modules/laundry-commerce/interfaces/weight-pricing.interface';
import { PaymentType } from '@shared/interfaces/transaction.interface';
import { PaymentTypeService } from '@shared/services/transaction/payment-type.service';

type DetailUiCaptureGarmentItem = {
  garment_type_id: number;
  quantity: number;
  unit_type: LaundryUnitType;
  unit_price: number | null;
  notes: string | null;
  garment_name?: string | null;
};

type DetailUiCaptureExtraItem = {
  service_extra_type_id: number;
  quantity: number;
  unit_price: number | null;
  notes: string | null;
  name?: string | null;
};

type DetailUiCaptureCommercialItem = {
  service_id: number;
  service_name: string | null;
  category_name: string | null;
  quantity: number;
  selected_price_option_id: number | null;
  manual_price: number | null;
  discount_type?: 'PERCENT' | 'TARGET_FINAL_PRICE' | null;
  discount_value?: number | null;
  discount_amount?: number | null;
  base_unit_price?: number | null;
  final_unit_price?: number | null;
  manual_price_override_reason?: string | null;
  discount_reason?: string | null;
  notes: string | null;
};

type DetailUiCaptureModel = {
  id?: number | null;
  client_id: number | null;
  client_address_id: number | null;
  scheduled_pickup_at: string | null;
  status: LaundryServiceResp['status'] | null;
  service_label: LaundryServiceResp['service_label'] | null;
  transaction_id: number | null;
  payment_type_id: number | null;
  pricing_profile_id: number | null;
  delivery_zone_id: number | null;
  weight_lb: number | null;
  distance_km: number | null;
  delivery_price_per_km: number | null;
  express_service_surcharge: number | null;
  quoted_service_amount: number | null;
  weight_discount_type?: 'PERCENT' | 'TARGET_FINAL_PRICE' | null;
  weight_discount_value?: number | null;
  weight_discount_amount?: number | null;
  weight_final_price_after_discount?: number | null;
  weight_discount_reason?: string | null;
  delivery_fee_suggested: number | null;
  delivery_fee_final: number | null;
  delivery_fee_override_reason: string | null;
  global_discount_type?: 'PERCENT' | 'TARGET_FINAL_TOTAL' | null;
  global_discount_value?: number | null;
  global_discount_amount: number;
  global_discount_reason: string | null;
  gross_total_before_global_discount?: number | null;
  net_total_after_global_discount?: number | null;
  notes: string | null;
  items: DetailUiCaptureGarmentItem[];
  extras: DetailUiCaptureExtraItem[];
  weight_pricing_preview: WeightPricingQuoteResponse | null;
  commercial_capture_pending: DetailUiCaptureCommercialItem[];
};

function asNullableNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveOrderTotal(order: LaundryServiceCommercialOrderRecord | null | undefined): number | null {
  if (!order) {
    return null;
  }

  const candidates = [
    order['grand_total'],
    order['final_amount'],
    order['total_amount'],
    order['total']
  ];

  for (const candidate of candidates) {
    const parsed = asNullableNumber(candidate);
    if (parsed != null) {
      return parsed;
    }
  }

  return null;
}

type DiscountComputation = {
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
};

type DiscountType = 'PERCENT' | 'TARGET_FINAL_PRICE';
type GlobalDiscountType = 'PERCENT' | 'TARGET_FINAL_TOTAL';

@Component({
  selector: 'app-laundry-detail',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    TagModule,
    ButtonModule,
    ClientDetailComponent,
    AccordionModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    LaundryNoteListComponent,
    LaundryNoteComponent,
    LoaderDialogComponent,
    DividerModule,
    InputNumberModule,
    InputTextModule,
    ToggleSwitchModule,
    SelectModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './laundry-detail.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LaundryDetailComponent implements OnInit, OnDestroy {
  @ViewChild(LoaderDialogComponent) loaderDialog?: LoaderDialogComponent;

  @Input() status!:LaundryServiceStatus;
  
  data?: LaundryServiceResp;
  draft?: LaundryServiceCommercialDraftRecord | null;
  confirmedOrder: LaundryServiceCommercialOrderRecord | null = null;
  uiModel: DetailUiCaptureModel | null = null;
  garmentTypes: LaundryGarmentType[] = [];
  extraTypes: LaundryServiceExtraType[] = [];
  pricingProfiles: WeightPricingProfile[] = [];
  paymentTypes: PaymentType[] = [];
  
  loading = true;
  savingDraft = false;
  deliveryPricePerKm = 0;
  deliveryPricePerKmError: string | null = null;
  draftSaveMessage: string | null = null;
  draftSaveError: string | null = null;
  draftConfirmMessage: string | null = null;
  draftConfirmError: string | null = null;
  draftStatusMessage: string | null = null;
  copySummaryMessage: string | null = null;
  deliveryManualMode = false;
  confirmingDraft = false;
  statusColorMap = LaundryStatusColorMap;
  addressDialogVisible: boolean = false;
  discountDialogVisible = false;
  notesDialogVisible = false;
  latestNote: LaundryServiceLog | null = null;
  deliveryForm: FormGroup;
  private deliverySubscription?: Subscription;
  private weightQuoteLoaderTimeoutId: number | null = null;
  private weightQuoteLoaderRequestId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private laundryService: LaundryService,
    private garmentTypesService: LaundryGarmentTypesService,
    private extraTypesService: LaundryServiceExtraTypesService,
    private paymentTypeService: PaymentTypeService,
    private globalSettingsApi: GlobalSettingsApiService,
    private weightPricingApi: WeightPricingApiService,
    private commercialDraftsApi: LaundryServiceCommercialDraftsApiService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private navigationHistoryService: NavigationHistoryService
  ) {
    this.deliveryForm = this.fb.group({
      is_express: [false],
      pricing_profile_id: [null as number | null],
      payment_type_id: [null as number | null],
      global_discount_type: [null as GlobalDiscountType | null],
      global_discount_value: [null as number | null],
      global_discount_reason: [''],
      weight_discount_type: [null as DiscountType | null],
      weight_discount_value: [null as number | null],
      weight_discount_reason: [''],
      distance_km: [null as number | null],
      delivery_fee_final: [0],
      delivery_fee_override_reason: ['']
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;

    forkJoin({
      service: this.laundryService.getById(id),
      garmentTypes: this.garmentTypesService.getAll().pipe(catchError(() => of([]))),
      extraTypes: this.extraTypesService.getAll().pipe(catchError(() => of([]))),
      paymentTypes: this.paymentTypeService.getPaymentTypes().pipe(catchError(() => of([]))),
      pricingProfiles: this.weightPricingApi.listProfiles({ page: 1, per_page: 200, is_active: true }).pipe(
        catchError(() => of({ items: [], total: 0, page: 1, per_page: 200, pages: 0 }))
      )
    }).subscribe({
      next: ({ service, garmentTypes, extraTypes, paymentTypes, pricingProfiles }) => {
        this.data = service;
        this.garmentTypes = garmentTypes.filter((item) => item.active !== false);
        this.extraTypes = extraTypes.filter((item) => item.active !== false);
        this.paymentTypes = paymentTypes;
        this.pricingProfiles = pricingProfiles.items.filter((item) => item.is_active !== false);
        this.uiModel = this.buildBaseUiModel(service);
        this.bindDeliveryTracking();
        this.loadDeliveryPricePerKm();
        this.loadExpressServiceSurcharge();
        this.loadDraftByService(service.id);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/laundry']);
      }
    });
  }

  ngOnDestroy(): void {
    this.deliverySubscription?.unsubscribe();
    this.clearWeightQuoteLoaderTimeout();
  }

  formatDateTime(datetime: string): string {
    return formatDate(datetime, 'medium', 'en-US');
  }

  getFullClient(client: any, address: any): ClientFullResponse {
    return {
      id: client.id,
      addresses: [address],
      phones: client.phones,
      email: '',
      created_at: '',
      created_by: '',
      document_id: '',
      name: client.name,
      updated_at: '',
      is_deleted: false,
      updated_by: ''
    }
  }

  get itemCount(): number {
    return this.data?.items?.reduce((total, item) => total + (item.quantity ?? 0), 0) ?? 0;
  }

  get extraCount(): number {
    return this.data?.extras?.reduce((total, extra) => total + (extra.quantity ?? 0), 0) ?? 0;
  }

  getCapturedGarmentCount(): number {
    return this.uiModel?.items?.reduce((total, item) => total + this.toNumber(item.quantity), 0) ?? this.itemCount;
  }

  getCapturedExtraCount(): number {
    return this.uiModel?.extras?.reduce((total, extra) => total + this.toNumber(extra.quantity), 0) ?? this.extraCount;
  }

  get transactionDetail(): {
    amount?: number;
    payment_type_name?: string;
    detail?: string;
    user_name?: string;
  } | null {
    return (this.data?.transaction as {
      amount?: number;
      payment_type_name?: string;
      detail?: string;
      user_name?: string;
    } | null) ?? null;
  }

  getCapturedWeightLb(): number {
    return this.toNumber(this.uiModel?.weight_lb ?? this.data?.weight_lb);
  }

  isCommercialDraftConfirmed(): boolean {
    return Boolean(this.draft?.is_confirmed);
  }

  getCommercialStatusLabel(): string {
    return this.isCommercialDraftConfirmed() ? 'Confirmado' : 'En edicion';
  }

  getCurrentServiceLabel(): LaundryServiceResp['service_label'] {
    return this.uiModel?.service_label ?? this.data?.service_label ?? 'NORMAL';
  }

  getDeliveryFeeFinal(): number {
    return this.toNumber(this.deliveryForm.get('delivery_fee_final')?.value);
  }

  getDistanceKm(): number {
    return this.toNumber(this.deliveryForm.get('distance_km')?.value);
  }

  hasWeightQuote(): boolean {
    return this.getWeightQuotePrice() > 0;
  }

  getWeightQuotePrice(): number {
    const discountedAmount = this.toNullableNumber(this.uiModel?.weight_final_price_after_discount);
    if (discountedAmount != null && discountedAmount >= 0) {
      return discountedAmount;
    }

    return this.getQuotedServiceAmount();
  }

  getBaseWeightQuotePrice(): number {
    return this.toNumber(
      this.uiModel?.weight_pricing_preview?.final_price
      ?? this.uiModel?.quoted_service_amount
      ?? this.draft?.quoted_service_amount
      ?? this.uiModel?.weight_pricing_preview?.recommended_price
    );
  }

  getExpressSurchargeAmount(): number {
    return this.uiModel?.service_label === 'EXPRESS'
      ? this.toNumber(this.uiModel?.express_service_surcharge)
      : 0;
  }

  getQuotedServiceAmount(): number {
    const explicitQuotedAmount = this.toNumber(this.uiModel?.quoted_service_amount);
    if (explicitQuotedAmount > 0) {
      return explicitQuotedAmount;
    }

    return this.roundCurrency(this.getBaseWeightQuotePrice() + this.getExpressSurchargeAmount());
  }

  hasWeightDiscount(): boolean {
    return this.toNumber(this.uiModel?.weight_discount_amount) > 0;
  }

  getWeightDiscountAmount(): number {
    return this.toNumber(this.uiModel?.weight_discount_amount);
  }

  getWeightDiscountLabel(): string {
    const type = this.deliveryForm.get('weight_discount_type')?.value as DiscountType | null;
    const value = this.toNullableNumber(this.deliveryForm.get('weight_discount_value')?.value);

    if (!type || value == null) {
      return 'Sin descuento';
    }

    return type === 'PERCENT'
      ? `${this.roundCurrency(value)}%`
      : this.formatCurrency(value);
  }

  getGarmentQuantityCount(): number {
    return (this.uiModel?.items ?? []).reduce((total, item) => total + this.toNumber(item.quantity), 0);
  }

  getExtrasSubtotal(): number {
    return (this.uiModel?.extras ?? []).reduce(
      (total, item) => total + (this.toNumber(item.quantity) * this.toNumber(item.unit_price)),
      0
    );
  }

  getSpecialItemsDraftTotal(): number {
    return (this.uiModel?.commercial_capture_pending ?? []).reduce(
      (total, item) => total + (this.toNumber(item.quantity) * this.toNumber(item.manual_price)),
      0
    );
  }

  getGrandDraftTotal(): number {
    const confirmedOrderTotal = resolveOrderTotal(this.confirmedOrder);
    if (this.isCommercialDraftConfirmed() && confirmedOrderTotal != null) {
      return confirmedOrderTotal;
    }

    const netTotal = this.toNullableNumber(this.uiModel?.net_total_after_global_discount);
    if (netTotal != null) {
      return netTotal;
    }

    return this.getGrossDraftTotal();
  }

  getGrossDraftTotal(): number {
    return this.roundCurrency(
      this.getServicesSubtotal()
      + this.getExtrasSubtotal()
      + this.getDeliveryFeeFinal()
      + this.getExpressSurchargeAmount()
    );
  }

  getServicesSubtotal(): number {
    return this.roundCurrency(this.getWeightCommercialSubtotal() + this.getSpecialItemsDraftTotal());
  }

  getWeightCommercialSubtotal(): number {
    return this.roundCurrency(this.getBaseWeightCommercialAmount() + this.getWeightCommercialSurchargeAmount());
  }

  getBaseWeightCommercialAmount(): number {
    return this.getWeightQuotePrice();
  }

  getWeightCommercialSurchargeAmount(): number {
    const quotedServiceAmount = this.getQuotedServiceAmount();
    const weightPrice = this.getWeightQuotePrice();
    const expressSurcharge = this.getExpressSurchargeAmount();

    if (quotedServiceAmount > weightPrice && expressSurcharge > 0) {
      return 0;
    }

    return expressSurcharge;
  }

  hasGlobalDiscount(): boolean {
    return this.toNumber(this.uiModel?.global_discount_amount) > 0;
  }

  getGlobalDiscountAmount(): number {
    return this.toNumber(this.uiModel?.global_discount_amount);
  }

  getGlobalDiscountLabel(): string {
    const type = this.deliveryForm.get('global_discount_type')?.value as GlobalDiscountType | null;
    const value = this.toNullableNumber(this.deliveryForm.get('global_discount_value')?.value);

    if (!type || value == null) {
      return 'Sin descuento global';
    }

    return type === 'PERCENT'
      ? `${this.roundCurrency(value)}%`
      : this.formatCurrency(value);
  }

  getCommercialPaymentTypeName(): string {
    return this.confirmedOrder?.payment_type_name
      ?? this.paymentTypes.find((item) => item.id === this.toNullableNumber(this.deliveryForm.get('payment_type_id')?.value))?.name
      ?? this.transactionDetail?.payment_type_name
      ?? 'Sin definir';
  }

  get pricingProfileOptions(): Array<{ label: string; value: number }> {
    return this.pricingProfiles.map((profile) => ({
      label: profile.name,
      value: profile.id
    }));
  }

  get paymentTypeOptions(): Array<{ label: string; value: number }> {
    return this.paymentTypes.map((paymentType) => ({
      label: paymentType.name,
      value: paymentType.id
    }));
  }

  get discountTypeOptions(): Array<{ label: string; value: DiscountType }> {
    return [
      { label: 'Por porcentaje', value: 'PERCENT' },
      { label: 'Por precio final', value: 'TARGET_FINAL_PRICE' }
    ];
  }

  get globalDiscountTypeOptions(): Array<{ label: string; value: GlobalDiscountType }> {
    return [
      { label: 'Por porcentaje', value: 'PERCENT' },
      { label: 'Por precio final', value: 'TARGET_FINAL_TOTAL' }
    ];
  }

  canConfirmCommercialDraft(): boolean {
    return !this.loading
      && !this.savingDraft
      && !this.confirmingDraft
      && !this.isCommercialDraftConfirmed()
      && Boolean(this.data?.id)
      && Boolean(this.deliveryForm.get('payment_type_id')?.value)
      && Boolean(this.resolvePricingProfileId())
      && this.getGrossDraftTotal() > 0;
  }

  getSelectedGarments(): Array<{ name: string; quantity: number; unitLabel: string }> {
    return (this.uiModel?.items ?? [])
      .filter((item) => this.toNumber(item.quantity) > 0)
      .map((item) => ({
        name: this.resolveGarmentName(item),
        quantity: this.toNumber(item.quantity),
        unitLabel: item.unit_type === 'PAIR' ? 'pares' : 'unidades'
      }));
  }

  getSelectedExtras(): Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }> {
    return (this.uiModel?.extras ?? [])
      .filter((item) => this.toNumber(item.quantity) > 0)
      .map((item) => ({
        name: this.resolveExtraName(item),
        quantity: this.toNumber(item.quantity),
        unitPrice: this.toNumber(item.unit_price),
        subtotal: this.toNumber(item.quantity) * this.toNumber(item.unit_price)
      }));
  }

  getSelectedSpecialItems(): Array<{ name: string; quantity: number; unitPrice: number; subtotal: number; categoryName: string | null }> {
    return (this.uiModel?.commercial_capture_pending ?? [])
      .filter((item) => this.toNumber(item.quantity) > 0)
      .map((item) => ({
        name: item.service_name || `Servicio #${item.service_id}`,
        quantity: this.toNumber(item.quantity),
        unitPrice: this.getSpecialItemFinalUnitPrice(item),
        subtotal: this.toNumber(item.quantity) * this.getSpecialItemFinalUnitPrice(item),
        categoryName: item.category_name
      }));
  }

  getSpecialItemBaseUnitPrice(item: DetailUiCaptureCommercialItem): number {
    const explicitBase = this.toNullableNumber(item.base_unit_price);
    if (explicitBase != null) {
      return explicitBase;
    }

    const manualPrice = this.toNullableNumber(item.manual_price);
    if (manualPrice != null) {
      return manualPrice;
    }

    return 0;
  }

  getSpecialItemFinalUnitPrice(item: DetailUiCaptureCommercialItem): number {
    const finalUnitPrice = this.toNullableNumber(item.final_unit_price);
    if (finalUnitPrice != null) {
      return finalUnitPrice;
    }

    return this.toNumber(item.manual_price);
  }

  hasSpecialItemDiscount(item: DetailUiCaptureCommercialItem): boolean {
    return this.toNumber(item.discount_amount) > 0;
  }

  getSpecialItemDiscountLabel(item: DetailUiCaptureCommercialItem): string {
    const type = item.discount_type;
    const value = this.toNullableNumber(item.discount_value);

    if (!type || value == null) {
      return 'Sin descuento';
    }

    return type === 'PERCENT'
      ? `${this.roundCurrency(value)}%`
      : this.formatCurrency(value);
  }

  onWeightDiscountTypeChange(value: DiscountType | null): void {
    this.updateWeightDiscount({
      weight_discount_type: value,
      weight_discount_value: null
    });
    this.deliveryForm.patchValue({ weight_discount_value: null }, { emitEvent: false });
  }

  onWeightDiscountValueInput(value: unknown): void {
    this.updateWeightDiscount({
      weight_discount_value: this.toNullableNumber(value)
    });
  }

  onWeightDiscountReasonInput(value: string): void {
    this.updateWeightDiscount({
      weight_discount_reason: this.toNullableText(value)
    });
  }

  onGlobalDiscountTypeChange(value: GlobalDiscountType | null): void {
    this.updateGlobalDiscount({
      global_discount_type: value,
      global_discount_value: null
    });
    this.deliveryForm.patchValue({ global_discount_value: null }, { emitEvent: false });
  }

  onGlobalDiscountValueInput(value: unknown): void {
    this.updateGlobalDiscount({
      global_discount_value: this.toNullableNumber(value)
    });
  }

  onGlobalDiscountReasonInput(value: string): void {
    this.updateGlobalDiscount({
      global_discount_reason: this.toNullableText(value)
    });
  }

  resetDiscounts(): void {
    this.deliveryForm.patchValue({
      global_discount_type: null,
      global_discount_value: null,
      global_discount_reason: ''
    }, { emitEvent: false });

    if (this.uiModel) {
      this.uiModel = this.applyGlobalDiscountSnapshot({
        ...this.uiModel,
        global_discount_type: null,
        global_discount_value: null,
        global_discount_amount: 0,
        global_discount_reason: null,
        gross_total_before_global_discount: this.uiModel.gross_total_before_global_discount ?? null,
        net_total_after_global_discount: this.uiModel.gross_total_before_global_discount ?? this.getGrossDraftTotal(),
        commercial_capture_pending: this.uiModel.commercial_capture_pending.map((item) => ({
          ...item,
          discount_type: null,
          discount_value: null,
          discount_amount: null,
          final_unit_price: item.base_unit_price ?? item.manual_price,
          manual_price: item.base_unit_price ?? item.manual_price,
          manual_price_override_reason: null,
          discount_reason: null
        }))
      });
    }
  }

  onSpecialItemDiscountTypeChange(item: DetailUiCaptureCommercialItem, value: DiscountType | null): void {
    this.updateSpecialItem(item.service_id, {
      discount_type: value,
      discount_value: null
    });
  }

  onSpecialItemDiscountValueInput(item: DetailUiCaptureCommercialItem, value: unknown): void {
    this.updateSpecialItem(item.service_id, {
      discount_value: this.toNullableNumber(value)
    });
  }

  onSpecialItemDiscountReasonInput(item: DetailUiCaptureCommercialItem, value: string): void {
    this.updateSpecialItem(item.service_id, {
      discount_reason: this.toNullableText(value)
    });
  }

  onDeliveryFeeFinalInput(value: unknown): void {
    const amount = this.toNullableNumber(value);

    if (!amount || amount <= 0) {
      this.deliveryManualMode = false;
      this.deliveryForm.get('distance_km')?.enable({ emitEvent: false });

      const distanceKm = this.getDistanceKm();
      if (distanceKm > 0 && this.deliveryPricePerKm > 0) {
        this.deliveryForm.patchValue({
          delivery_fee_final: this.roundCurrency(distanceKm * this.deliveryPricePerKm),
          delivery_fee_override_reason: 'Calculado por distancia'
        }, { emitEvent: false });
      } else {
        this.deliveryForm.patchValue({
          delivery_fee_final: 0,
          delivery_fee_override_reason: ''
        }, { emitEvent: false });
      }

      this.updateGlobalDiscount();
      return;
    }

    this.deliveryManualMode = true;
    this.deliveryForm.get('distance_km')?.disable({ emitEvent: false });
    this.deliveryForm.patchValue({
      delivery_fee_override_reason: 'Precio manual de delivery'
    }, { emitEvent: false });
    this.updateGlobalDiscount();
  }

  onExpressToggleChange(checked: boolean): void {
    if (!this.uiModel) {
      return;
    }

    const serviceLabel = checked ? 'EXPRESS' : 'NORMAL';
    const quotedServiceAmount = checked
      ? this.roundCurrency(this.getBaseWeightQuotePrice() + this.toNumber(this.uiModel.express_service_surcharge))
      : this.getBaseWeightQuotePrice();

    this.uiModel = {
      ...this.uiModel,
      service_label: serviceLabel,
      quoted_service_amount: quotedServiceAmount || null
    };

    this.updateWeightDiscount();
    this.recalculateWeightPricingIfNeeded();
    this.updateGlobalDiscount();
  }

  async copyWhatsappSummary(): Promise<void> {
    const text = this.buildWhatsappSummary();
    if (!text) {
      this.copySummaryMessage = 'No hay detalle suficiente para copiar.';
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.copySummaryMessage = 'Resumen copiado para WhatsApp.';
    } catch {
      this.copySummaryMessage = 'No fue posible copiar el resumen.';
    }
  }

  saveDeliveryDraft(): void {
    if (!this.data?.id || !this.uiModel) {
      this.draftSaveError = 'No existe un servicio valido para guardar delivery.';
      return;
    }

    if (this.isCommercialDraftConfirmed()) {
      this.draftSaveError = 'La propuesta comercial ya fue confirmada. La orden confirmada es la fuente principal para montos y pago.';
      return;
    }

    this.savingDraft = true;
    this.loaderDialog?.open('Guardando datos');
    this.draftSaveError = null;
    this.draftSaveMessage = null;
    this.draftConfirmError = null;

    const nextUiModel = this.buildCurrentUiModel();
    const payload = this.draft?.payload && typeof this.draft.payload === 'object'
      ? { ...this.draft.payload, ui_model: nextUiModel }
      : {
          ui_model: nextUiModel,
          laundry_service_payload: null,
          order_payload: null,
          validations: {
            laundry_service: [],
            order: []
          }
        };

    this.commercialDraftsApi.saveByService(this.data.id, {
      payload,
      is_confirmed: this.draft?.is_confirmed ?? false,
      confirmed_at: this.draft?.confirmed_at ?? null,
      charged_by_user_id: this.draft?.charged_by_user_id ?? null
    }).pipe(
      finalize(() => {
        this.savingDraft = false;
        this.loaderDialog?.close();
      }),
      catchError(() => {
        this.draftSaveError = 'No fue posible guardar los datos de delivery.';
        return of(null);
      })
    ).subscribe((draft) => {
      if (!draft) {
        return;
      }

      this.draft = draft;
      this.confirmedOrder = draft.order ?? this.confirmedOrder;
      this.uiModel = nextUiModel;
      this.draftSaveMessage = `Delivery guardado en borrador #${draft.id}`;
    });
  }

  confirmCommercialDraft(): void {
    if (!this.data?.id || !this.uiModel) {
      this.draftConfirmError = 'No existe un servicio valido para confirmar.';
      return;
    }

    if (!this.canConfirmCommercialDraft()) {
      this.draftConfirmError = 'Completa perfil de precio, forma de pago y monto comercial antes de confirmar.';
      return;
    }

    const nextUiModel = this.buildCurrentUiModel();
    const payload = this.draft?.payload && typeof this.draft.payload === 'object'
      ? { ...this.draft.payload, ui_model: nextUiModel }
      : {
          ui_model: nextUiModel,
          laundry_service_payload: null,
          order_payload: null,
          validations: {
            laundry_service: [],
            order: []
          }
        };

    this.confirmingDraft = true;
    this.loaderDialog?.open('Confirmando propuesta comercial');
    this.draftConfirmError = null;
    this.draftConfirmMessage = null;
    this.draftSaveError = null;

    this.commercialDraftsApi.saveByService(this.data.id, {
      payload,
      is_confirmed: this.draft?.is_confirmed ?? false,
      confirmed_at: this.draft?.confirmed_at ?? null,
      charged_by_user_id: this.draft?.charged_by_user_id ?? null
    }).pipe(
      switchMap((draft) => {
        this.draft = draft;
        this.uiModel = nextUiModel;
        return this.commercialDraftsApi.confirmByService(this.data!.id);
      }),
      finalize(() => {
        this.confirmingDraft = false;
        this.loaderDialog?.close();
      }),
      catchError(() => {
        this.draftConfirmError = 'No fue posible confirmar la propuesta comercial.';
        return of(null);
      })
    ).subscribe((response) => {
      if (!response) {
        return;
      }

      this.draft = response.draft;
      this.confirmedOrder = response.order ?? response.draft.order ?? null;
      this.draftConfirmMessage = response.order?.id
        ? `Propuesta confirmada. Orden #${response.order.id} creada.`
        : 'Propuesta confirmada correctamente.';
      this.draftStatusMessage = `Borrador cargado #${response.draft.id}`;
    });
  }


  confirm(event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Estas seguro de completar el pedido?',
      header: 'Confirmación',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Guardar',
      },
      accept: () => {
        this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'You have accepted' });
        this.changeStatus();
      },
      reject: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Rejected',
          detail: 'You have rejected',
          life: 3000,
        });
      },
    });
  }


  nextStatus:LaundryServiceStatus | null = null;

  getNextStatus():void {
    switch(this.status){
      case 'PENDING':
        this.nextStatus = 'STARTED';
        break;
      case 'STARTED': 
        this.nextStatus = 'IN_PROGRESS';
        break;
      case 'IN_PROGRESS':
        this.nextStatus = 'READY_FOR_DELIVERY';
        break;
      case 'READY_FOR_DELIVERY':
        this.nextStatus = 'DELIVERED';
        break;
    }
  }

  pathToBack:string = '';

  changeStatus():void {
    this.getNextStatus();

    this.pathToBack = `/${ToBackLaundry(this.status)}`;
    const backTarget = this.navigationHistoryService.resolveBackTarget(this.pathToBack);

    if(this.nextStatus) {
      if(this.data){
        this.laundryService.updateStatus(this.data?.id, this.nextStatus).subscribe({
          next: response => {
            if (Array.isArray(backTarget)) {
              this.router.navigate(backTarget);
              return;
            }

            if (typeof backTarget === 'string' && backTarget.length > 0) {
              this.router.navigateByUrl(backTarget);
              return;
            }

            this.router.navigate([this.pathToBack]);
          },
          error: (httpErr:HttpErrorResponse) => {}
        });
      }
    }
  }

  onNoteCreated(log: LaundryServiceLog) {
    this.latestNote = log;
    this.notesDialogVisible = false;
  }

  onCancelNotes() {
    this.notesDialogVisible = false;
  }

  onNoteDeleted(logId: number) {
    // por ejemplo, mostrar notificación o actualizar contador
  }

  private bindDeliveryTracking(): void {
    this.deliverySubscription?.unsubscribe();
    this.deliverySubscription = this.deliveryForm.valueChanges.pipe(
      debounceTime(150),
      distinctUntilChanged((previous, current) => previous.distance_km === current.distance_km)
    ).subscribe((value) => {
      if (this.deliveryManualMode) {
        return;
      }

      const distanceKm = this.toNullableNumber(value.distance_km);
      if (!distanceKm || distanceKm <= 0 || this.deliveryPricePerKm <= 0) {
        this.deliveryForm.patchValue({
          delivery_fee_final: 0,
          delivery_fee_override_reason: ''
        }, { emitEvent: false });
        return;
      }

      this.deliveryForm.patchValue({
        delivery_fee_final: this.roundCurrency(distanceKm * this.deliveryPricePerKm),
        delivery_fee_override_reason: 'Calculado por distancia'
      }, { emitEvent: false });
      this.updateGlobalDiscount();
    });
  }

  private loadDeliveryPricePerKm(): void {
    this.globalSettingsApi.getDeliveryPricePerKm().pipe(
      catchError(() => {
        this.deliveryPricePerKmError = 'No fue posible cargar el precio por km.';
        return of(0);
      })
    ).subscribe((value) => {
      this.deliveryPricePerKm = this.roundCurrency(this.toNumber(value));
      this.syncDeliveryFeeFromDistance();
    });
  }

  private loadExpressServiceSurcharge(): void {
    this.globalSettingsApi.getExpressServiceSurcharge().pipe(
      catchError(() => of(0))
    ).subscribe((value) => {
      const surcharge = this.roundCurrency(this.toNumber(value));

      if (!this.uiModel || this.uiModel.express_service_surcharge != null) {
        return;
      }

      this.uiModel = {
        ...this.uiModel,
        express_service_surcharge: surcharge,
        quoted_service_amount: this.uiModel.service_label === 'EXPRESS'
          ? this.roundCurrency(this.getBaseWeightQuotePrice() + surcharge)
          : this.getBaseWeightQuotePrice() || null
      };

      if (this.draft === undefined) {
        return;
      }

      this.recalculateWeightPricingIfNeeded();
    });
  }

  private loadDraftByService(laundryServiceId: number): void {
    this.commercialDraftsApi.getByService(laundryServiceId).pipe(
      catchError(() => {
        this.draftStatusMessage = 'Aun no existe un borrador comercial para este servicio.';
        return of(null);
      })
    ).subscribe((draft) => {
      if (!draft) {
        this.draft = null;
        this.confirmedOrder = null;
        this.patchDeliveryFormFromUiModel(this.uiModel);
        this.recalculateWeightPricingIfNeeded();
        return;
      }

      this.draft = draft;
      this.confirmedOrder = draft.order ?? null;
      const payload = draft.payload;
      const nextUiModel = payload && typeof payload === 'object' && 'ui_model' in payload
        ? (payload['ui_model'] as DetailUiCaptureModel | undefined)
        : undefined;

      if (!nextUiModel) {
        this.patchDeliveryFormFromUiModel(this.uiModel);
        return;
      }

      this.uiModel = this.mergeUiModelWithService(nextUiModel);
      this.updateWeightDiscount();
      this.updateGlobalDiscount();
      this.patchDeliveryFormFromUiModel(this.uiModel);
      this.draftStatusMessage = `Borrador cargado #${draft.id}`;

      if (this.shouldHydrateDraftFromService(nextUiModel, this.uiModel)) {
        this.persistHydratedDraft();
      }
    });
  }

  private patchDeliveryFormFromUiModel(uiModel: DetailUiCaptureModel | null): void {
    const transactionPaymentTypeId = this.data?.transaction && 'payment_type_id' in this.data.transaction
      ? this.data.transaction.payment_type_id
      : null;

    this.deliveryForm.patchValue({
      is_express: uiModel?.service_label === 'EXPRESS',
      pricing_profile_id: uiModel?.pricing_profile_id ?? this.pricingProfiles[0]?.id ?? null,
      payment_type_id: uiModel?.payment_type_id ?? transactionPaymentTypeId ?? null,
      global_discount_type: uiModel?.global_discount_type ?? null,
      global_discount_value: uiModel?.global_discount_value ?? null,
      global_discount_reason: uiModel?.global_discount_reason ?? '',
      weight_discount_type: uiModel?.weight_discount_type ?? null,
      weight_discount_value: uiModel?.weight_discount_value ?? null,
      weight_discount_reason: uiModel?.weight_discount_reason ?? '',
      distance_km: uiModel?.distance_km ?? null,
      delivery_fee_final: uiModel?.delivery_fee_final ?? 0,
      delivery_fee_override_reason: uiModel?.delivery_fee_override_reason ?? ''
    }, { emitEvent: false });

    this.deliveryManualMode = Boolean(
      uiModel?.delivery_fee_final
      && uiModel.delivery_fee_final > 0
      && (!uiModel.distance_km || uiModel.distance_km <= 0)
    );

    if (this.deliveryManualMode) {
      this.deliveryForm.get('distance_km')?.disable({ emitEvent: false });
      return;
    }

    this.deliveryForm.get('distance_km')?.enable({ emitEvent: false });
    this.syncDeliveryFeeFromDistance();
  }

  private buildBaseUiModel(service: LaundryServiceResp): DetailUiCaptureModel {
    return {
      id: service.id,
      client_id: service.client_id ?? null,
      client_address_id: service.client_address_id ?? null,
      scheduled_pickup_at: service.scheduled_pickup_at ?? null,
      status: service.status ?? null,
      service_label: service.service_label ?? null,
      transaction_id: service.transaction_id ?? null,
      payment_type_id: null,
      pricing_profile_id: null,
      delivery_zone_id: null,
      weight_lb: service.weight_lb ?? null,
      distance_km: null,
      delivery_price_per_km: null,
      express_service_surcharge: null,
      quoted_service_amount: null,
      weight_discount_type: null,
      weight_discount_value: null,
      weight_discount_amount: null,
      weight_final_price_after_discount: null,
      weight_discount_reason: null,
      delivery_fee_suggested: null,
      delivery_fee_final: null,
      delivery_fee_override_reason: null,
      global_discount_type: null,
      global_discount_value: null,
      global_discount_amount: 0,
      global_discount_reason: null,
      gross_total_before_global_discount: null,
      net_total_after_global_discount: null,
      notes: service.notes ?? null,
      items: (service.items ?? []).map((item) => ({
        garment_type_id: item.garment_type_id,
        quantity: this.toNumber(item.quantity),
        unit_type: item.unit_type,
        unit_price: item.unit_price ?? null,
        notes: item.notes ?? null,
        garment_name: item.garment_type?.name ?? null
      })),
      extras: (service.extras ?? []).map((extra) => ({
        service_extra_type_id: extra.service_extra_type_id,
        quantity: this.toNumber(extra.quantity),
        unit_price: extra.unit_price ?? null,
        notes: extra.notes ?? null,
        name: extra.service_extra_type?.name ?? null
      })),
      weight_pricing_preview: null,
      commercial_capture_pending: []
    };
  }

  private mergeUiModelWithService(uiModel: DetailUiCaptureModel): DetailUiCaptureModel {
    const resolvedQuotedServiceAmount = this.resolveDraftQuotedServiceAmount(uiModel, this.draft?.quoted_service_amount);
    const mergedUiModel = {
      ...this.buildBaseUiModel(this.data as LaundryServiceResp),
      ...uiModel,
      express_service_surcharge: uiModel.express_service_surcharge ?? this.uiModel?.express_service_surcharge ?? null,
      quoted_service_amount: resolvedQuotedServiceAmount ?? this.uiModel?.quoted_service_amount ?? null,
      items: (uiModel.items ?? []).map((item) => ({
        ...item,
        garment_name: this.resolveGarmentName(item)
      })),
      commercial_capture_pending: (uiModel.commercial_capture_pending ?? []).map((item) => ({
        ...item,
        base_unit_price: this.toNullableNumber(item.base_unit_price ?? item.manual_price),
        final_unit_price: this.toNullableNumber(item.final_unit_price ?? item.manual_price),
        manual_price: this.toNullableNumber(item.final_unit_price ?? item.manual_price),
        discount_amount: this.toNullableNumber(item.discount_amount),
        discount_value: this.toNullableNumber(item.discount_value),
        discount_reason: this.toNullableText(item.discount_reason),
        manual_price_override_reason: this.toNullableText(item.manual_price_override_reason)
      })),
      extras: (uiModel.extras ?? []).map((extra) => ({
        ...extra,
        name: this.resolveExtraName(extra)
      }))
    };

    if (mergedUiModel.quoted_service_amount == null) {
      const baseAmount = this.toNumber(mergedUiModel.weight_pricing_preview?.final_price ?? mergedUiModel.weight_pricing_preview?.recommended_price);
      const surcharge = mergedUiModel.service_label === 'EXPRESS'
        ? this.toNumber(mergedUiModel.express_service_surcharge)
        : 0;

      mergedUiModel.quoted_service_amount = this.roundCurrency(baseAmount + surcharge) || null;
    }

    return mergedUiModel;
  }

  private buildCurrentUiModel(): DetailUiCaptureModel {
    if (!this.uiModel) {
      return this.buildBaseUiModel(this.data as LaundryServiceResp);
    }

    return this.applyGlobalDiscountSnapshot({
      ...this.uiModel,
      service_label: this.deliveryForm.get('is_express')?.value ? 'EXPRESS' : 'NORMAL',
      pricing_profile_id: this.resolvePricingProfileId(),
      payment_type_id: this.toNullableNumber(this.deliveryForm.get('payment_type_id')?.value),
      distance_km: this.toNullableNumber(this.deliveryForm.get('distance_km')?.value),
      delivery_price_per_km: this.deliveryPricePerKm || null,
      express_service_surcharge: this.toNumber(this.uiModel.express_service_surcharge) || null,
      quoted_service_amount: this.getQuotedServiceAmount() || null,
      weight_discount_type: this.deliveryForm.get('weight_discount_type')?.value ?? null,
      weight_discount_value: this.toNullableNumber(this.deliveryForm.get('weight_discount_value')?.value),
      weight_discount_amount: this.toNullableNumber(this.uiModel.weight_discount_amount),
      weight_final_price_after_discount: this.toNullableNumber(this.uiModel.weight_final_price_after_discount),
      weight_discount_reason: this.toNullableText(this.deliveryForm.get('weight_discount_reason')?.value),
      global_discount_type: this.deliveryForm.get('global_discount_type')?.value ?? null,
      global_discount_value: this.toNullableNumber(this.deliveryForm.get('global_discount_value')?.value),
      global_discount_amount: this.toNumber(this.uiModel.global_discount_amount),
      global_discount_reason: this.toNullableText(this.deliveryForm.get('global_discount_reason')?.value),
      gross_total_before_global_discount: this.toNullableNumber(this.uiModel.gross_total_before_global_discount),
      net_total_after_global_discount: this.toNullableNumber(this.uiModel.net_total_after_global_discount),
      delivery_fee_final: this.toNullableNumber(this.deliveryForm.get('delivery_fee_final')?.value),
      delivery_fee_override_reason: this.toNullableText(this.deliveryForm.get('delivery_fee_override_reason')?.value)
    });
  }

  private resolveExtraName(extra: Pick<DetailUiCaptureExtraItem, 'service_extra_type_id' | 'name'>): string {
    return extra.name
      ?? this.extraTypes.find((item) => item.id === extra.service_extra_type_id)?.name
      ?? this.data?.extras?.find((serviceExtra) => serviceExtra.service_extra_type_id === extra.service_extra_type_id)?.service_extra_type?.name
      ?? `Extra #${extra.service_extra_type_id}`;
  }

  private resolveGarmentName(garment: Pick<DetailUiCaptureGarmentItem, 'garment_type_id' | 'garment_name'>): string {
    return garment.garment_name
      ?? this.garmentTypes.find((item) => item.id === garment.garment_type_id)?.name
      ?? this.data?.items?.find((serviceItem) => serviceItem.garment_type_id === garment.garment_type_id)?.garment_type?.name
      ?? `Prenda #${garment.garment_type_id}`;
  }

  private syncDeliveryFeeFromDistance(): void {
    if (this.deliveryManualMode) {
      return;
    }

    const distanceKm = this.getDistanceKm();
    if (distanceKm <= 0 || this.deliveryPricePerKm <= 0) {
      return;
    }

    this.deliveryForm.patchValue({
      delivery_fee_final: this.roundCurrency(distanceKm * this.deliveryPricePerKm),
      delivery_fee_override_reason: 'Calculado por distancia'
    }, { emitEvent: false });
  }

  private resolvePricingProfileId(): number | null {
    const selectedProfileId = this.toNumber(this.deliveryForm.get('pricing_profile_id')?.value);
    if (selectedProfileId > 0) {
      return selectedProfileId;
    }

    const draftProfileId = this.toNumber(this.uiModel?.pricing_profile_id);
    if (draftProfileId > 0) {
      return draftProfileId;
    }

    return this.pricingProfiles[0]?.id ?? null;
  }

  private recalculateWeightPricingIfNeeded(): void {
    const weightLb = this.toNullableNumber(this.uiModel?.weight_lb);
    const pricingProfileId = this.resolvePricingProfileId();

    if (!this.uiModel || !weightLb || weightLb <= 0 || !pricingProfileId) {
      return;
    }

    const loaderRequestId = this.beginWeightQuoteLoader();

    this.weightPricingApi.quote({
      profile_id: pricingProfileId,
      weight_lb: weightLb
    }).pipe(
      catchError(() => of(null)),
      finalize(() => {
        this.finishWeightQuoteLoader(loaderRequestId);
      })
    ).subscribe((quote) => {
      if (!quote || !this.uiModel) {
        return;
      }

      const surcharge = this.getCurrentServiceLabel() === 'EXPRESS'
        ? this.toNumber(this.uiModel.express_service_surcharge)
        : 0;

      this.uiModel = {
        ...this.uiModel,
        pricing_profile_id: pricingProfileId,
        weight_pricing_preview: quote,
        quoted_service_amount: this.roundCurrency(this.toNumber(quote.final_price ?? quote.recommended_price) + surcharge)
      };

      this.updateWeightDiscount();
      this.updateGlobalDiscount();
    });
  }

  private updateWeightDiscount(
    partial: Partial<Pick<DetailUiCaptureModel,
      'weight_discount_type' | 'weight_discount_value' | 'weight_discount_reason' |
      'weight_discount_amount' | 'weight_final_price_after_discount'
    >> = {}
  ): void {
    if (!this.uiModel) {
      return;
    }

    const nextModel: DetailUiCaptureModel = {
      ...this.uiModel,
      ...partial
    };
    const type = nextModel.weight_discount_type ?? null;
    const value = this.toNullableNumber(nextModel.weight_discount_value);
    const baseAmount = this.toNumber(
      nextModel.weight_pricing_preview?.final_price
      ?? nextModel.quoted_service_amount
      ?? this.draft?.quoted_service_amount
      ?? nextModel.weight_pricing_preview?.recommended_price
    );
    const discount = this.computeDiscount(baseAmount, type, value);

    nextModel.weight_discount_amount = discount?.discountAmount ?? null;
    nextModel.weight_final_price_after_discount = discount?.finalAmount ?? null;
    nextModel.weight_discount_reason = this.toNullableText(nextModel.weight_discount_reason);
    this.uiModel = nextModel;
  }

  private updateSpecialItem(
    serviceId: number,
    partial: Partial<DetailUiCaptureCommercialItem>
  ): void {
    if (!this.uiModel) {
      return;
    }

    this.uiModel = {
      ...this.uiModel,
      commercial_capture_pending: this.uiModel.commercial_capture_pending.map((item) => {
        if (item.service_id !== serviceId) {
          return item;
        }

        const nextItem: DetailUiCaptureCommercialItem = {
          ...item,
          ...partial
        };
        const baseAmount = this.getSpecialItemBaseUnitPrice(nextItem);
        const type = nextItem.discount_type ?? null;
        const value = this.toNullableNumber(nextItem.discount_value);
        const discount = this.computeDiscount(baseAmount, type, value);

        nextItem.base_unit_price = baseAmount || null;
        nextItem.discount_amount = discount?.discountAmount ?? null;
        nextItem.final_unit_price = discount?.finalAmount ?? (baseAmount || null);
        nextItem.manual_price = nextItem.final_unit_price ?? nextItem.manual_price;
        nextItem.manual_price_override_reason = discount ? 'Descuento comercial' : null;
        nextItem.discount_reason = this.toNullableText(nextItem.discount_reason);

        return nextItem;
      })
    };
    this.updateGlobalDiscount();
  }

  private updateGlobalDiscount(
    partial: Partial<Pick<DetailUiCaptureModel,
      'global_discount_type' | 'global_discount_value' | 'global_discount_reason' |
      'global_discount_amount' | 'gross_total_before_global_discount' | 'net_total_after_global_discount'
    >> = {}
  ): void {
    if (!this.uiModel) {
      return;
    }

    const nextModel: DetailUiCaptureModel = {
      ...this.uiModel,
      ...partial
    };
    this.uiModel = this.applyGlobalDiscountSnapshot(nextModel);
  }

  private applyGlobalDiscountSnapshot(model: DetailUiCaptureModel): DetailUiCaptureModel {
    const grossTotal = this.getGrossTotalForModel(model);
    const type = model.global_discount_type ?? null;
    const value = this.toNullableNumber(model.global_discount_value);
    const discount = this.computeGlobalDiscount(grossTotal, type, value);

    return {
      ...model,
      global_discount_amount: discount?.discountAmount ?? 0,
      gross_total_before_global_discount: grossTotal,
      net_total_after_global_discount: discount?.finalAmount ?? grossTotal,
      global_discount_reason: this.toNullableText(model.global_discount_reason)
    };
  }

  private getGrossTotalForModel(model: DetailUiCaptureModel): number {
    const specialItemsSubtotal = (model.commercial_capture_pending ?? []).reduce(
      (total, item) => total + (this.toNumber(item.quantity) * this.toNumber(item.manual_price)),
      0
    );
    const extrasSubtotal = (model.extras ?? []).reduce(
      (total, item) => total + (this.toNumber(item.quantity) * this.toNumber(item.unit_price)),
      0
    );
    const weightPrice = this.toNumber(
      model.weight_final_price_after_discount
      ?? model.weight_pricing_preview?.final_price
      ?? model.quoted_service_amount
      ?? this.draft?.quoted_service_amount
      ?? model.weight_pricing_preview?.recommended_price
    );
    const quotedServiceAmount = this.toNumber(model.quoted_service_amount);
    const expressSurcharge = model.service_label === 'EXPRESS'
      ? this.toNumber(model.express_service_surcharge)
      : 0;
    const expressToAdd = quotedServiceAmount > weightPrice && expressSurcharge > 0 ? 0 : expressSurcharge;

    return this.roundCurrency(
      weightPrice
      + specialItemsSubtotal
      + extrasSubtotal
      + this.toNumber(model.delivery_fee_final)
      + expressToAdd
    );
  }

  private computeGlobalDiscount(
    grossTotal: number,
    discountType: GlobalDiscountType | null | undefined,
    discountValue: number | null | undefined
  ): DiscountComputation | null {
    const safeGross = this.roundCurrency(Math.max(0, this.toNumber(grossTotal)));
    const safeValue = this.toNullableNumber(discountValue);

    if (!discountType || safeValue == null || safeValue <= 0 || safeGross <= 0) {
      return null;
    }

    if (discountType === 'PERCENT') {
      const discountAmount = this.roundCurrency(safeGross * (safeValue / 100));
      return {
        baseAmount: safeGross,
        discountAmount: Math.min(discountAmount, safeGross),
        finalAmount: this.roundCurrency(Math.max(0, safeGross - discountAmount))
      };
    }

    const targetFinalTotal = this.roundCurrency(safeValue);
    if (targetFinalTotal > safeGross) {
      return null;
    }

    return {
      baseAmount: safeGross,
      discountAmount: this.roundCurrency(Math.max(0, safeGross - targetFinalTotal)),
      finalAmount: targetFinalTotal
    };
  }

  private computeDiscount(
    baseAmount: number,
    discountType: DiscountType | null | undefined,
    discountValue: number | null | undefined
  ): DiscountComputation | null {
    const safeBase = this.roundCurrency(Math.max(0, this.toNumber(baseAmount)));
    const safeValue = this.toNullableNumber(discountValue);

    if (!discountType || safeValue == null || safeValue <= 0 || safeBase <= 0) {
      return null;
    }

    if (discountType === 'PERCENT') {
      const discountAmount = this.roundCurrency(safeBase * (safeValue / 100));
      const finalAmount = this.roundCurrency(Math.max(0, safeBase - discountAmount));
      return {
        baseAmount: safeBase,
        discountAmount: Math.min(discountAmount, safeBase),
        finalAmount
      };
    }

    const targetFinalAmount = this.roundCurrency(safeValue);
    if (targetFinalAmount > safeBase) {
      return null;
    }

    return {
      baseAmount: safeBase,
      discountAmount: this.roundCurrency(Math.max(0, safeBase - targetFinalAmount)),
      finalAmount: targetFinalAmount
    };
  }

  private resolveDraftQuotedServiceAmount(
    uiModel: DetailUiCaptureModel | null | undefined,
    topLevelQuotedServiceAmount?: unknown
  ): number | null {
    return this.toNullableNumber(
      uiModel?.weight_pricing_preview?.final_price
      ?? uiModel?.quoted_service_amount
      ?? topLevelQuotedServiceAmount
      ?? uiModel?.weight_pricing_preview?.recommended_price
    );
  }

  private beginWeightQuoteLoader(): number {
    const requestId = ++this.weightQuoteLoaderRequestId;
    this.clearWeightQuoteLoaderTimeout();
    this.weightQuoteLoaderTimeoutId = window.setTimeout(() => {
      if (this.weightQuoteLoaderRequestId === requestId) {
        this.loaderDialog?.open('Consultando precio por peso...');
      }
    }, 250);

    return requestId;
  }

  private finishWeightQuoteLoader(requestId: number): void {
    if (this.weightQuoteLoaderRequestId !== requestId) {
      return;
    }

    this.clearWeightQuoteLoaderTimeout();
    this.loaderDialog?.close();
  }

  private clearWeightQuoteLoaderTimeout(): void {
    if (this.weightQuoteLoaderTimeoutId !== null) {
      window.clearTimeout(this.weightQuoteLoaderTimeoutId);
      this.weightQuoteLoaderTimeoutId = null;
    }
  }

  private buildWhatsappSummary(): string {
    const clientName = this.data?.client?.name?.trim();
    const lines: string[] = [];
    const globalDiscountAmount = this.getGlobalDiscountAmount();
    const grossTotal = this.getGrossDraftTotal();

    if (clientName) {
      lines.push(`${clientName}:`);
    }

    if (this.getWeightQuotePrice() > 0) {
      lines.push(`👚 ${this.formatCurrency(this.getWeightQuotePrice())} Ropa ${this.getCapturedWeightLb()} lb`);
    }

    if (this.getDeliveryFeeFinal() > 0) {
      lines.push(`🚗 ${this.formatCurrency(this.getDeliveryFeeFinal())} Envio`);
    }

    lines.push(`⚡️ Servicio ${this.getCurrentServiceLabel() === 'EXPRESS' ? 'express' : 'normal'} ${this.formatCurrency(this.getExpressSurchargeAmount())}`);

    const additionalLines = [
      ...this.getSelectedExtras().map((item) => `${this.getWhatsappLineEmoji(item.name)} ${this.formatCurrency(item.subtotal)} ${item.name}`),
      ...(this.uiModel?.commercial_capture_pending ?? [])
        .filter((item) => this.toNumber(item.quantity) > 0)
        .map((item) => {
          const itemName = item.service_name || `Servicio #${item.service_id}`;
          const quantity = this.toNumber(item.quantity);
          const quantityText = this.getSpecialWhatsappQuantityText(itemName, quantity);
          const suffix = quantityText ? ` ${quantityText}` : '';
          const discountText = this.hasSpecialItemDiscount(item)
            ? ` desc. ${this.formatCurrency(this.toNumber(item.discount_amount))}`
            : '';
          return `${this.getWhatsappLineEmoji(itemName)} ${this.formatCurrency(quantity * this.getSpecialItemFinalUnitPrice(item))} ${itemName}${suffix}${discountText}`;
        })
    ];

    if (additionalLines.length) {
      lines.push('Producto adicional');
      lines.push(...additionalLines);
    }

    if (globalDiscountAmount > 0) {
      lines.push(`Descuento global: -${this.formatCurrency(globalDiscountAmount)}`);
      if (this.uiModel?.global_discount_reason) {
        lines.push(`Motivo descuento: ${this.uiModel.global_discount_reason}`);
      }
      lines.push(`Subtotal antes de descuento: ${this.formatCurrency(grossTotal)}`);
    }

    lines.push(`*Total: ${this.formatCurrency(this.getGrandDraftTotal())}*`);

    return lines.join('\n').trim();
  }

  private getWhatsappLineEmoji(name: string): string {
    const normalized = name.toLowerCase();

    if (normalized.includes('perla')) return '✨';
    if (normalized.includes('remojo')) return '🔩';
    if (normalized.includes('planch')) return '👔';
    if (normalized.includes('envio') || normalized.includes('delivery')) return '🚗';
    if (normalized.includes('ropa')) return '👚';
    if (normalized.includes('express')) return '⚡️';

    return this.getColorCircleEmoji(name);
  }

  private getColorCircleEmoji(seed: string): string {
    const circles = ['🔵', '🟢', '🟠', '🟣', '🟡'];
    const index = Math.abs(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % circles.length;
    return circles[index];
  }

  private getSpecialWhatsappQuantityText(name: string, quantity: number): string {
    if (!quantity) {
      return '';
    }

    if (name.toLowerCase().includes('planch')) {
      return `(${quantity} prendas)`;
    }

    return quantity > 1 ? `(${quantity})` : '';
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(this.toNumber(value));
  }

  private shouldHydrateDraftFromService(
    originalDraftUiModel: DetailUiCaptureModel,
    mergedUiModel: DetailUiCaptureModel
  ): boolean {
    return (
      (originalDraftUiModel.weight_lb == null && mergedUiModel.weight_lb != null)
      || (originalDraftUiModel.notes == null && mergedUiModel.notes != null)
      || (originalDraftUiModel.express_service_surcharge == null && mergedUiModel.express_service_surcharge != null)
      || (originalDraftUiModel.quoted_service_amount == null && mergedUiModel.quoted_service_amount != null)
    );
  }

  private persistHydratedDraft(): void {
    if (!this.data?.id || !this.uiModel || !this.draft) {
      return;
    }

    if (this.draft.is_confirmed) {
      return;
    }

    const payload = this.draft.payload && typeof this.draft.payload === 'object'
      ? { ...this.draft.payload, ui_model: this.uiModel }
      : {
          ui_model: this.uiModel,
          laundry_service_payload: null,
          order_payload: null,
          validations: {
            laundry_service: [],
            order: []
          }
        };

    this.commercialDraftsApi.saveByService(this.data.id, {
      payload,
      is_confirmed: this.draft.is_confirmed ?? false,
      confirmed_at: this.draft.confirmed_at ?? null,
      charged_by_user_id: this.draft.charged_by_user_id ?? null
    }).pipe(
      catchError(() => of(null))
    ).subscribe((draft) => {
      if (!draft) {
        return;
      }

      this.draft = draft;
      this.confirmedOrder = draft.order ?? this.confirmedOrder;
      this.draftStatusMessage = `Borrador cargado #${draft.id} y completado con datos del servicio`;
    });
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toNullableNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toNullableText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }


}
