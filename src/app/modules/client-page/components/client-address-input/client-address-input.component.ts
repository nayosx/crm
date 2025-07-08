import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ClientAddress } from '@shared/interfaces/client.interface';
import { ClientAddressFacadeService } from '@shared/services/client-address-facade.service';
import { ButtonModule } from 'primeng/button';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-client-address-input',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputSwitchModule
  ],
  templateUrl: './client-address-input.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ClientAddressInputComponent implements OnChanges {
  @Input() clientId?: number;
  @Input() addressToEdit?: ClientAddress;
  @Output() addressSaved = new EventEmitter<void>();

  @ViewChild('addressForm') addressForm!: NgForm;

  model: Partial<ClientAddress> = {
    address_text: '',
    latitude: undefined,
    longitude: undefined,
    map_link: '',
    image_path: '',
    is_primary: false
  };

  loading = false;

  constructor(private addressFacade: ClientAddressFacadeService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['addressToEdit'] && this.addressToEdit) {
      this.model = {
        address_text: this.addressToEdit.address_text,
        latitude: this.addressToEdit.latitude,
        longitude: this.addressToEdit.longitude,
        map_link: this.addressToEdit.map_link,
        image_path: this.addressToEdit.image_path,
        is_primary: this.addressToEdit.is_primary
      };
    }
  }

  onSubmit() {
    if (!this.clientId || !this.model.address_text) return;

    this.loading = true;

    const data = {
      client_id: this.clientId,
      address_text: this.model.address_text,
      latitude: this.model.latitude || 13.703340,
      longitude: this.model.longitude || -89.150002,
      map_link: this.model.map_link,
      image_path: this.model.image_path,
      is_primary: this.model.is_primary
    };

    const obs = this.addressToEdit
      ? this.addressFacade.updateAddress(this.addressToEdit.id, data)
      : this.addressFacade.createAddress(data);

    obs.subscribe({
      next: () => {
        this.loading = false;
        this.addressSaved.emit();
        this.addressFacade.reload();
        this.model = {
          address_text: '',
          latitude: undefined,
          longitude: undefined,
          map_link: '',
          image_path: '',
          is_primary: false
        };
        this.addressForm.resetForm({
          is_primary: false
        });
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  extractLatLngFromMapLink() {
  if (!this.model.map_link) return;

  // Buscar el patrón @lat,lng
  const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = this.model.map_link.match(regex);

  if (match) {
    this.model.latitude = parseFloat(match[1]);
    this.model.longitude = parseFloat(match[2]);
  }
}



}