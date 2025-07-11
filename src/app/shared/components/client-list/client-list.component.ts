import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { ClientService } from '@shared/services/client/client.service';
import { Client, ClientFullResponse } from '@shared/interfaces/client.interface';
import { ClientFacade } from '@shared/services/client/client.facade';
import { getReduceName } from '@shared/utils/text.util';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { AvatarModule } from 'primeng/avatar';
import { DialogModule } from 'primeng/dialog';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { ClientDetailComponent } from '@modules/client/components/client-detail/client-detail.component';
import { MenuModule } from 'primeng/menu';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    PaginatorModule,
    AvatarModule,
    DialogModule,
    LoaderDialogComponent,
    ClientDetailComponent,
    MenuModule,
  ],
  templateUrl: './client-list.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ClientListComponent implements OnInit {
  clients$;
  loading$;
  error$;

  @Input() showActions = true;

  @ViewChild(LoaderDialogComponent) loader!: LoaderDialogComponent;

  @Output() edit = new EventEmitter<number>();
  @Output() viewDetail = new EventEmitter<number>();
  @Output() clientSelected = new EventEmitter<Client>();

  selectedClient?: ClientFullResponse;
  detailDialogVisible = false;

  constructor(
    private clientFacade: ClientFacade,
    private clientService: ClientService,
  ) {
    this.clients$ = this.clientFacade.clients$;
    this.loading$ = this.clientFacade.loading$;
    this.error$ = this.clientFacade.error$;
  }

  ngOnInit(): void {
    this.clientFacade.resetFilters();
    this.clientFacade.reload();
  }

  onSearch(term: string) {
    if (term.length === 0) {
      this.clientFacade.setQuery('');
      this.clientFacade.reload();
    } else if (term.length >= 3) {
      this.clientFacade.setQuery(term);
      this.clientFacade.reload();
    }
  }

  onPageChange(page: number) {
    this.clientFacade.setPage(page);
    this.clientFacade.reload();
  }

  onReload() {
    this.clientFacade.reload();
  }

  onPrimePageChange(event: { page?: number }) {
    const pageNumber = (event.page ?? 0) + 1;
    this.clientFacade.setPage(pageNumber);
    this.clientFacade.reload();
  }

  getInitials(nombreCompleto: string): string {
    return getReduceName(nombreCompleto);
  }

  onViewDetail(id: number) {
    this.detailDialogVisible = false;
    this.loader.open('Cargando información...');

    this.clientService.getClient(id).subscribe({
      next: (client) => {
        this.loader.close();
        this.selectedClient = client;
        this.detailDialogVisible = true;
        this.viewDetail.emit(id);
      },
      error: (err) => {
        this.loader.close();
        console.error(err);
        this.detailDialogVisible = false;
      }
    });
  }

  onSelectClient(client: Client) {
    this.clientSelected.emit(client);
  }

  onCloseDetail() {
    this.selectedClient = undefined;
    this.detailDialogVisible = false;
  }

  onEdit(id: number) {
    this.edit.emit(id);
  }

  getClientActions(clientId: number) {
    return [
      {
        label: 'Ver Detalle',
        icon: 'pi pi-search',
        command: () => this.onViewDetail(clientId)
      },
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => this.onEdit(clientId)
      }
    ];
  }
}
