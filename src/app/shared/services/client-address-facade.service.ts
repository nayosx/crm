import { Injectable } from '@angular/core';
import { ClientAddress } from '@shared/interfaces/client.interface';
import { ClientAddressService } from './client-address.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClientAddressFacadeService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private addressesSubject = new BehaviorSubject<ClientAddress[] | null>(null);
  private errorSubject = new BehaviorSubject<string | null>(null);

  loading$ = this.loadingSubject.asObservable();
  addresses$ = this.addressesSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(private addressService: ClientAddressService) {}

  loadAddresses() {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    this.addressService.getAddresses().subscribe({
      next: (addresses) => {
        this.addressesSubject.next(addresses);
        this.loadingSubject.next(false);
      },
      error: (err) => {
        console.error(err);
        this.errorSubject.next('Error cargando direcciones');
        this.loadingSubject.next(false);
      }
    });
  }

  createAddress(address: Partial<ClientAddress>) {
    return this.addressService.createAddress(address);
  }

  updateAddress(id: number, address: Partial<ClientAddress>) {
    return this.addressService.updateAddress(id, address);
  }

  deleteAddress(id: number) {
    return this.addressService.deleteAddress(id);
  }

  reload() {
    this.loadAddresses();
  }
}