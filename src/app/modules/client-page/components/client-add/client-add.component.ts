import { Component, ViewEncapsulation } from '@angular/core';
import { ClientFormComponent } from "../client-form/client-form.component";
import { ClientFacade } from '@shared/services/client.facade';
import { Router } from '@angular/router';
import { Client, ClientAddress, ClientPhone } from '@shared/interfaces/client.interface';
import { ClientPhoneInputComponent } from '../client-phone-input/client-phone-input.component';
import { CommonModule } from '@angular/common';
import { ClientPhoneFacade } from '@shared/services/client-phone-facade.service';
import { ButtonModule } from 'primeng/button';
import { ClientPhoneListComponent } from '../client-phone-list/client-phone-list.component';
import { ClientAddressService } from '@shared/services/client-address.service';
import { ClientAddressFacadeService } from '@shared/services/client-address-facade.service';
import { ClientAddressInputComponent } from '../client-address-input/client-address-input.component';
import { ClientAddressListComponent } from '../client-address-list/client-address-list.component';

@Component({
  selector: 'app-client-add',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ClientFormComponent,
    ClientPhoneInputComponent,
    ClientPhoneListComponent,
    ClientAddressInputComponent,
    ClientAddressListComponent
  ],
  templateUrl: './client-add.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ClientAddComponent {
  loading = false;
  clientIdCreated?: number;

  phones$;
  loadingPhones$;

  addresses$;
  loadingAddresses$;

  selectedPhone?: ClientPhone;
  selectedAddress?: ClientAddress;

  constructor(
    private clientFacade: ClientFacade,
    private phoneFacade: ClientPhoneFacade,
    private addressFacade: ClientAddressFacadeService,
    private router: Router
  ) {
    this.phones$ = this.phoneFacade.phones$;
    this.loadingPhones$ = this.phoneFacade.loading$;
    this.addresses$ = this.addressFacade.addresses$;
    this.loadingAddresses$ = this.addressFacade.loading$;
  }

  onSubmit(data: Partial<Client>) {
    this.loading = true;
    data.email = 'none@mail.com';
    data.document_id = '00000000-0';
    this.clientFacade.createClient(data).subscribe({
      next: (client) => {
        this.clientIdCreated = client.id;
        this.loading = false;
        this.phoneFacade.loadPhones();
        this.addressFacade.loadAddresses();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  // TELÉFONOS
  onDeletePhone(id: number) {
    this.phoneFacade.deletePhone(id).subscribe({
      next: () => this.phoneFacade.loadPhones()
    });
  }

  onEditPhone(phone: ClientPhone) {
    this.selectedPhone = phone;
  }

  onCancelEditPhone() {
    this.selectedPhone = undefined;
  }

  onPhoneSaved() {
    this.selectedPhone = undefined;
    this.phoneFacade.loadPhones();
  }

  getClientPhones(phones: ClientPhone[]): ClientPhone[] {
    if (!this.clientIdCreated) return [];
    return phones.filter(p => p.client_id === this.clientIdCreated);
  }

  // DIRECCIONES
  onDeleteAddress(id: number) {
    this.addressFacade.deleteAddress(id).subscribe({
      next: () => this.addressFacade.loadAddresses()
    });
  }

  onEditAddress(address: ClientAddress) {
    this.selectedAddress = address;
  }

  onCancelEditAddress() {
    this.selectedAddress = undefined;
  }

  onAddressSaved() {
    this.selectedAddress = undefined;
    this.addressFacade.loadAddresses();
  }

  getClientAddresses(addresses: ClientAddress[]): ClientAddress[] {
    if (!this.clientIdCreated) return [];
    return addresses.filter(a => a.client_id === this.clientIdCreated);
  }
}
