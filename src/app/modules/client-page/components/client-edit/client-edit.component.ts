import { Component, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Client, ClientAddress, ClientPhone } from '@shared/interfaces/client.interface';
import { ClientFacade } from '@shared/services/client.facade';
import { ClientPhoneFacade } from '@shared/services/client-phone-facade.service';
import { ClientAddressFacadeService } from '@shared/services/client-address-facade.service';
import { ClientFormComponent } from '../client-form/client-form.component';
import { ClientPhoneInputComponent } from '../client-phone-input/client-phone-input.component';
import { ClientPhoneListComponent } from '../client-phone-list/client-phone-list.component';
import { ClientAddressInputComponent } from '../client-address-input/client-address-input.component';
import { ClientAddressListComponent } from '../client-address-list/client-address-list.component';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';


@Component({
  selector: 'app-client-edit',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ClientFormComponent,
    ClientPhoneInputComponent,
    ClientPhoneListComponent,
    ClientAddressInputComponent,
    ClientAddressListComponent,
    CardModule,
  ],
  templateUrl: './client-edit.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ClientEditComponent {
  client?: Client;
  loading = false;

  phones$;
  loadingPhones$;

  addresses$;
  loadingAddresses$;

  selectedPhone?: ClientPhone;
  selectedAddress?: ClientAddress;

  constructor(
    private route: ActivatedRoute,
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

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.clientFacade.getClient(id).subscribe({
      next: (client) => {
        this.client = client;
        this.phoneFacade.loadPhones();
        this.addressFacade.loadAddresses();
      },
      error: (err) => {
        console.error(err);
        this.router.navigate(['/clients']);
      }
    });
  }

  onSubmit(data: Partial<Client>) {
    if (!this.client) return;

    this.loading = true;
    this.clientFacade.updateClient(this.client.id, data).subscribe({
      next: () => {
        this.clientFacade.reload();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  // TELÉFONOS
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

  onDeletePhone(id: number) {
    this.phoneFacade.deletePhone(id).subscribe({
      next: () => this.phoneFacade.loadPhones()
    });
  }

  getClientPhones(phones: ClientPhone[]): ClientPhone[] {
    if (!this.client) return [];
    return phones.filter(p => p.client_id === this.client?.id);
  }

  // DIRECCIONES
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

  onDeleteAddress(id: number) {
    this.addressFacade.deleteAddress(id).subscribe({
      next: () => this.addressFacade.loadAddresses()
    });
  }

  getClientAddresses(addresses: ClientAddress[]): ClientAddress[] {
    if (!this.client) return [];
    return addresses.filter(a => a.client_id === this.client?.id);
  }
}
