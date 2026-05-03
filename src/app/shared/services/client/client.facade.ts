import { Injectable } from '@angular/core';
import { BehaviorSubject, finalize } from 'rxjs';
import { ClientService } from './client.service';
import { Client, ClientDetailPageResponse, ClientPageResponse } from '@shared/interfaces/client.interface';

type ViewMode = 'detail' | 'lite';

@Injectable({
  providedIn: 'root'
})
export class ClientFacade {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  private clientsDetailSubject = new BehaviorSubject<ClientDetailPageResponse | null>(null);
  private clientsLiteSubject = new BehaviorSubject<ClientPageResponse | null>(null);

  private querySubject = new BehaviorSubject<string>('');
  private pageSubject = new BehaviorSubject<number>(1);
  private perPageSubject = new BehaviorSubject<number>(8);
  private modeSubject = new BehaviorSubject<ViewMode>('detail');

  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  clientsDetail$ = this.clientsDetailSubject.asObservable();
  clientsLite$ = this.clientsLiteSubject.asObservable();

  query$ = this.querySubject.asObservable();
  page$ = this.pageSubject.asObservable();
  perPage$ = this.perPageSubject.asObservable();
  mode$ = this.modeSubject.asObservable();

  constructor(private clientService: ClientService) {}

  setQuery(query: string) {
    this.querySubject.next(query);
    this.pageSubject.next(1);
  }

  setPage(page: number) {
    this.pageSubject.next(page);
  }

  setPerPage(perPage: number) {
    this.perPageSubject.next(perPage);
    this.pageSubject.next(1);
  }

  setMode(mode: ViewMode) {
    this.modeSubject.next(mode);
    this.pageSubject.next(1);
    this.reload();
  }

  resetFilters() {
    this.querySubject.next('');
    this.pageSubject.next(1);
  }

  reload() {
    const q = this.querySubject.value || undefined;
    const page = this.pageSubject.value;
    const per_page = this.perPageSubject.value;
    const mode = this.modeSubject.value;

    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    if (mode === 'detail') {
      this.clientService.getClients({ q, page, per_page })
        .pipe(finalize(() => this.loadingSubject.next(false)))
        .subscribe({
          next: (response) => this.clientsDetailSubject.next(response),
          error: (err) => {
            console.error(err);
            this.errorSubject.next('Error cargando clientes');
          }
        });
    } else {
      this.clientService.getClientsLite({ q, page, per_page })
        .pipe(finalize(() => this.loadingSubject.next(false)))
        .subscribe({
          next: (response) => this.clientsLiteSubject.next(response),
          error: (err) => {
            console.error(err);
            this.errorSubject.next('Error cargando clientes');
          }
        });
    }
  }

  reloadDetail() {
    this.setMode('detail');
  }

  reloadLite() {
    this.setMode('lite');
  }

  createClient(client: Partial<Client>) {
    return this.clientService.createClient(client);
  }

  updateClient(id: number, client: Partial<Client>) {
    return this.clientService.updateClient(id, client);
  }

  deleteClient(id: number) {
    return this.clientService.deleteClient(id);
  }

  getClient(id: number) {
    return this.clientService.getClient(id);
  }
}
