import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientListComponent } from '@shared/components/client-list/client-list.component';
import { LaundryServiceResp, LaundryServiceStatusValues } from '@shared/interfaces/laundry-service.interface';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { ClientAddressService } from '@shared/services/client/client-address.service';
import { ClientAddress } from '@shared/interfaces/client.interface';
import { ClientAddressListComponent } from '@modules/client/components/client-address-list/client-address-list.component';
import { PaymentType, Transaction, TransactionCategory } from '@shared/interfaces/transaction.interface';
import { TransactionFormComponent } from '@modules/transaction/components/transaction-form/transaction-form.component';
import { TransactionService } from '@shared/services/transaction/transaction.service';

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
    ClientAddressListComponent,
    TransactionFormComponent
  ],
  templateUrl: './laundry-form.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LaundryFormComponent implements OnInit {
  @Input() initialData?: Partial<LaundryServiceResp>;
  @Input() paymentTypes: PaymentType[] = [];
  @Input() categories: TransactionCategory[] = [];
  @Input() isEditMode = false;
  @Output() formSubmit = new EventEmitter<Partial<LaundryServiceResp>>();

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

  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private clientServ: ClientAddressService,
    private transactionServ: TransactionService
  ) { }

  ngOnInit(): void {

    console.log('Initial Data:', this.initialData);

    const pickupDate = this.initialData?.scheduled_pickup_at
      ? new Date(this.initialData.scheduled_pickup_at)
      : new Date();

    const initialStatus = this.initialData?.status ?? 'PENDING';

    this.form = this.fb.group({
      client_id: [this.initialData?.client?.id ?? null, Validators.required],
      client_address_id: [this.initialData?.client_address?.id ?? null, Validators.required],
      pickup_date: [pickupDate, Validators.required],
      pickup_time: [pickupDate, Validators.required],
      service_label: [this.initialData?.service_label ?? 'NORMAL', Validators.required],
      status: [{ value: initialStatus, disabled: this.isEditMode ? false : true }, Validators.required],
      transaction_id: [this.initialData?.transaction?.id ?? null]
    });

    // Desactivar fecha/hora si el estado inicial no es PENDING
    const editable = initialStatus === 'PENDING';
    const action = editable ? 'enable' : 'disable';
    this.form.get('pickup_date')?.[action]();
    this.form.get('pickup_time')?.[action]();

    // Escuchar cambios en tiempo real (opcional)
    this.form.get('status')?.valueChanges.subscribe((status) => {
      const editable = status === 'PENDING';
      const action = editable ? 'enable' : 'disable';
      this.form.get('pickup_date')?.[action]();
      this.form.get('pickup_time')?.[action]();
    });


    if (this.initialData?.client?.name) {
      this.selectedClientName = this.initialData.client.name;
    }

    if (this.initialData?.client_address?.address_text) {
      this.selectedAddress = this.initialData.client_address.address_text;
    }

    if (this.isEditMode && this.initialData?.transaction?.id) {
      this.transactionServ.getTransaction(this.initialData.transaction.id).subscribe({
        next: (tx) => {
          this.createdTransaction = tx;
        },
        error: () => {
          console.warn('No se pudo cargar la transacción');
        }
      });
    }
  }

  get isPending(): boolean {
    return this.form?.get('status')?.value === 'PENDING';
  }

  submit(isRedirect:boolean = true): void {
    if (this.form.valid) {
      const formValue = this.form.getRawValue();
      formValue.isRedirect = isRedirect;

      if (typeof formValue.service_label === 'object') {
        formValue.service_label = formValue.service_label.value;
      }

      if (typeof formValue.status === 'object') {
        formValue.status = formValue.status.value;
      }

      const date = this.form.get('pickup_date')?.value;
      const time = this.form.get('pickup_time')?.value;

      if (date && time) {
        const fullDate = new Date(date);
        fullDate.setHours(time.getHours());
        fullDate.setMinutes(time.getMinutes());
        fullDate.setSeconds(0);
        fullDate.setMilliseconds(0);
        formValue.scheduled_pickup_at = fullDate.toISOString();
      }

      delete formValue.pickup_date;
      delete formValue.pickup_time;

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

  onTransactionSetter(transaction: Partial<Transaction>): void {
    this.transactionServ.createTransaction(transaction).subscribe({
      next: (resp) => {
        this.form.patchValue({ transaction_id: resp.transaction.id });
        this.createdTransaction = resp.transaction;
        this.displayTransactionDialog = false;

        this.submit(false);
      }
    });
  }

  get canCreateTransaction(): boolean {
    return this.form.get('status')?.value === 'READY_FOR_DELIVERY';
  }

}
