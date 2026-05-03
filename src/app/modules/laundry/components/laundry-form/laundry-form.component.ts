import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientListComponent } from '@shared/components/client-list/client-list.component';
import {
  LaundryServiceExtra,
  LaundryServiceExtraType,
  LaundryServiceItem,
  LaundryServiceUpdatePayload,
  LaundryServiceResp,
  LaundryServiceStatusValues,
  LaundryUnitType
} from '@shared/interfaces/laundry-service.interface';
import { LaundryGarmentType } from '@shared/interfaces/laundry-garment-type.interface';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { ClientAddressService } from '@shared/services/client/client-address.service';
import { ClientAddress } from '@shared/interfaces/client.interface';
import { ClientAddressListComponent } from '@modules/client/components/client-address-list/client-address-list.component';
import { Transaction } from '@shared/interfaces/transaction.interface';
import { combineDateAndTime, formatToSQLDateTime } from '@shared/utils/datetime.util';
import { LaundryGarmentTypesService } from '@shared/services/laundry/laundry-garment-types.service';
import { LaundryServiceExtraTypesService } from '@shared/services/laundry/laundry-service-extra-types.service';
import { LaundryTransactionDialogComponent } from '../laundry-transaction-dialog/laundry-transaction-dialog.component';
import { LaundryTransactionPrefill } from '@shared/utils/laundry-transaction.util';

