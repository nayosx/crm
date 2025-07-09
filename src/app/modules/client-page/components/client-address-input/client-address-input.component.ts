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

  constructor(private addressFacade: ClientAddressFacadeService) { }

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

    let lat: number | undefined;
    let lng: number | undefined;

    // 1. Google Maps !3d...!4d...
    const regex3d4d = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
    const match3d4d = this.model.map_link.match(regex3d4d);

    if (match3d4d) {
      lat = parseFloat(match3d4d[1]);
      lng = parseFloat(match3d4d[2]);
    }

    // 2. Google Maps @lat,lng
    if (!lat || !lng) {
      const regexAt = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const matchAt = this.model.map_link.match(regexAt);
      if (matchAt) {
        lat = parseFloat(matchAt[1]);
        lng = parseFloat(matchAt[2]);
      }
    }

    // 3. Google Maps q=lat,lng
    if (!lat || !lng) {
      const regexQ = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
      const matchQ = this.model.map_link.match(regexQ);
      if (matchQ) {
        lat = parseFloat(matchQ[1]);
        lng = parseFloat(matchQ[2]);
      }
    }

    // 4. Waze ll=lat,lng
    if (!lat || !lng) {
      const regexWaze = /ll=([-?\d\.]+)%2C([-?\d\.]+)/;
      const matchWaze = this.model.map_link.match(regexWaze);
      if (matchWaze) {
        lat = parseFloat(matchWaze[1]);
        lng = parseFloat(matchWaze[2]);
      }
    }

    // Si encontró coordenadas, asignarlas
    if (lat !== undefined && lng !== undefined) {
      this.model.latitude = lat;
      this.model.longitude = lng;
    }
  }


}