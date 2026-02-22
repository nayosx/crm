import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import dayjs from 'dayjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { ClientListComponent } from '@shared/components/client-list/client-list.component';
import { ClientFullResponse } from '@shared/interfaces/client.interface';

type CreateLaundryPayload = {
  client_id: number;
  client_address_id: number;
  scheduled_pickup_at: string;
  status: 'PENDING';
  service_label: 'NORMAL' | 'EXPRESS';
  transaction_id: null;
};

@Component({
  selector: 'app-pending-create-laundry-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TagModule,
    DialogModule,
    ToggleSwitchModule,
    ClientListComponent
  ],
  templateUrl: './pending-create-laundry-form.component.html',
  encapsulation: ViewEncapsulation.None
})
export class PendingCreateLaundryFormComponent {
  @Input() submitting = false;
  @Output() formSubmit = new EventEmitter<CreateLaundryPayload>();
  @Output() cancel = new EventEmitter<void>();

  readonly form: FormGroup;

  displayClientDialog = false;
  displayNoAddressDialog = false;
  selectedClientName = '';
  selectedAddressText = '';

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      client_id: [null as number | null, Validators.required],
      client_address_id: [null as number | null, Validators.required],
      is_express: [false, Validators.required]
    });
  }

  openClientDialog(): void {
    if (this.submitting) {
      return;
    }
    this.displayClientDialog = true;
  }

  onClientSelected(client: ClientFullResponse): void {
    this.displayClientDialog = false;
    this.selectedClientName = client.name;
    this.form.patchValue({ client_id: client.id, client_address_id: null });

    const firstAddress = client.addresses?.[0];
    if (firstAddress) {
      this.form.patchValue({ client_address_id: firstAddress.id });
      this.selectedAddressText = firstAddress.address_text;
      return;
    }

    this.form.patchValue({ client_id: null, client_address_id: null });
    this.selectedAddressText = '';
    this.selectedClientName = '';
    this.displayNoAddressDialog = true;
  }

  submit(): void {
    if (this.submitting) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.formSubmit.emit({
      client_id: value.client_id as number,
      client_address_id: value.client_address_id as number,
      scheduled_pickup_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      status: 'PENDING',
      service_label: value.is_express ? 'EXPRESS' : 'NORMAL',
      transaction_id: null
    });
  }

  close(): void {
    this.cancel.emit();
  }

  closeNoAddressDialog(): void {
    this.displayNoAddressDialog = false;
  }
}
