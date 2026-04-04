import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription, catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, of } from 'rxjs';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { LaundryServiceExtraType, LaundryServiceLog, LaundryServiceResp, LaundryServiceStatus, LaundryUnitType } from '@shared/interfaces/laundry-service.interface';
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
import { ToBackLaundry } from '@modules/laundry/commons/route';
import { NavigationHistoryService } from '@shared/services/navigation/navigation-history.service';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { LaundryServiceExtraTypesService } from '@shared/services/laundry/laundry-service-extra-types.service';
import { GlobalSettingsApiService } from '@modules/laundry-commerce/services/global-settings-api.service';
import {
  LaundryServiceCommercialDraftRecord,
  LaundryServiceCommercialDraftsApiService
} from '@modules/laundry-commerce/services/laundry-service-commercial-drafts-api.service';
import { WeightPricingQuoteResponse } from '@modules/laundry-commerce/interfaces/weight-pricing.interface';

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
  delivery_fee_suggested: number | null;
  delivery_fee_final: number | null;
  delivery_fee_override_reason: string | null;
  global_discount_amount: number;
  global_discount_reason: string | null;
  notes: string | null;
  items: DetailUiCaptureGarmentItem[];
  extras: DetailUiCaptureExtraItem[];
  weight_pricing_preview: WeightPricingQuoteResponse | null;
  commercial_capture_pending: DetailUiCaptureCommercialItem[];
};

