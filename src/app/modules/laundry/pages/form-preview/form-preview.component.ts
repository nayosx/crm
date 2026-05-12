import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { AccordionModule } from 'primeng/accordion';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import {
  LaundryServiceCommercialDetailPayload,
  LaundryServiceSummaryItem,
  LaundryServiceSummaryResponse,
} from '@shared/interfaces/laundry-service.interface';
import { LaundryGarmentType } from '@shared/interfaces/laundry-garment-type.interface';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';
import {
  BottomNavigationAction,
  BottomNavigationComponent
} from '@shared/components/bottom-navigation/bottom-navigation.component';
import { DialogLoadingService } from '@shared/services/dialog-loading.service';
import { LaundryGarmentTypesService } from '@shared/services/laundry/laundry-garment-types.service';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import {
  LaundryCommercialCatalogExtraItem,
  LaundryCommercialCatalogService,
  LaundryCommercialCatalogServiceItem,
  LaundryCommercialCatalogVariantItem
} from '@shared/services/laundry/laundry-commercial-catalog.service';

@Component({
  selector: 'app-form-preview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ToggleSwitchModule,
    TagModule,
    ToastModule,
    AccordionModule,
    DialogModule,
    LoaderDialogComponent,
    BackButtonComponent,
    TruncatePipe,
    BottomNavigationComponent
  ],
  providers: [MessageService],
  templateUrl: './form-preview.component.html',
  styleUrl: './form-preview.component.scss'
})
export class FormPreviewComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly laundryService = inject(LaundryService);
  private readonly garmentTypesService = inject(LaundryGarmentTypesService);
  private readonly catalogService = inject(LaundryCommercialCatalogService);
  private readonly messageService = inject(MessageService);
  private readonly dialogLoadingService = inject(DialogLoadingService);

  readonly isLoading = signal(false);
  readonly showWeightService = signal(false);
  readonly activeAccordionValues = signal<string[]>([]);
  readonly showNotesCard = signal(false);

  serviceId!: number;
  get backRoute(): string {
    return `/laundry/service/${this.serviceId}`;
  }
  summary: LaundryServiceSummaryResponse | null = null;
  garmentTypes: LaundryGarmentType[] = [];
  serviceCatalog: LaundryCommercialCatalogServiceItem[] = [];
  extrasCatalog: LaundryCommercialCatalogExtraItem[] = [];
  serviceVariants: Record<number, LaundryCommercialCatalogVariantItem[]> = {};
  showServicePicker = false;
  serviceSearchTerm = '';
  selectedServiceForPicker: LaundryCommercialCatalogServiceItem | null = null;
  selectedServiceVariants: LaundryCommercialCatalogVariantItem[] = [];
  serviceVariantQuantities: Record<number, number | null> = {};
  servicePickerPreviewItems: Array<{
    variant: LaundryCommercialCatalogVariantItem;
    quantity: number;
  }> = [];
  servicePickerStep: 'list' | 'variants' | 'preview' = 'list';
  servicePickerMode: 'service' | 'variant' = 'service';
  showExtraPicker = false;
  showGarmentPicker = false;
  garmentSearchTerm = '';
  garmentDraftQuantity = 1;
  selectedGarmentType: LaundryGarmentType | null = null;
  private suppressPendingSaveNotice = false;

  readonly form = this.fb.group({
    notes: [''],
    weight_service: this.fb.group({
      weight_lb: [0, [Validators.required, Validators.min(0)]],
      garments: this.fb.array([])
    }),
    order_items: this.fb.array([]),
    extras: this.fb.array([])
  });

  ngOnInit(): void {
    this.serviceId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.serviceId) {
      this.showError('No se encontró el servicio de lavandería.');
      return;
    }

    this.loadInitialData();
  }

  get weightServiceGroup(): FormGroup {
    return this.form.get('weight_service') as FormGroup;
  }

  get garmentsArray(): FormArray {
    return this.weightServiceGroup.get('garments') as FormArray;
  }

  get orderItemsArray(): FormArray {
    return this.form.get('order_items') as FormArray;
  }

  get extrasArray(): FormArray {
    return this.form.get('extras') as FormArray;
  }

  availableExtras(): LaundryCommercialCatalogExtraItem[] {
    const addedIds = new Set(
      this.extrasArray.controls.map((control) => Number(control.get('extra_id')?.value))
    );

    return this.extrasCatalog.filter((extra) => !addedIds.has(extra.id));
  }

  getExtraName(id: number | null): string {
    if (id == null) {
      return 'Extra';
    }

    return this.extrasCatalog.find((extra) => extra.id === id)?.name ?? 'Extra';
  }

  canAddNote(): boolean {
    return !this.showNotesCard();
  }

  isMobileViewport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 767px)').matches;
  }

  bottomNavigationActions(): BottomNavigationAction[] {
    const actions: BottomNavigationAction[] = [
      {
        id: 'add-service',
        label: 'Servicio',
        icon: 'pi pi-plus',
        severity: 'secondary',
        mobileMode: 'more',
        disabled: this.isLoading()
      },
      {
        id: 'add-extra',
        label: 'Extras',
        icon: 'pi pi-plus',
        severity: 'secondary',
        mobileMode: 'more',
        disabled: this.isLoading() || this.extrasCatalog.length === 0
      },
      {
        id: 'save',
        label: 'Guardar',
        icon: 'pi pi-save',
        mobileMode: 'primary',
        loading: this.isLoading(),
        disabled: this.isLoading()
      }
    ];

    if (this.canAddNote()) {
      actions.splice(2, 0, {
        id: 'add-note',
        label: 'Nota',
        icon: 'pi pi-file-edit',
        severity: 'secondary',
        mobileMode: 'more',
        disabled: this.isLoading()
      });
    }

    return actions;
  }

  availableServices(): LaundryCommercialCatalogServiceItem[] {
    const search = this.normalizedServiceSearchTerm();
    const selectedIds = new Set(
      this.orderItemsArray.controls.map((control) => Number(control.get('service_id')?.value))
    );

    return this.serviceCatalog.filter((service) => {
      const mode = service.pricing_mode?.toUpperCase();
      const matchesSearch = search.length < 3 || service.name.toLowerCase().includes(search);

      return !selectedIds.has(service.id)
        && (mode !== 'WEIGHT' || !this.showWeightService())
        && matchesSearch;
    });
  }

  normalizedServiceSearchTerm(): string {
    return this.serviceSearchTerm.trim().toLowerCase();
  }

  shouldShowServiceSearchHint(): boolean {
    const length = this.normalizedServiceSearchTerm().length;
    return length > 0 && length < 3;
  }

  availableGarmentTypes(): LaundryGarmentType[] {
    const search = this.normalizedGarmentSearchTerm();
    const addedIds = new Set(
      this.garmentsArray.controls.map((control) => Number(control.get('garment_type_id')?.value))
    );

    return this.garmentTypes.filter((garmentType) => {
      if (addedIds.has(garmentType.id)) {
        return false;
      }

      return search.length < 3 || garmentType.name.toLowerCase().includes(search);
    });
  }

  getGarmentTypeName(id: number | null): string {
    if (id == null) {
      return 'Prenda';
    }

    return this.garmentTypes.find((garmentType) => garmentType.id === id)?.name ?? 'Prenda';
  }

  normalizedGarmentSearchTerm(): string {
    return this.garmentSearchTerm.trim().toLowerCase();
  }

  shouldShowGarmentSearchHint(): boolean {
    const length = this.normalizedGarmentSearchTerm().length;
    return length > 0 && length < 3;
  }

  selectedServiceName(index: number): string {
    const serviceId = Number(this.orderItemsArray.at(index)?.get('service_id')?.value);
    return this.serviceCatalog.find((service) => service.id === serviceId)?.name ?? 'Servicio';
  }

  serviceGroups(): Array<{ serviceId: number; indexes: number[] }> {
    const groups = new Map<number, number[]>();

    this.orderItemsArray.controls.forEach((_, index) => {
      const serviceId = Number(this.orderItemsArray.at(index)?.get('service_id')?.value);
      if (!serviceId) {
        return;
      }

      const current = groups.get(serviceId) ?? [];
      current.push(index);
      groups.set(serviceId, current);
    });

    return Array.from(groups.entries()).map(([serviceId, indexes]) => ({ serviceId, indexes }));
  }

  serviceGroupTitle(serviceId: number): string {
    return this.serviceCatalog.find((service) => service.id === serviceId)?.name ?? 'Servicio';
  }

  canAddMoreVariants(serviceId: number): boolean {
    const service = this.serviceCatalog.find((item) => item.id === serviceId);
    if (service?.pricing_mode?.toUpperCase() !== 'FIXED') {
      return false;
    }

    const variants = this.serviceVariants[serviceId];
    if (!variants || variants.length <= 1) {
      return false;
    }

    return this.getRemainingVariantsForService(serviceId, variants).length > 0;
  }

  serviceGroupHasMultipleVariants(indexes: number[]): boolean {
    return indexes.length > 1;
  }

  selectedVariantName(index: number): string {
    const serviceId = Number(this.orderItemsArray.at(index)?.get('service_id')?.value);
    const variantId = Number(this.orderItemsArray.at(index)?.get('service_variant_id')?.value);
    if (!serviceId || !variantId) {
      return 'Precio único';
    }

    return this.serviceVariants[serviceId]?.find((variant) => variant.id === variantId)?.name ?? 'Variante';
  }

  selectedServiceMode(index: number): string {
    const serviceId = Number(this.orderItemsArray.at(index)?.get('service_id')?.value);
    return this.serviceCatalog.find((service) => service.id === serviceId)?.pricing_mode?.toUpperCase() ?? 'FIXED';
  }

  variantsFor(index: number): LaundryCommercialCatalogVariantItem[] {
    const serviceId = Number(this.orderItemsArray.at(index)?.get('service_id')?.value);
    return this.serviceVariants[serviceId] ?? [];
  }

  servicePanelValue(index: number): string {
    const serviceId = Number(this.orderItemsArray.at(index)?.get('service_id')?.value);
    return `service-${serviceId}`;
  }

  removeServiceGroup(serviceId: number): void {
    const indexesToRemove = this.orderItemsArray.controls
      .map((_, index) => index)
      .filter((index) => Number(this.orderItemsArray.at(index)?.get('service_id')?.value) === serviceId)
      .sort((a, b) => b - a);

    indexesToRemove.forEach((index) => this.orderItemsArray.removeAt(index));
    this.removeAccordionValue(`service-${serviceId}`);
    this.promptServicePickerWhenOnlyReadOnlyItems();
    this.notifyPendingSaveChanges();
  }

  onAccordionValueChange(value: string | number | string[] | number[]): void {
    const values = Array.isArray(value) ? value : [value];
    this.activeAccordionValues.set(values.map((item) => String(item)));
  }

  openServicePicker(): void {
    this.resetServicePicker();
    this.servicePickerMode = 'service';
    this.showServicePicker = true;
  }

  openAdditionalVariantsPicker(serviceId: number): void {
    const service = this.serviceCatalog.find((item) => item.id === serviceId);
    if (!service) {
      this.showError('No se encontró el servicio seleccionado.');
      return;
    }

    const cachedVariants = this.serviceVariants[service.id];
    if (cachedVariants) {
      this.handleAdditionalVariantSelection(service, cachedVariants);
      return;
    }

    this.setBusy(true, 'Cargando variantes...');
    this.catalogService.listVariantsByService(service.id).pipe(
      catchError(() => {
        this.showError('No se pudieron cargar las variantes.');
        return of([]);
      }),
      finalize(() => this.setBusy(false))
    ).subscribe((variants) => {
      this.serviceVariants = {
        ...this.serviceVariants,
        [service.id]: variants
      };
      this.handleAdditionalVariantSelection(service, variants);
    });
  }

  closeServicePicker(): void {
    this.showServicePicker = false;
    this.resetServicePicker();
  }

  openExtraPicker(): void {
    this.showExtraPicker = true;
  }

  closeExtraPicker(): void {
    this.showExtraPicker = false;
  }

  openGarmentPicker(): void {
    this.resetGarmentPicker();
    this.showGarmentPicker = true;
  }

  closeGarmentPicker(): void {
    this.showGarmentPicker = false;
    this.resetGarmentPicker();
  }

  selectGarmentType(garmentType: LaundryGarmentType): void {
    this.selectedGarmentType = garmentType;
  }

  changeSelectedGarment(): void {
    this.selectedGarmentType = null;
  }

  confirmGarmentSelection(): void {
    if (!this.selectedGarmentType) {
      this.showError('Selecciona una prenda.');
      return;
    }

    const duplicate = this.garmentsArray.controls.some(
      (control) => Number(control.get('garment_type_id')?.value) === this.selectedGarmentType!.id
    );
    if (duplicate) {
      this.showError('Esta prenda ya está en el desglose.');
      return;
    }

    const quantity = Number(this.garmentDraftQuantity ?? 0);
    if (!Number.isFinite(quantity) || quantity < 1) {
      this.showError('La cantidad debe ser mayor o igual a 1.');
      return;
    }

    this.garmentsArray.push(this.createGarmentGroup({
      garment_type_id: this.selectedGarmentType.id,
      quantity
    }));
    this.notifyPendingSaveChanges();

    this.showGarmentPicker = false;
    this.resetGarmentPicker();
  }

  addServiceFromList(service: LaundryCommercialCatalogServiceItem): void {
    if (service.pricing_mode?.toUpperCase() === 'WEIGHT') {
      this.showWeightService.set(true);
      this.addAccordionValue('weight');
      this.notifyPendingSaveChanges();
      this.closeServicePicker();
      return;
    }

    this.prepareServiceSelection(service);
  }

  updateServiceVariantQuantity(variantId: number, value: number | null): void {
    this.serviceVariantQuantities = {
      ...this.serviceVariantQuantities,
      [variantId]: value == null ? null : Number(value)
    };
  }

  backToServiceList(): void {
    this.selectedServiceForPicker = null;
    this.selectedServiceVariants = [];
    this.serviceVariantQuantities = {};
    this.servicePickerPreviewItems = [];
    this.servicePickerStep = 'list';
  }

  reviewVariantSelection(): void {
    const previewItems = this.selectedServiceVariants
      .map((variant) => ({
        variant,
        quantity: Number(this.serviceVariantQuantities[variant.id] ?? 0)
      }))
      .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

    if (previewItems.length === 0) {
      this.showError('Ingresa al menos una cantidad para continuar.');
      return;
    }

    this.servicePickerPreviewItems = previewItems;
    this.servicePickerStep = 'preview';
  }

  shouldSkipServicePreview(): boolean {
    return this.servicePickerMode === 'service' && this.selectedServiceVariants.length <= 1;
  }

  canChangeSelectedService(): boolean {
    return this.servicePickerMode === 'service' && !this.shouldSkipServicePreview();
  }

  submitVariantSelection(): void {
    if (this.shouldSkipServicePreview()) {
      this.confirmVariantSelectionFromDrafts();
      return;
    }

    this.reviewVariantSelection();
  }

  editVariantSelection(): void {
    this.servicePickerStep = 'variants';
  }

  confirmVariantSelectionFromDrafts(): void {
    this.servicePickerPreviewItems = this.selectedServiceVariants
      .map((variant) => ({
        variant,
        quantity: Number(this.serviceVariantQuantities[variant.id] ?? 0)
      }))
      .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

    if (this.servicePickerPreviewItems.length === 0) {
      this.showError('Ingresa al menos una cantidad para continuar.');
      return;
    }

    this.confirmVariantSelection();
  }

  confirmVariantSelection(): void {
    if (!this.selectedServiceForPicker || this.servicePickerPreviewItems.length === 0) {
      this.showError('No hay variantes seleccionadas para agregar.');
      return;
    }

    const serviceId = this.selectedServiceForPicker.id;

    this.servicePickerPreviewItems.forEach(({ variant, quantity }) => {
      this.addService(this.selectedServiceForPicker!, {
        service_variant_id: variant.id,
        quantity,
        unit_catalog_price: this.toMoneyString(variant.catalog_price)
      }, false);
    });
    this.notifyPendingSaveChanges();
    this.scrollToServicePanel(serviceId);

    this.closeServicePicker();
  }

  addService(
    service: LaundryCommercialCatalogServiceItem,
    item?: Partial<LaundryServiceSummaryItem>,
    scrollToPanel = false
  ): void {
    this.orderItemsArray.push(this.createOrderItemGroup(service, item));
    this.ensureVariantsLoaded(service.id);
    this.addAccordionValue(`service-${service.id}`);

    if (scrollToPanel) {
      this.scrollToServicePanel(service.id);
    }
  }

  removeService(index: number): void {
    const panelValue = this.servicePanelValue(index);
    this.orderItemsArray.removeAt(index);
    this.removeAccordionValue(panelValue);
    this.promptServicePickerWhenOnlyReadOnlyItems();
    this.notifyPendingSaveChanges();
  }

  removeWeightService(): void {
    this.showWeightService.set(false);
    this.removeAccordionValue('weight');
    this.garmentsArray.clear();
    this.weightServiceGroup.patchValue({
      weight_lb: 0
    });
    this.promptServicePickerWhenOnlyReadOnlyItems();
    this.notifyPendingSaveChanges();
  }

  removeGarment(index: number): void {
    this.garmentsArray.removeAt(index);
    this.notifyPendingSaveChanges();
  }

  addExtra(extra?: LaundryCommercialCatalogExtraItem): void {
    const selectedExtra = extra ?? this.extrasCatalog[0];
    if (!selectedExtra) {
      this.showError('No hay extras activos disponibles.');
      return;
    }

    const duplicate = this.extrasArray.controls.some(
      (control) => Number(control.get('extra_id')?.value) === selectedExtra.id
    );
    if (duplicate) {
      this.showError('Este extra ya fue agregado.');
      return;
    }

    this.extrasArray.push(this.createExtraGroup(selectedExtra));
  }

  addExtraFromList(extra: LaundryCommercialCatalogExtraItem): void {
    this.addExtra(extra);
    this.notifyPendingSaveChanges();
    this.closeExtraPicker();
  }

  onBottomNavigationAction(actionId: string): void {
    switch (actionId) {
      case 'add-service':
        this.openServicePicker();
        break;
      case 'add-extra':
        this.openExtraPicker();
        break;
      case 'add-note':
        this.showNotesAndScroll();
        break;
      case 'save':
        this.save();
        break;
      default:
        break;
    }
  }

  onExtraChange(index: number): void {
    const control = this.extrasArray.at(index) as FormGroup;
    const extraId = Number(control.get('extra_id')?.value);
    const extra = this.extrasCatalog.find((item) => item.id === extraId);

    if (!extra) {
      return;
    }

    control.patchValue({
      unit_price: this.toMoneyString(extra.default_unit_price)
    });
  }

  onVariantChange(index: number): void {
    const control = this.orderItemsArray.at(index) as FormGroup;
    const variantPrice = this.resolveVariantPrice(control);

    if (variantPrice == null) {
      return;
    }

    control.patchValue({
      unit_catalog_price: this.toMoneyString(variantPrice)
    });
  }

  removeExtra(index: number): void {
    this.extrasArray.removeAt(index);
    this.notifyPendingSaveChanges();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showError('Revisa los campos requeridos antes de guardar.');
      return;
    }

    const payload = this.buildPayload();
    this.setBusy(true, 'Guardando captura comercial...');

    this.laundryService.updateCommercialDetail(this.serviceId, payload).pipe(
      finalize(() => this.setBusy(false))
    ).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.patchFormFromSummary(summary);
        this.showSuccess('Captura comercial guardada.');
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 409) {
          this.showError('Alguien mas ha editado esta orden de trabajo, por favor, refresca tu navegador');
          return;
        }

        this.showError('No se pudo guardar. Revisa conexión o intenta de nuevo.');
      }
    });
  }

  private showNotesAndScroll(): void {
    this.showNotesCard.set(true);

    setTimeout(() => {
      this.document.getElementById('notes-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 220);
  }

  private scrollToServicePanel(serviceId: number): void {
    setTimeout(() => {
      this.document.getElementById(`service-panel-${serviceId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 220);
  }

  private loadInitialData(): void {
    this.setBusy(true, 'Cargando captura comercial...');

    forkJoin({
      summary: this.laundryService.getSummary(this.serviceId),
      garmentTypes: this.garmentTypesService.getAll(),
      services: this.catalogService.listManualServices(),
      extras: this.catalogService.listExtras()
    }).pipe(
      catchError((error) => {
        const message = error?.status === 404
          ? 'Servicio no encontrado.'
          : 'No se pudo cargar la captura comercial.';
        this.showError(message);

        return of(null);
      }),
      finalize(() => this.setBusy(false))
    ).subscribe((result) => {
      if (!result) {
        return;
      }

      this.summary = result.summary;
      this.garmentTypes = result.garmentTypes.filter((item) => item.active !== false);
      this.serviceCatalog = result.services;
      this.extrasCatalog = result.extras.filter((item) => item.is_active !== false);
      this.patchFormFromSummary(result.summary);
    });
  }

  private patchFormFromSummary(summary: LaundryServiceSummaryResponse): void {
    this.suppressPendingSaveNotice = true;
    this.garmentsArray.clear();
    this.orderItemsArray.clear();
    this.extrasArray.clear();
    this.form.patchValue({
      notes: summary.laundry_service.notes ?? ''
    });
    this.showNotesCard.set(this.showNotesCard() || Boolean(summary.laundry_service.notes?.trim()));

    const weightDetail = summary.weight_service_detail;
    this.showWeightService.set(Boolean(weightDetail));
    if (this.showWeightService()) {
      this.addAccordionValue('weight');
    } else {
      this.removeAccordionValue('weight');
    }
    this.weightServiceGroup.patchValue({
      weight_lb: Number(weightDetail?.weight_lb ?? 0)
    });

    (weightDetail?.garments ?? []).forEach((garment) => {
      this.garmentsArray.push(this.createGarmentGroup({
        garment_type_id: Number(garment.garment_type_id),
        quantity: Number(garment.quantity ?? 1)
      }));
    });

    summary.manual_items.forEach((item) => {
      const service = this.serviceCatalog.find((catalogItem) => catalogItem.id === item.service_id);
      if (!service) {
        return;
      }

      this.addService(service, item);
    });

    summary.extras.forEach((item) => {
      const extra = this.extrasCatalog.find((catalogItem) => catalogItem.id === item.extra_id);
      if (!extra) {
        return;
      }

      this.extrasArray.push(this.createExtraGroup(extra, item));
    });

    this.promptServicePickerWhenOnlyReadOnlyItems();
    this.suppressPendingSaveNotice = false;
  }

  private ensureVariantsLoaded(serviceId: number): void {
    if (this.serviceVariants[serviceId]) {
      return;
    }

    this.setBusy(true, 'Cargando variantes...');
    this.catalogService.listVariantsByService(serviceId).pipe(
      catchError(() => {
        this.showError('No se pudieron cargar las variantes.');
        return of([]);
      }),
      finalize(() => this.setBusy(false))
    ).subscribe((variants) => {
      this.serviceVariants = {
        ...this.serviceVariants,
        [serviceId]: variants
      };
      this.syncVariantPricesForService(serviceId);
    });
  }

  private prepareServiceSelection(service: LaundryCommercialCatalogServiceItem): void {
    const cachedVariants = this.serviceVariants[service.id];
    if (cachedVariants) {
      this.handleServiceSelection(service, cachedVariants);
      return;
    }

    this.setBusy(true, 'Cargando variantes...');
    this.catalogService.listVariantsByService(service.id).pipe(
      catchError(() => {
        this.showError('No se pudieron cargar las variantes.');
        return of([]);
      }),
      finalize(() => this.setBusy(false))
    ).subscribe((variants) => {
      this.serviceVariants = {
        ...this.serviceVariants,
        [service.id]: variants
      };
      this.handleServiceSelection(service, variants);
    });
  }

  private handleServiceSelection(
    service: LaundryCommercialCatalogServiceItem,
    variants: LaundryCommercialCatalogVariantItem[]
  ): void {
    this.selectedServiceForPicker = service;
    this.selectedServiceVariants = variants;
    this.serviceVariantQuantities = Object.fromEntries(
      variants.map((variant) => [variant.id, null])
    );
    this.servicePickerPreviewItems = [];
    this.servicePickerStep = 'variants';
  }

  private handleAdditionalVariantSelection(
    service: LaundryCommercialCatalogServiceItem,
    variants: LaundryCommercialCatalogVariantItem[]
  ): void {
    const remainingVariants = this.getRemainingVariantsForService(service.id, variants);
    if (remainingVariants.length === 0) {
      this.showError('Este servicio ya tiene todas sus variantes agregadas.');
      return;
    }

    this.showServicePicker = true;
    this.servicePickerMode = 'variant';
    this.selectedServiceForPicker = service;
    this.selectedServiceVariants = remainingVariants;
    this.serviceVariantQuantities = Object.fromEntries(
      remainingVariants.map((variant) => [variant.id, null])
    );
    this.servicePickerPreviewItems = [];
    this.servicePickerStep = 'variants';
  }

  private createOrderItemGroup(
    service: LaundryCommercialCatalogServiceItem,
    item?: Partial<LaundryServiceSummaryItem>
  ): FormGroup {
    const unitCatalogPrice = this.toMoneyString(
      item?.unit_catalog_price ?? service.default_catalog_price
    );

    return this.fb.group({
      service_id: [service.id, Validators.required],
      service_variant_id: [item?.service_variant_id ?? null],
      quantity: [Number(item?.quantity ?? 1), [Validators.required, Validators.min(1)]],
      unit_catalog_price: [unitCatalogPrice, Validators.required],
      is_friendly_discount: [false]
    });
  }

  private createGarmentGroup(item?: { garment_type_id: number | null; quantity: number }): FormGroup {
    return this.fb.group({
      garment_type_id: [item?.garment_type_id ?? null, Validators.required],
      quantity: [Number(item?.quantity ?? 1), [Validators.required, Validators.min(1)]]
    });
  }

  private createExtraGroup(
    extra: LaundryCommercialCatalogExtraItem,
    item?: { extra_id: number; quantity: number; unit_price: string | number; is_courtesy: boolean }
  ): FormGroup {
    return this.fb.group({
      extra_id: [item?.extra_id ?? extra.id, Validators.required],
      quantity: [Number(item?.quantity ?? 1), [Validators.required, Validators.min(1)]],
      unit_price: [this.toMoneyString(item?.unit_price ?? extra.default_unit_price), Validators.required],
      is_courtesy: [false]
    });
  }

  private buildPayload(): LaundryServiceCommercialDetailPayload {
    return {
      expected_updated_at: this.summary?.laundry_service.updated_at ?? null,
      notes: String(this.form.get('notes')?.value ?? '').trim() || null,
      weight_service: this.showWeightService()
        ? {
            weight_lb: Number(this.weightServiceGroup.get('weight_lb')?.value ?? 0),
            garments: this.garmentsArray.controls.map((control) => ({
              garment_type_id: Number(control.get('garment_type_id')?.value),
              quantity: Number(control.get('quantity')?.value)
            }))
          }
        : null,
      order_items: this.orderItemsArray.controls.map((control) => ({
        service_id: Number(control.get('service_id')?.value),
        service_variant_id: control.get('service_variant_id')?.value
          ? Number(control.get('service_variant_id')?.value)
          : null,
        quantity: Number(control.get('quantity')?.value),
        unit_catalog_price: this.resolveOrderItemUnitCatalogPrice(control),
        is_friendly_discount: false
      })),
      extras: this.extrasArray.controls.map((control) => ({
        extra_id: Number(control.get('extra_id')?.value),
        quantity: Number(control.get('quantity')?.value),
        unit_price: String(control.get('unit_price')?.value ?? '0.00'),
        is_courtesy: false
      }))
    };
  }

  private promptServicePickerWhenOnlyReadOnlyItems(): void {
    if (this.showWeightService() || this.orderItemsArray.length > 0 || this.serviceCatalog.length === 0) {
      return;
    }

    this.openServicePicker();
  }

  private syncVariantPricesForService(serviceId: number): void {
    this.orderItemsArray.controls.forEach((control) => {
      if (Number(control.get('service_id')?.value) !== serviceId) {
        return;
      }

      const variantPrice = this.resolveVariantPrice(control);
      if (variantPrice == null) {
        return;
      }

      control.patchValue({
        unit_catalog_price: this.toMoneyString(variantPrice)
      }, { emitEvent: false });
    });
  }

  private resolveOrderItemUnitCatalogPrice(control: AbstractControl): string {
    const variantPrice = this.resolveVariantPrice(control);
    if (variantPrice != null) {
      return this.toMoneyString(variantPrice);
    }

    return String(control.get('unit_catalog_price')?.value ?? '0.00');
  }

  private resolveVariantPrice(control: AbstractControl): number | null {
    const serviceId = Number(control.get('service_id')?.value);
    const variantId = Number(control.get('service_variant_id')?.value);

    if (!serviceId || !variantId) {
      return null;
    }

    const variant = this.serviceVariants[serviceId]?.find((item) => item.id === variantId);
    if (!variant) {
      return null;
    }

    return Number.isFinite(variant.catalog_price) ? variant.catalog_price : 0;
  }

  private getRemainingVariantsForService(
    serviceId: number,
    variants: LaundryCommercialCatalogVariantItem[]
  ): LaundryCommercialCatalogVariantItem[] {
    const selectedVariantIds = new Set(
      this.orderItemsArray.controls
        .filter((control) => Number(control.get('service_id')?.value) === serviceId)
        .map((control) => Number(control.get('service_variant_id')?.value))
        .filter((variantId) => Boolean(variantId))
    );

    return variants.filter((variant) => !selectedVariantIds.has(variant.id));
  }

  private addAccordionValue(value: string): void {
    const current = this.activeAccordionValues();
    if (current.includes(value)) {
      return;
    }

    this.activeAccordionValues.set([...current, value]);
  }

  private removeAccordionValue(value: string): void {
    this.activeAccordionValues.set(this.activeAccordionValues().filter((item) => item !== value));
  }

  private setBusy(value: boolean, text?: string): void {
    this.isLoading.set(value);

    if (value) {
      this.dialogLoadingService.show(text);
      return;
    }

    this.dialogLoadingService.hide();
  }

  private resetGarmentPicker(): void {
    this.garmentSearchTerm = '';
    this.garmentDraftQuantity = 1;
    this.selectedGarmentType = null;
  }

  private resetServicePicker(): void {
    this.serviceSearchTerm = '';
    this.servicePickerMode = 'service';
    this.selectedServiceForPicker = null;
    this.selectedServiceVariants = [];
    this.serviceVariantQuantities = {};
    this.servicePickerPreviewItems = [];
    this.servicePickerStep = 'list';
  }

  private toMoneyString(value: string | number | null | undefined): string {
    return Number(value ?? 0).toFixed(2);
  }

  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Listo', detail });
  }

  private notifyPendingSaveChanges(): void {
    if (this.suppressPendingSaveNotice) {
      return;
    }

    this.messageService.clear('pending-save');
    this.messageService.add({
      key: 'pending-save',
      severity: 'info',
      summary: 'Cambios pendientes',
      detail: 'Haz clic en Guardar para que los cambios se guarden correctamente.',
      life: 5000
    });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }
}
