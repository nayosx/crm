import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { ClientFacade } from '@shared/services/client.facade';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';


@Component({
  selector: 'app-client-page',
  imports: [
    CommonModule,
    ButtonModule,
    PaginatorModule,
  ],
  templateUrl: './client-page.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ClientPageComponent implements OnInit {
  clients$;
  loading$;
  error$;

  constructor(private clientFacade: ClientFacade, private router: Router) {
    this.clients$ = this.clientFacade.clients$;
    this.loading$ = this.clientFacade.loading$;
    this.error$ = this.clientFacade.error$;
  }

  ngOnInit(): void {
    this.clientFacade.reload();
  }

  onSearch(term: string) {
    this.clientFacade.setQuery(term);
  }

  onPageChange(page: number) {
    this.clientFacade.setPage(page);
  }

  onReload() {
    this.clientFacade.reload();
  }

  onCreate() {
    this.router.navigate(['/clients/create']);
  }

  onEdit(id: number) {
    this.router.navigate(['/clients', id, 'edit']);
  }


  onPrimePageChange(event: { page?: number }) {
    const pageNumber = (event.page ?? 0) + 1;
    this.clientFacade.setPage(pageNumber);
  }



}