@Component({
  selector: 'app-laundry-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ClientListComponent,
    SelectModule,
    InputTextModule,
    ButtonModule,
    TagModule,
    EditorModule,
    SelectButtonModule,
    DialogModule,
    DatePickerModule,
    TextareaModule,
    ClientAddressListComponent,
    LaundryTransactionDialogComponent
  ],
  templateUrl: './laundry-form.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LaundryFormComponent implements OnInit {
  @Input() initialData?: Partial<LaundryServiceResp>;
  @Input() transactionPrefill: LaundryTransactionPrefill | null = null;
  @Input() isEditMode = false;
  @Input() autoInProgress = false;
  @Output() formSubmit = new EventEmitter<(LaundryServiceUpdatePayload & { isRedirect?: boolean })>();

  form!: FormGroup;
  statuses = LaundryServiceStatusValues;
  statusOptions = this.statuses.map(s => ({ label: s, value: s }));

  displayClientDialog = false;
  displayAddressDialog = false;
  displayTransactionDialog = false;

  selectedClientName = '';
  selectedAddress = '';
  addresses: ClientAddress[] = [];
  createdTransaction?: Transaction;
  garmentTypes: LaundryGarmentType[] = [];
  extraTypes: LaundryServiceExtraType[] = [];
  readonly unitTypeOptions = [
    { label: 'Unidad', value: 'UNIT' as LaundryUnitType },
    { label: 'Par', value: 'PAIR' as LaundryUnitType }
  ];

  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private clientServ: ClientAddressService,
    private garmentTypesService: LaundryGarmentTypesService,
    private extraTypesService: LaundryServiceExtraTypesService
  ) {}

  ngOnInit(): void {
    const baseDate = this.initialData?.scheduled_pickup_at ? new Date(this.initialData.scheduled_pickup_at) : new Date();
    const initialStatus = this.isEditMode
      ? (this.initialData?.status ?? 'PENDING')
      : (this.autoInProgress ? 'IN_PROGRESS' : (this.initialData?.status ?? 'PENDING'));

    this.form = this.fb.group({
      client_id: [this.initialData?.client?.id ?? null, Validators.required],
      client_address_id: [this.initialData?.client_address?.id ?? null, Validators.required],
      pickup_date: [baseDate, Validators.required],
      pickup_time: [baseDate, Validators.required],
      service_label: [this.initialData?.service_label ?? 'NORMAL', Validators.required],
      status: [{ value: initialStatus, disabled: this.isEditMode ? false : true }, Validators.required],
      transaction_id: [this.initialData?.transaction?.id ?? null],
      weight_lb: [this.initialData?.weight_lb ?? null],
      notes: [this.initialData?.notes ?? null],
      items: this.fb.array([]),
      extras: this.fb.array([])
    });

    this.setInitialCollections();

    const editable = initialStatus === 'PENDING';
    const action = editable ? 'enable' : 'disable';
    this.form.get('pickup_date')?.[action]();
    this.form.get('pickup_time')?.[action]();

    this.form.get('status')?.valueChanges.subscribe((status) => {
      const isEditable = status === 'PENDING';
      const act = isEditable ? 'enable' : 'disable';
      this.form.get('pickup_date')?.[act]();
      this.form.get('pickup_time')?.[act]();
    });

    if (this.initialData?.client?.name) {
      this.selectedClientName = this.initialData.client.name;
    }

    if (this.initialData?.client_address?.address_text) {
      this.selectedAddress = this.initialData.client_address.address_text;
    }

    if (this.isEditMode && this.initialData?.transaction) {
      this.createdTransaction = this.initialData.transaction as Transaction;
    }

    this.garmentTypesService.getAll().subscribe({
      next: (types) => {
        this.garmentTypes = types.filter((type) => type.active !== false);
      },
      error: () => {
        this.garmentTypes = [];
      }
    });

    this.extraTypesService.getAll().subscribe({
      next: (types) => {
        this.extraTypes = types.filter((type) => type.active !== false);
      },
      error: () => {
        this.extraTypes = [];
      }
    });
  }

  get isPending(): boolean {
    return this.form?.get('status')?.value === 'PENDING';
  }

  get scheduledPickupDate(): Date | null {
    if (!this.form) return null;
    const date = this.form.get('pickup_date')?.value;
    const time = this.form.get('pickup_time')?.value;
    return combineDateAndTime(date, time);
  }

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get extrasArray(): FormArray {
    return this.form.get('extras') as FormArray;
  }

  submit(isRedirect: boolean = true): void {
    if (this.form.valid) {
      const formValue: any = this.form.getRawValue();
      formValue.isRedirect = isRedirect;

      if (typeof formValue.service_label === 'object') {
        formValue.service_label = formValue.service_label.value;
      }

      if (typeof formValue.status === 'object') {
        formValue.status = formValue.status.value;
      }

      const combined = this.scheduledPickupDate;
      if (combined) {
        formValue.scheduled_pickup_at = formatToSQLDateTime(combined);
      }

      delete formValue.pickup_date;
      delete formValue.pickup_time;

      formValue.notes = this.normalizeText(formValue.notes);
      formValue.fulfillment_type = this.initialData?.fulfillment_type ?? 'WALK_IN';
      delete formValue.weight_lb;
      delete formValue.items;
      delete formValue.extras;

      this.formSubmit.emit(formValue);
    } else {
      this.form.markAllAsTouched();
    }
  }

  openClientDialog(): void {
    this.displayClientDialog = true;
  }

  onClientSelected(client: { id: number; name: string }): void {
    this.form.patchValue({ client_id: client.id });
    this.selectedClientName = client.name;
    this.displayClientDialog = false;
    this.displayAddressDialog = true;
    this.getListAddresses(client.id);
  }

  onChangeAddress(id: number): void {
    this.displayAddressDialog = true;
    this.getListAddresses(id);
  }

  getListAddresses(clientId: number): void {
    this.isLoading = true;
    this.clientServ.getAddressesByClientId(clientId).subscribe({
      next: (data) => {
        this.addresses = data;
        if (this.addresses.length > 0 && this.addresses.length <= 1) {
          this.form.patchValue({ client_address_id: this.addresses[0].id });
          this.selectedAddress = this.addresses[0].address_text;
          this.displayAddressDialog = false;
        } else if (this.addresses.length > 1) {
          this.displayAddressDialog = true;
        } else {
          this.form.patchValue({ client_address_id: null });
          this.selectedAddress = 'No hay direcciones disponibles, edita el cliente para agregar una';
          this.displayAddressDialog = false;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        console.error('Error al cargar direcciones');
      }
    });
  }

  onAddressSelected(address: ClientAddress): void {
    this.form.patchValue({ client_address_id: address.id });
    this.selectedAddress = address.address_text;
    this.displayAddressDialog = false;
  }

  openTransactionDialog(): void {
    this.displayTransactionDialog = true;
  }

  onTransactionLinked(transaction: Transaction): void {
    this.form.patchValue({ transaction_id: transaction.id });
    this.createdTransaction = transaction;
    this.displayTransactionDialog = false;
  }

  get canCreateTransaction(): boolean {
    return this.form.get('status')?.value === 'READY_FOR_DELIVERY';
  }

  addItem(): void {
    this.itemsArray.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  addExtra(): void {
    this.extrasArray.push(this.createExtraGroup());
  }

  removeExtra(index: number): void {
    this.extrasArray.removeAt(index);
  }

  onGarmentTypeChange(index: number): void {
    const group = this.itemsArray.at(index) as FormGroup;
    const garmentTypeId = Number(group.get('garment_type_id')?.value);
    const selected = this.garmentTypes.find((type) => type.id === garmentTypeId);

    if (!selected) {
      return;
    }

    if (!group.get('unit_type')?.value && selected.default_unit_type) {
      group.patchValue({ unit_type: selected.default_unit_type }, { emitEvent: false });
    }

    if ((group.get('unit_price')?.value === null || group.get('unit_price')?.value === '') && selected.default_unit_price !== undefined) {
      group.patchValue({ unit_price: selected.default_unit_price }, { emitEvent: false });
    }
  }

  onExtraTypeChange(index: number): void {
    const group = this.extrasArray.at(index) as FormGroup;
    const extraTypeId = Number(group.get('service_extra_type_id')?.value);
    const selected = this.extraTypes.find((type) => type.id === extraTypeId);

    if (!selected) {
      return;
    }

    if (group.get('unit_price')?.value === null || group.get('unit_price')?.value === '') {
      group.patchValue({ unit_price: selected.default_unit_price }, { emitEvent: false });
    }
  }

  private setInitialCollections(): void {
    const initialItems = this.initialData?.items ?? [];
    const initialExtras = this.initialData?.extras ?? [];

    if (initialItems.length) {
      initialItems.forEach((item) => this.itemsArray.push(this.createItemGroup(item)));
    }

    if (initialExtras.length) {
      initialExtras.forEach((extra) => this.extrasArray.push(this.createExtraGroup(extra)));
    }
  }

  private createItemGroup(item?: Partial<LaundryServiceItem>): FormGroup {
    return this.fb.group({
      garment_type_id: [item?.garment_type_id ?? null, Validators.required],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(1)]],
      unit_type: [item?.unit_type ?? 'UNIT', Validators.required],
      unit_price: [item?.unit_price ?? null],
      notes: [item?.notes ?? null]
    });
  }

  private createExtraGroup(extra?: Partial<LaundryServiceExtra>): FormGroup {
    return this.fb.group({
      service_extra_type_id: [extra?.service_extra_type_id ?? null, Validators.required],
      quantity: [extra?.quantity ?? 1, [Validators.required, Validators.min(1)]],
      unit_price: [extra?.unit_price ?? null],
      notes: [extra?.notes ?? null]
    });
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
}