@Component({
  selector: 'app-laundry-detail',
  imports: [
    CommonModule,
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
    DividerModule,
    InputNumberModule,
    InputTextModule,
    ToggleSwitchModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './laundry-detail.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LaundryDetailComponent implements OnInit, OnDestroy {

  @Input() status!:LaundryServiceStatus;
  
  data?: LaundryServiceResp;
  draft?: LaundryServiceCommercialDraftRecord | null;
  uiModel: DetailUiCaptureModel | null = null;
  extraTypes: LaundryServiceExtraType[] = [];
  
  loading = true;
  savingDraft = false;
  deliveryPricePerKm = 0;
  deliveryPricePerKmError: string | null = null;
  draftSaveMessage: string | null = null;
  draftSaveError: string | null = null;
  draftStatusMessage: string | null = null;
  deliveryManualMode = false;
  statusColorMap = LaundryStatusColorMap;
  addressDialogVisible: boolean = false;
  notesDialogVisible = false;
  latestNote: LaundryServiceLog | null = null;
  deliveryForm: FormGroup;
  private deliverySubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private laundryService: LaundryService,
    private extraTypesService: LaundryServiceExtraTypesService,
    private globalSettingsApi: GlobalSettingsApiService,
    private commercialDraftsApi: LaundryServiceCommercialDraftsApiService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private navigationHistoryService: NavigationHistoryService
  ) {
    this.deliveryForm = this.fb.group({
      is_express: [false],
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
      extraTypes: this.extraTypesService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ service, extraTypes }) => {
        this.data = service;
        this.extraTypes = extraTypes.filter((item) => item.active !== false);
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
    return this.getQuotedServiceAmount();
  }

  getBaseWeightQuotePrice(): number {
    return this.toNumber(this.uiModel?.weight_pricing_preview?.final_price ?? this.uiModel?.weight_pricing_preview?.recommended_price);
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
    return this.getWeightQuotePrice()
      + this.getDeliveryFeeFinal()
      + this.getExtrasSubtotal()
      + this.getSpecialItemsDraftTotal();
  }

  getSelectedGarments(): Array<{ name: string; quantity: number; unitLabel: string }> {
    return (this.uiModel?.items ?? [])
      .filter((item) => this.toNumber(item.quantity) > 0)
      .map((item) => ({
        name: item.garment_name || `Prenda #${item.garment_type_id}`,
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
        unitPrice: this.toNumber(item.manual_price),
        subtotal: this.toNumber(item.quantity) * this.toNumber(item.manual_price),
        categoryName: item.category_name
      }));
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

      return;
    }

    this.deliveryManualMode = true;
    this.deliveryForm.get('distance_km')?.disable({ emitEvent: false });
    this.deliveryForm.patchValue({
      delivery_fee_override_reason: 'Precio manual de delivery'
    }, { emitEvent: false });
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
  }

  saveDeliveryDraft(): void {
    if (!this.data?.id || !this.uiModel) {
      this.draftSaveError = 'No existe un servicio valido para guardar delivery.';
      return;
    }

    this.savingDraft = true;
    this.draftSaveError = null;
    this.draftSaveMessage = null;

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
      finalize(() => this.savingDraft = false),
      catchError(() => {
        this.draftSaveError = 'No fue posible guardar los datos de delivery.';
        return of(null);
      })
    ).subscribe((draft) => {
      if (!draft) {
        return;
      }

      this.draft = draft;
      this.uiModel = nextUiModel;
      this.draftSaveMessage = `Delivery guardado en borrador #${draft.id}`;
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
        this.patchDeliveryFormFromUiModel(this.uiModel);
        return;
      }

      this.draft = draft;
      const payload = draft.payload;
      const nextUiModel = payload && typeof payload === 'object' && 'ui_model' in payload
        ? (payload['ui_model'] as DetailUiCaptureModel | undefined)
        : undefined;

      if (!nextUiModel) {
        this.patchDeliveryFormFromUiModel(this.uiModel);
        return;
      }

      this.uiModel = this.mergeUiModelWithService(nextUiModel);
      this.patchDeliveryFormFromUiModel(this.uiModel);
      this.draftStatusMessage = `Borrador cargado #${draft.id}`;

      if (this.shouldHydrateDraftFromService(nextUiModel, this.uiModel)) {
        this.persistHydratedDraft();
      }
    });
  }

  private patchDeliveryFormFromUiModel(uiModel: DetailUiCaptureModel | null): void {
    this.deliveryForm.patchValue({
      is_express: uiModel?.service_label === 'EXPRESS',
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
      delivery_fee_suggested: null,
      delivery_fee_final: null,
      delivery_fee_override_reason: null,
      global_discount_amount: 0,
      global_discount_reason: null,
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
    const mergedUiModel = {
      ...this.buildBaseUiModel(this.data as LaundryServiceResp),
      ...uiModel,
      express_service_surcharge: uiModel.express_service_surcharge ?? this.uiModel?.express_service_surcharge ?? null,
      quoted_service_amount: uiModel.quoted_service_amount ?? this.uiModel?.quoted_service_amount ?? null,
      items: (uiModel.items ?? []).map((item) => ({
        ...item,
        garment_name: item.garment_name
          ?? this.data?.items?.find((serviceItem) => serviceItem.garment_type_id === item.garment_type_id)?.garment_type?.name
          ?? null
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

    return {
      ...this.uiModel,
      service_label: this.deliveryForm.get('is_express')?.value ? 'EXPRESS' : 'NORMAL',
      distance_km: this.toNullableNumber(this.deliveryForm.get('distance_km')?.value),
      delivery_price_per_km: this.deliveryPricePerKm || null,
      express_service_surcharge: this.toNumber(this.uiModel.express_service_surcharge) || null,
      quoted_service_amount: this.getQuotedServiceAmount() || null,
      delivery_fee_final: this.toNullableNumber(this.deliveryForm.get('delivery_fee_final')?.value),
      delivery_fee_override_reason: this.toNullableText(this.deliveryForm.get('delivery_fee_override_reason')?.value)
    };
  }

  private resolveExtraName(extra: Pick<DetailUiCaptureExtraItem, 'service_extra_type_id' | 'name'>): string {
    return extra.name
      ?? this.extraTypes.find((item) => item.id === extra.service_extra_type_id)?.name
      ?? this.data?.extras?.find((serviceExtra) => serviceExtra.service_extra_type_id === extra.service_extra_type_id)?.service_extra_type?.name
      ?? `Extra #${extra.service_extra_type_id}`;
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
