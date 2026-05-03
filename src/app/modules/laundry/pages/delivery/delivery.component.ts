import { Component, ViewChild, ViewEncapsulation, signal } from '@angular/core';
import { LaundryStatusListComponent } from '@modules/laundry/components/laundry-status-list/laundry-status-list.component';
import { LaundryServiceCompact } from '@shared/interfaces/laundry-service.interface';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { LaundryStatusColorMap } from '@shared/utils/color.util';
import { Router } from '@angular/router';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';

@Component({
  selector: 'app-delivery',
  imports: [
    LaundryStatusListComponent,
    CardModule,
    ButtonModule,
    BackButtonComponent,
    ConfirmDialogModule,
    ToastModule,
    LoaderDialogComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './delivery.component.html',
  encapsulation: ViewEncapsulation.None
})
export class DeliveryComponent {
  @ViewChild(LaundryStatusListComponent) statusList?: LaundryStatusListComponent;
  @ViewChild(LoaderDialogComponent) loader?: LoaderDialogComponent;

  statusColorMap = LaundryStatusColorMap;
  finalizingId = signal<number | null>(null);

  constructor(
    private router: Router,
    private laundryService: LaundryService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {}

  handleSelect(item: LaundryServiceCompact):void {
    this.router.navigate(['/laundry', item.id, 'detail'], {
      queryParams: { status: 'READY_FOR_DELIVERY' },
      state: {
        backTo: ['/laundry', 'delivery']
      }
    });
  }

  handleViewDetail(item: LaundryServiceCompact): void {
    this.handleSelect(item);
  }

  handleFinalize(item: LaundryServiceCompact): void {
    if (!item.has_transaction) {
      this.messageService.add({
        severity: 'error',
        summary: 'Cobro pendiente',
        detail: 'No se puede finalizar hasta que se realice el cobro.'
      });
      return;
    }

    const clientName = item.client?.name || 'cliente';
    this.confirmationService.confirm({
      header: 'Confirmar entrega',
      message: `Vas a finalizar servicio #${item.id} de ${clientName}. El estado cambiará a ENTREGADO.`,
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-check-circle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Sí, finalizar',
        severity: 'success',
      },
      accept: () => this.finalizeDelivery(item)
    });
  }

  private finalizeDelivery(item: LaundryServiceCompact): void {
    this.finalizingId.set(item.id);
    this.loader?.open('Finalizando entrega...');

    this.laundryService.updateStatus(item.id, 'DELIVERED').pipe(
      finalize(() => {
        this.finalizingId.set(null);
        this.loader?.close();
      })
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Entrega finalizada',
          detail: `Servicio #${item.id} marcado como entregado.`
        });
        this.statusList?.refresh();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo finalizar la entrega.'
        });
      }
    });
  }

}
