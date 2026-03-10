import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import dayjs from 'dayjs';
import { catchError, finalize, map, Observable, switchMap, throwError } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { Client } from '@shared/interfaces/client.interface';
import { LaundryServiceResp } from '@shared/interfaces/laundry-service.interface';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { ClientService } from '@shared/services/client/client.service';
import { ClientAddressService } from '@shared/services/client/client-address.service';
import { LaundryService } from '@shared/services/laundry/laundry.service';

type FlowStage = 'client' | 'address' | 'laundry';

type FlowError = {
  stage: FlowStage;
  cause: unknown;
};

@Component({
  selector: 'app-pending-create-client-address-laundry-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    InputTextarea,
    ToggleSwitchModule,
    ButtonModule,
    DialogModule,
    LoaderDialogComponent
  ],
  templateUrl: './pending-create-client-address-laundry-form.component.html',
  encapsulation: ViewEncapsulation.None
})
export class PendingCreateClientAddressLaundryFormComponent {
  @ViewChild(LoaderDialogComponent) loader?: LoaderDialogComponent;

  @Output() cancel = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  readonly form: FormGroup;
  saving = false;
  errorDialogVisible = false;
  errorDialogMessage = 'Ocurrió un problema al guardar.';

  constructor(
    private readonly fb: FormBuilder,
    private readonly clientService: ClientService,
    private readonly clientAddressService: ClientAddressService,
    private readonly laundryService: LaundryService
  ) {
    this.form = this.fb.group({
      client_name: ['', [Validators.required, Validators.minLength(2)]],
      address_text: ['', [Validators.required, Validators.minLength(5)]],
      is_express: [false, Validators.required]
    });
  }

  submit(): void {
    if (this.saving) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const value = this.form.getRawValue();
    this.loader?.open('Creando cliente...');

    const clientPayload: Partial<Client> = {
      name: value.client_name,
      email: 'none@mail.com',
      document_id: '00000000-0'
    };

    this.createClient(clientPayload).pipe(
      switchMap((client) => {
        this.loader?.open('Creando dirección...');
        return this.createAddress(client.id, value.address_text).pipe(
          switchMap((address) => {
            this.loader?.open('Creando servicio de lavandería...');
            return this.createLaundry(client.id, address.id, value.is_express);
          })
        );
      }),
      finalize(() => {
        this.saving = false;
        this.loader?.close();
      })
    ).subscribe({
      next: () => {
        this.created.emit();
      },
      error: (err: FlowError) => {
        this.errorDialogMessage = this.getErrorMessage(err?.stage);
        this.errorDialogVisible = true;
      }
    });
  }

  close(): void {
    if (this.saving) {
      return;
    }
    this.cancel.emit();
  }

  closeErrorDialog(): void {
    this.errorDialogVisible = false;
  }

  private createClient(payload: Partial<Client>): Observable<Client> {
    return this.clientService.createClient(payload).pipe(
      map((client) => {
        if (!client?.id) {
          throw ({ stage: 'client', cause: new Error('Client id missing') } as FlowError);
        }
        return client;
      }),
      catchError((error) => throwError(() => ({ stage: 'client', cause: error } as FlowError)))
    );
  }

  private createAddress(clientId: number, addressText: string): Observable<{ id: number }> {
    return this.clientAddressService.createAddress({
      client_id: clientId,
      address_text: addressText,
      is_primary: false
    }).pipe(
      map((address) => {
        if (!address?.id) {
          throw ({ stage: 'address', cause: new Error('Address id missing') } as FlowError);
        }
        return address;
      }),
      catchError((error) => throwError(() => ({ stage: 'address', cause: error } as FlowError)))
    );
  }

  private createLaundry(clientId: number, clientAddressId: number, isExpress: boolean): Observable<unknown> {
    const payload = {
      client_id: clientId,
      client_address_id: clientAddressId,
      scheduled_pickup_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      status: 'PENDING',
      service_label: isExpress ? 'EXPRESS' : 'NORMAL',
      transaction_id: null
    } as Partial<LaundryServiceResp> & {
      client_id: number;
      client_address_id: number;
      transaction_id: null;
    };

    return this.laundryService.create(payload).pipe(
      map((service) => {
        if (!service?.id) {
          throw ({ stage: 'laundry', cause: new Error('Laundry id missing') } as FlowError);
        }
        return service;
      }),
      catchError((error) => throwError(() => ({ stage: 'laundry', cause: error } as FlowError)))
    );
  }

  private getErrorMessage(stage?: FlowStage): string {
    if (stage === 'client') {
      return 'No se pudo crear el cliente. Verifica los datos e inténtalo nuevamente.';
    }
    if (stage === 'address') {
      return 'El cliente se creó, pero falló la creación de la dirección.';
    }
    if (stage === 'laundry') {
      return 'Cliente y dirección creados, pero falló la creación del servicio de lavandería.';
    }
    return 'Ocurrió un problema inesperado al guardar.';
  }
}
