import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, ViewEncapsulation, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { LaundryGarmentType } from '@shared/interfaces/laundry-garment-type.interface';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';
import { LaundryServiceExtraType, LaundryServiceResp, LaundryUnitType } from '@shared/interfaces/laundry-service.interface';
import { LaundryGarmentTypesService } from '@shared/services/laundry/laundry-garment-types.service';
import { LaundryServiceExtraTypesService } from '@shared/services/laundry/laundry-service-extra-types.service';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { ServicePriceOption } from '@modules/laundry-commerce/interfaces/service-price-option.interface';
import { LaundryCommercialService } from '@modules/laundry-commerce/interfaces/service.interface';
import { ServicesApiService } from '@modules/laundry-commerce/services/services-api.service';

type GarmentCategory = NonNullable<LaundryGarmentType['category']>;

type GarmentSection = {
  key: GarmentCategory;
  label: string;
  description: string;
  items: LaundryGarmentType[];
};

type SpecialSection = {
  key: string;
  label: string;
  description: string;
  items: LaundryCommercialService[];
};

@Component({
  selector: 'app-laundry-form-preview',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AccordionModule,
    CardModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
    TooltipModule,
    ProgressSpinnerModule,
    BackButtonComponent,
    TruncatePipe
  ],
  templateUrl: './form-preview.component.html',
  styleUrl: './form-preview.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class FormPreviewComponent implements OnInit, OnDestroy {
  readonly loading = signal(true);
  readonly isMobile = signal(this.checkIsMobile());
  readonly payloadDialogVisible = signal(false);
  readonly specialPriceDialogVisible = signal(false);
  readonly selectedItemsDialogVisible = signal(false);
  readonly fabPulse = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly service = signal<LaundryServiceResp | null>(null);
  readonly garmentTypes = signal<LaundryGarmentType[]>([]);
  readonly extraTypes = signal<LaundryServiceExtraType[]>([]);
  readonly commercialServices = signal<LaundryCommercialService[]>([]);
  readonly garmentSections = signal<GarmentSection[]>([]);
  readonly specialSections = signal<SpecialSection[]>([]);
  readonly mainAccordionValues = signal<number[]>([]);
  readonly activeSpecialService = signal<LaundryCommercialService | null>(null);
  private formSelectionSubscription?: Subscription;

  readonly categoryOrder: GarmentCategory[] = ['CLOTHING', 'BEDDING', 'FOOTWEAR', 'PLUSH', 'RUG', 'HOUSEHOLD'];
  readonly categoryLabels: Record<GarmentCategory, { label: string; description: string }> = {
    CLOTHING: {
      label: 'Prendas por conteo',
      description: 'Ropa del dia a dia, interiores, camisas, pantalones y piezas frecuentes.'
    },
    BEDDING: {
      label: 'Ropa de cama',
      description: 'Toallas, sabanas, fundas, edredones y piezas de cama.'
    },
    FOOTWEAR: {
      label: 'Calzado',
      description: 'Captura por pares u otras piezas relacionadas con zapatos.'
    },
    PLUSH: {
      label: 'Peluches',
      description: 'Articulos delicados o suaves que requieren control individual.'
    },
    RUG: {
      label: 'Alfombras y tapetes',
      description: 'Tapetes, alfombras y piezas de piso con manejo especial.'
    },
    HOUSEHOLD: {
      label: 'Hogar y otros',
      description: 'Piezas del hogar y articulos fuera de las categorias principales.'
    }
  };

  readonly categoryEmojis: Record<GarmentCategory, string> = {
    CLOTHING: '👕',
    BEDDING: '🛏️',
    FOOTWEAR: '👟',
    PLUSH: '🧸',
    RUG: '🪄',
    HOUSEHOLD: '🏠'
  };

  readonly form: FormGroup;
  readonly specialSectionOrder: Array<{ key: string; label: string; description: string }> = [
    {
      key: 'home-volume',
      label: 'Hogar y volumen',
      description: 'Piezas grandes o de alto volumen para captura comercial separada.'
    },
    {
      key: 'formal-wear',
      label: 'Ropa Formal',
      description: 'Prendas delicadas o de evento con precio fijo sugerido.'
    },
    {
      key: 'accessories',
      label: 'Accesorios',
      description: 'Zapatos, mochilas, gorras y otros articulos especiales.'
    },
    {
      key: 'separate-wash',
      label: 'Lavado por separado',
      description: 'Servicios comerciales asociados a lavado especial o separado.'
    },
    {
      key: 'ironing',
      label: 'Planchado',
      description: 'Servicios de planchado y acabados complementarios.'
    }
  ];

  readonly payloadPreview = computed(() => this.buildPreviewPayload());
  readonly selectedItemsCount = signal(0);
  private previousSelectedItemsCount = 0;
  private fabPulseTimeoutId: number | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder,
    private readonly laundryService: LaundryService,
    private readonly garmentTypesService: LaundryGarmentTypesService,
    private readonly extraTypesService: LaundryServiceExtraTypesService,
    private readonly servicesApi: ServicesApiService
  ) {
    this.form = this.fb.group({
      weight_lb: [null as number | null],
      notes: [''],
      garments: this.fb.group({}),
      extras: this.fb.group({}),
      special_items: this.fb.array([]),
      special_item_selector: this.fb.group({
        selected_price_option_id: [null as number | null],
        quantity: [1]
      })
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.loading.set(false);
      this.errorMessage.set('No se encontro el servicio para esta prueba.');
      return;
    }

    forkJoin({
      service: this.laundryService.getById(id),
      garmentTypes: this.garmentTypesService.getAll(),
      extraTypes: this.extraTypesService.getAll(),
      commercialServices: this.servicesApi.list({ is_active: true })
    }).subscribe({
      next: ({ service, garmentTypes, extraTypes, commercialServices }) => {
        const activeGarmentTypes = garmentTypes.filter((item) => item.active !== false);
        const activeExtraTypes = extraTypes.filter((item) => item.active !== false);
        const activeCommercialServices = commercialServices.items.filter((item) => item.is_active !== false);

        this.service.set(service);
        this.garmentTypes.set(activeGarmentTypes);
        this.extraTypes.set(activeExtraTypes);
        this.commercialServices.set(activeCommercialServices);
        this.buildForm(service, activeGarmentTypes, activeExtraTypes);
        this.garmentSections.set(this.buildGarmentSections(activeGarmentTypes));
        this.specialSections.set(this.buildSpecialSections(activeCommercialServices));
        this.mainAccordionValues.set(this.getDefaultMainAccordionValues());
        this.bindSelectionTracking();
        this.refreshSelectedItemsState();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se pudo cargar la propuesta del formulario.');
      }
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.isMobile.set(this.checkIsMobile());
  }

  ngOnDestroy(): void {
    this.formSelectionSubscription?.unsubscribe();
    if (this.fabPulseTimeoutId) {
      clearTimeout(this.fabPulseTimeoutId);
    }
  }

  get garmentsGroup(): FormGroup {
    return this.form.get('garments') as FormGroup;
  }

  get extrasGroup(): FormGroup {
    return this.form.get('extras') as FormGroup;
  }

  get specialItemsArray(): FormArray {
    return this.form.get('special_items') as FormArray;
  }

  get specialItemSelectorGroup(): FormGroup {
    return this.form.get('special_item_selector') as FormGroup;
  }

  garmentKey(id: number): string {
    return `garment_${id}`;
  }

  extraKey(id: number): string {
    return `extra_${id}`;
  }

  getGarmentGroup(id: number): FormGroup {
    return this.garmentsGroup.get(this.garmentKey(id)) as FormGroup;
  }

  getExtraGroup(id: number): FormGroup {
    return this.extrasGroup.get(this.extraKey(id)) as FormGroup;
  }

  getSpecialItemsBySection(section: SpecialSection): Array<{ index: number; group: FormGroup; service: LaundryCommercialService | null }> {
    return this.specialItemsArray.controls
      .map((control, index) => ({
        index,
        group: control as FormGroup,
        service: this.findCommercialService((control as FormGroup).get('service_id')?.value)
      }))
      .filter(({ service }) => service !== null && this.resolveSpecialSectionKey(service) === section.key);
  }

  addSpecialItem(service: LaundryCommercialService): void {
    const priceOptions = this.getActivePriceOptions(service);

    if (priceOptions.length <= 1) {
      this.specialItemsArray.push(this.createSpecialItemGroup(service));
      return;
    }

    const defaultOption = priceOptions.find((item) => item.is_default) ?? priceOptions[0];
    this.activeSpecialService.set(service);
    this.specialItemSelectorGroup.patchValue({
      selected_price_option_id: defaultOption?.id ?? null,
      quantity: 1
    });
    this.specialPriceDialogVisible.set(true);
  }

  removeSpecialItem(index: number): void {
    this.specialItemsArray.removeAt(index);
  }

  confirmSpecialItemSelection(): void {
    const service = this.activeSpecialService();
    if (!service) {
      return;
    }

    const quantity = this.toNumber(this.specialItemSelectorGroup.get('quantity')?.value);
    if (quantity <= 0) {
      return;
    }

    const selectedOptionId = this.toNullableNumber(this.specialItemSelectorGroup.get('selected_price_option_id')?.value);
    this.specialItemsArray.push(this.createSpecialItemGroup(service, selectedOptionId, quantity));
    this.closeSpecialPriceDialog();
  }

  closeSpecialPriceDialog(): void {
    this.specialPriceDialogVisible.set(false);
    this.activeSpecialService.set(null);
    this.specialItemSelectorGroup.reset({
      selected_price_option_id: null,
      quantity: 1
    });
  }

  getClientName(): string {
    return this.service()?.client?.name ?? 'Cliente no definido';
  }

  getAddressText(): string {
    return this.service()?.client_address?.address_text ?? 'Sin direccion registrada';
  }

  getServiceLabel(): string {
    return this.service()?.service_label === 'EXPRESS' ? 'Express' : 'Normal';
  }

  getGarmentSubtotal(id: number): number {
    const group = this.getGarmentGroup(id);
    return this.calculateSubtotal(group.get('quantity')?.value, group.get('unit_price')?.value);
  }

  getExtraSubtotal(id: number): number {
    const group = this.getExtraGroup(id);
    return this.calculateSubtotal(group.get('quantity')?.value, group.get('unit_price')?.value);
  }

  getGarmentQuantityCount(): number {
    return this.garmentTypes().reduce(
      (total, item) => total + this.toNumber(this.getGarmentGroup(item.id).get('quantity')?.value),
      0
    );
  }

  getGarmentSelectedCount(): number {
    return this.garmentTypes().filter((item) => this.toNumber(this.getGarmentGroup(item.id).get('quantity')?.value) > 0).length;
  }

  getGarmentDraftTotal(): number {
    return this.garmentTypes().reduce((total, item) => total + this.getGarmentSubtotal(item.id), 0);
  }

  getCategoryBadge(section: GarmentSection): number {
    return section.items.reduce((total, item) => total + this.toNumber(this.getGarmentGroup(item.id).get('quantity')?.value), 0);
  }

  getCategorySubtotal(section: GarmentSection): number {
    return section.items.reduce((total, item) => total + this.getGarmentSubtotal(item.id), 0);
  }

  getExtrasBadge(): number {
    return this.extraTypes().reduce((total, item) => total + this.toNumber(this.getExtraGroup(item.id).get('quantity')?.value), 0);
  }

  getExtrasSelectedCount(): number {
    return this.extraTypes().filter((item) => this.toNumber(this.getExtraGroup(item.id).get('quantity')?.value) > 0).length;
  }

  getExtrasSubtotal(): number {
    return this.extraTypes().reduce((total, item) => total + this.getExtraSubtotal(item.id), 0);
  }

  getSpecialItemsSelectedCount(): number {
    return this.specialItemsArray.controls.filter((control) => this.toNumber(control.get('quantity')?.value) > 0).length;
  }

  getSpecialItemsQuantityCount(): number {
    return this.specialItemsArray.controls.reduce((total, control) => total + this.toNumber(control.get('quantity')?.value), 0);
  }

  getSpecialItemsDraftTotal(): number {
    return this.specialItemsArray.controls.reduce(
      (total, control) => total + this.calculateSubtotal(control.get('quantity')?.value, control.get('manual_price')?.value),
      0
    );
  }

  getSpecialSectionBadge(section: SpecialSection): number {
    return this.getSpecialItemsBySection(section).reduce((total, item) => total + this.toNumber(item.group.get('quantity')?.value), 0);
  }

  getCategoryEmoji(category: GarmentCategory): string {
    return this.categoryEmojis[category];
  }

  getGarmentEmoji(type: LaundryGarmentType): string {
    switch (type.category) {
      case 'BEDDING':
        return '🛏️';
      case 'FOOTWEAR':
        return '👟';
      case 'PLUSH':
        return '🧸';
      case 'RUG':
        return '🪄';
      case 'HOUSEHOLD':
        return '🏠';
      case 'CLOTHING':
      default:
        if (/calcetin|calcetines/i.test(type.name)) return '🧦';
        if (/camisa|blusa/i.test(type.name)) return '👕';
        if (/pantal|jean|falda|short|chores/i.test(type.name)) return '👖';
        if (/vestido/i.test(type.name)) return '👗';
        return '🧺';
    }
  }

  getExtraEmoji(extra: LaundryServiceExtraType): string {
    const name = `${extra.code} ${extra.name}`.toUpperCase();
    if (name.includes('IRON')) return '🧺';
    if (name.includes('SCENT')) return '🌸';
    if (name.includes('SOAK')) return '💧';
    if (name.includes('VINEGAR')) return '⚪';
    if (name.includes('SALT')) return '🧂';
    if (name.includes('VANISH')) return '✨';
    return '➕';
  }

  getSpecialServiceEmoji(service: LaundryCommercialService): string {
    const name = service.name.toUpperCase();
    if (name.includes('ALFOMBRA') || name.includes('TAPETE')) return '🧶';
    if (name.includes('VESTIDO')) return '👗';
    if (name.includes('ZAPATO')) return '👞';
    if (name.includes('PLANCH')) return '🔥';
    if (name.includes('MOCHILA')) return '🎒';
    return service.service_type === 'WEIGHT' ? '⚖️' : '⭐';
  }

  getSuggestedPriceLabel(service: LaundryCommercialService): string {
    const suggested = this.getSuggestedCommercialPrice(service);
    return suggested === null ? 'Sin precio sugerido' : `Desde ${this.formatCurrency(suggested)}`;
  }

  getSpecialPriceOptionLabel(option: ServicePriceOption): string {
    return `${option.label} - ${this.formatCurrency(this.toNumber(option.suggested_price))}`;
  }

  getSpecialPriceOptionsForSelect(service: LaundryCommercialService): Array<{ label: string; value: number }> {
    return this.getActivePriceOptions(service).map((option) => ({
      label: this.getSpecialPriceOptionLabel(option),
      value: option.id
    }));
  }

  getSelectedSpecialPriceLabel(): string {
    const service = this.activeSpecialService();
    if (!service) {
      return 'Sin opcion seleccionada';
    }

    const optionId = this.toNullableNumber(this.specialItemSelectorGroup.get('selected_price_option_id')?.value);
    const option = this.getActivePriceOptions(service).find((item) => item.id === optionId);
    return option ? this.getSpecialPriceOptionLabel(option) : 'Sin opcion seleccionada';
  }

  getSpecialItemPriceLabel(group: FormGroup, service: LaundryCommercialService | null): string {
    if (!service) {
      return 'Sin precio sugerido';
    }

    const optionId = this.toNullableNumber(group.get('selected_price_option_id')?.value);
    const option = this.resolvePriceOption(service, optionId);
    return option ? this.getSpecialPriceOptionLabel(option) : this.getSuggestedPriceLabel(service);
  }

  getSelectedGarments(): Array<{ name: string; quantity: number; emoji: string }> {
    return this.garmentTypes()
      .map((type) => ({
        name: type.name,
        emoji: this.getGarmentEmoji(type),
        quantity: this.toNumber(this.getGarmentGroup(type.id).get('quantity')?.value)
      }))
      .filter((item) => item.quantity > 0);
  }

  getSelectedSpecialItems(): Array<{ name: string; quantity: number; priceLabel: string; emoji: string }> {
    return this.specialItemsArray.controls
      .map((control) => {
        const group = control as FormGroup;
        const service = this.findCommercialService(group.get('service_id')?.value);
        return {
          name: String(group.get('service_name')?.value ?? 'Servicio especial'),
          emoji: service ? this.getSpecialServiceEmoji(service) : '⭐',
          quantity: this.toNumber(group.get('quantity')?.value),
          priceLabel: this.getSpecialItemPriceLabel(group, service)
        };
      })
      .filter((item) => item.quantity > 0);
  }

  getSelectedExtras(): Array<{ name: string; quantity: number; emoji: string }> {
    return this.extraTypes()
      .map((type) => ({
        name: type.name,
        emoji: this.getExtraEmoji(type),
        quantity: this.toNumber(this.getExtraGroup(type.id).get('quantity')?.value)
      }))
      .filter((item) => item.quantity > 0);
  }

  getSelectedItemsCount(): number {
    return this.getSelectedGarments().length + this.getSelectedSpecialItems().length + this.getSelectedExtras().length;
  }

  getPickupDateText(): string {
    const value = this.service()?.scheduled_pickup_at;
    if (!value) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-SV', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  getDefaultMainAccordionValues(): number[] {
    return [0, ...this.specialSections().map((_, index) => index + 1), this.specialSections().length + 1];
  }

  onMainAccordionValueChange(value: string | number | string[] | number[]): void {
    const values = Array.isArray(value) ? value : [value];
    this.mainAccordionValues.set(
      values
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))
    );
  }

  private buildForm(
    service: LaundryServiceResp,
    garmentTypes: LaundryGarmentType[],
    extraTypes: LaundryServiceExtraType[]
  ): void {
    this.form.patchValue({
      weight_lb: service.weight_lb ?? null,
      notes: service.notes ?? ''
    });

    garmentTypes.forEach((type) => {
      const existing = service.items?.find((item) => item.garment_type_id === type.id);

      this.garmentsGroup.addControl(this.garmentKey(type.id), this.fb.group({
        garment_type_id: [type.id],
        quantity: [existing?.quantity ?? null],
        unit_type: [existing?.unit_type ?? type.default_unit_type ?? 'UNIT'],
        unit_price: [existing?.unit_price ?? type.default_unit_price ?? null],
        notes: [existing?.notes ?? '']
      }));
    });

    extraTypes.forEach((type) => {
      const existing = service.extras?.find((extra) => extra.service_extra_type_id === type.id);

      this.extrasGroup.addControl(this.extraKey(type.id), this.fb.group({
        service_extra_type_id: [type.id],
        quantity: [existing?.quantity ?? null],
        unit_price: [existing?.unit_price ?? type.default_unit_price ?? null],
        notes: [existing?.notes ?? '']
      }));
    });
  }

  private buildGarmentSections(types: LaundryGarmentType[]): GarmentSection[] {
    return this.categoryOrder
      .map((category) => ({
        key: category,
        label: this.categoryLabels[category].label,
        description: this.categoryLabels[category].description,
        items: types
          .filter((item) => (item.category ?? 'CLOTHING') === category)
          .sort((a, b) => (a.display_order ?? 9999) - (b.display_order ?? 9999) || a.name.localeCompare(b.name))
      }))
      .filter((section) => section.items.length > 0);
  }

  private buildSpecialSections(services: LaundryCommercialService[]): SpecialSection[] {
    const grouped = new Map<string, LaundryCommercialService[]>();

    this.specialSectionOrder.forEach((section) => grouped.set(section.key, []));

    services
      .slice()
      .sort((a, b) =>
        (a.category?.sort_order ?? 9999) - (b.category?.sort_order ?? 9999) ||
        (a.sort_order ?? 9999) - (b.sort_order ?? 9999) ||
        a.name.localeCompare(b.name)
      )
      .forEach((service) => {
        const key = this.resolveSpecialSectionKey(service);
        grouped.get(key)?.push(service);
      });

    return this.specialSectionOrder
      .map((section) => ({
        key: section.key,
        label: section.label,
        description: section.description,
        items: grouped.get(section.key) ?? []
      }))
      .filter((section) => section.items.length > 0);
  }

  private createSpecialItemGroup(
    service: LaundryCommercialService,
    selectedPriceOptionId?: number | null,
    quantity: number = 1
  ): FormGroup {
    const selectedOption = this.resolvePriceOption(service, selectedPriceOptionId);

    return this.fb.group({
      service_id: [service.id],
      category_id: [service.category_id ?? null],
      service_name: [service.name],
      category_name: [service.category?.name ?? null],
      quantity: [quantity],
      selected_price_option_id: [selectedOption?.id ?? service.default_price_option_id ?? null],
      manual_price: [selectedOption ? this.toNumber(selectedOption.suggested_price) : this.getSuggestedCommercialPrice(service)],
      notes: ['']
    });
  }

  private resolveSpecialSectionKey(service: LaundryCommercialService): string {
    const haystack = [
      service.name,
      service.code,
      service.description,
      service.category?.name,
      service.category?.description
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (/(planch|iron)/.test(haystack)) {
      return 'ironing';
    }

    if (/(formal|vestido|traje|gala)/.test(haystack)) {
      return 'formal-wear';
    }

    if (/(zapato|mochila|gorra|accesorio|bolso)/.test(haystack)) {
      return 'accessories';
    }

    if (/(separado|separate|especial|individual)/.test(haystack)) {
      return 'separate-wash';
    }

    return 'home-volume';
  }

  private getSuggestedCommercialPrice(service: LaundryCommercialService): number | null {
    const options = this.getActivePriceOptions(service);
    const defaultOption = options.find((item) => item.is_default) ?? options[0];
    return this.toNullableNumber(defaultOption?.suggested_price ?? null);
  }

  private getActivePriceOptions(service: LaundryCommercialService): ServicePriceOption[] {
    return (service.price_options ?? []).filter((item) => item.is_active !== false);
  }

  private resolvePriceOption(service: LaundryCommercialService, selectedPriceOptionId?: number | null): ServicePriceOption | null {
    const options = this.getActivePriceOptions(service);
    if (!options.length) {
      return null;
    }

    return options.find((item) => item.id === selectedPriceOptionId)
      ?? options.find((item) => item.is_default)
      ?? options[0]
      ?? null;
  }

  private findCommercialService(id: unknown): LaundryCommercialService | null {
    const serviceId = this.toNumber(id);
    return this.commercialServices().find((item) => item.id === serviceId) ?? null;
  }

  private buildPreviewPayload(): Record<string, unknown> {
    const service = this.service();
    const garmentItems = this.garmentTypes()
      .map((type) => {
        const group = this.getGarmentGroup(type.id);
        const quantity = this.toNumber(group.get('quantity')?.value);

        if (quantity <= 0) {
          return null;
        }

        return {
          garment_type_id: type.id,
          quantity,
          unit_type: group.get('unit_type')?.value as LaundryUnitType,
          unit_price: this.toNullableNumber(group.get('unit_price')?.value),
          notes: this.toNullableText(group.get('notes')?.value)
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const extraItems = this.extraTypes()
      .map((type) => {
        const group = this.getExtraGroup(type.id);
        const quantity = this.toNumber(group.get('quantity')?.value);

        if (quantity <= 0) {
          return null;
        }

        return {
          service_extra_type_id: type.id,
          quantity,
          unit_price: this.toNullableNumber(group.get('unit_price')?.value),
          notes: this.toNullableText(group.get('notes')?.value)
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const specialItems = this.specialItemsArray.controls
      .map((control) => ({
        service_id: control.get('service_id')?.value,
        service_name: control.get('service_name')?.value,
        category_name: control.get('category_name')?.value,
        quantity: this.toNumber(control.get('quantity')?.value),
        selected_price_option_id: this.toNullableNumber(control.get('selected_price_option_id')?.value),
        manual_price: this.toNullableNumber(control.get('manual_price')?.value),
        notes: this.toNullableText(control.get('notes')?.value)
      }))
      .filter((item) => item.quantity > 0);

    return {
      id: service?.id,
      client_id: service?.client_id,
      client_address_id: service?.client_address_id,
      scheduled_pickup_at: service?.scheduled_pickup_at,
      status: service?.status,
      service_label: service?.service_label,
      transaction_id: service?.transaction_id ?? null,
      weight_lb: this.toNullableNumber(this.form.get('weight_lb')?.value),
      notes: this.toNullableText(this.form.get('notes')?.value),
      items: garmentItems,
      extras: extraItems,
      commercial_capture_pending: specialItems
    };
  }

  private calculateSubtotal(quantity: unknown, unitPrice: unknown): number {
    return this.toNumber(quantity) * this.toNumber(unitPrice);
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

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  private bindSelectionTracking(): void {
    this.formSelectionSubscription?.unsubscribe();
    this.formSelectionSubscription = this.form.valueChanges.subscribe(() => this.refreshSelectedItemsState());
  }

  private refreshSelectedItemsState(): void {
    const currentCount = this.getSelectedItemsCount();
    this.selectedItemsCount.set(currentCount);

    if (currentCount > this.previousSelectedItemsCount) {
      this.triggerFabPulse();
    }

    this.previousSelectedItemsCount = currentCount;
  }

  private triggerFabPulse(): void {
    this.fabPulse.set(false);

    if (this.fabPulseTimeoutId) {
      clearTimeout(this.fabPulseTimeoutId);
    }

    this.fabPulseTimeoutId = window.setTimeout(() => {
      this.fabPulse.set(true);

      this.fabPulseTimeoutId = window.setTimeout(() => {
        this.fabPulse.set(false);
        this.fabPulseTimeoutId = null;
      }, 450);
    }, 0);
  }

  private checkIsMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }
}
