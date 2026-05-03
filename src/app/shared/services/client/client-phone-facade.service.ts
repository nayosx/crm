import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ClientPhoneService } from './client-phone.service';
import { ClientPhone } from '@shared/interfaces/client.interface';

@Injectable({
  providedIn: 'root'
})
export class ClientPhoneFacade {
  private phonesSubject = new BehaviorSubject<ClientPhone[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  phones$ = this.phonesSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(private phoneService: ClientPhoneService) {}

  loadPhones() {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    this.phoneService.getPhones().subscribe({
      next: (phones) => {
        this.phonesSubject.next(phones);
        this.loadingSubject.next(false);
      },
      error: (err) => {
        console.error(err);
        this.errorSubject.next('Error cargando teléfonos');
        this.loadingSubject.next(false);
      }
    });
  }

  reload() {
    this.loadPhones();
  }

  createPhone(phone: Partial<ClientPhone>) {
    return this.phoneService.createPhone(phone);
  }

  updatePhone(id: number, phone: Partial<ClientPhone>) {
    return this.phoneService.updatePhone(id, phone);
  }

  deletePhone(id: number) {
    return this.phoneService.deletePhone(id);
  }
}
