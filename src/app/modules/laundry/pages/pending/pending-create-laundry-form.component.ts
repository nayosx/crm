import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewEncapsulation, signal } from '@angular/core';
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
  styles: [`
    .pending-create-service-select-button {
      justify-content: flex-start;
    }

    .pending-create-service-summary {
      border: 1px solid var(--surface-border);
      border-radius: 0.75rem;
      padding: 0.875rem 1rem;
      background: var(--surface-50);
    }

    .pending-create-service-summary-animated {
      animation: pending-create-service-summary-pulse 700ms ease;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 0.3rem color-mix(in srgb, var(--primary-color) 16%, transparent);
    }

    @keyframes pending-create-service-summary-pulse {
      0% {
        transform: scale(0.985);
        opacity: 0.78;
      }
      45% {
        transform: scale(1.01);
        opacity: 1;
      }
      100% {
        transform: scale(1);
      }
    }
  `],
  encapsulation: ViewEncapsulation.None
})
export class PendingCreateLaundryFormComponent {
  @Input() submitting = false;
  @Output() formSubmit = new EventEmitter<CreateLaundryPayload>();
  @Output() cancel = new EventEmitter<void>();

  readonly form: FormGroup;
  readonly clientChanged = signal(false);

  displayClientDialog = false;
  displayNoAddressDialog = false;
  selectedClientName = '';
  selectedAddressText = '';
  private clientChangedAnimationTimeout: ReturnType<typeof setTimeout> | null = null;

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
      this.triggerClientChangedAnimation();
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

  private triggerClientChangedAnimation(): void {
    if (this.clientChangedAnimationTimeout) {
      clearTimeout(this.clientChangedAnimationTimeout);
    }

    this.clientChanged.set(false);

    queueMicrotask(() => {
      this.clientChanged.set(true);
      this.clientChangedAnimationTimeout = setTimeout(() => {
        this.clientChanged.set(false);
        this.clientChangedAnimationTimeout = null;
      }, 700);
    });
  }
}
