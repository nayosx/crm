import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, finalize, switchMap, tap } from 'rxjs';
import { ClientService } from './client.service';
import { Client, ClientPageResponse } from '@shared/interfaces/client.interface';

@Injectable({
  providedIn: 'root'
})
export class ClientFacade {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private clientsSubject = new BehaviorSubject<ClientPageResponse | null>(null);
  private errorSubject = new BehaviorSubject<string | null>(null);

  private querySubject = new BehaviorSubject<string>('');
  private pageSubject = new BehaviorSubject<number>(1);

  loading$ = this.loadingSubject.asObservable();
  clients$ = this.clientsSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  query$ = this.querySubject.asObservable();
  page$ = this.pageSubject.asObservable();

  constructor(private clientService: ClientService) {
    combineLatest([
      this.query$.pipe(debounceTime(300)),
      this.page$
    ])
      .pipe(
        tap(() => {
          this.loadingSubject.next(true);
          this.errorSubject.next(null);
        }),
        switchMap(([q, page]) =>
          this.clientService.getClients({
            q: q || undefined,
            page: page,
            per_page: 8
          }).pipe(
            finalize(() => this.loadingSubject.next(false))
          )
        )
      )
      .subscribe({
        next: (response) => this.clientsSubject.next(response),
        error: (err) => {
          console.error(err);
          this.errorSubject.next('Error cargando clientes');
        }
      });
  }


  setQuery(query: string) {
    this.querySubject.next(query);
    this.pageSubject.next(1);
  }

  setPage(page: number) {
    this.pageSubject.next(page);
  }

  reload() {
    this.pageSubject.next(this.pageSubject.value);
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
