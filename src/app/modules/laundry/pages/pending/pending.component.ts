import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ViewEncapsulation, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { Menu, MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';

import { LaundryServiceCompact, LaundryServiceStatus } from '@shared/interfaces/laundry-service.interface';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { PendingCreateLaundryFormComponent } from './pending-create-laundry-form.component';
import { PendingCreateClientAddressLaundryFormComponent } from './pending-create-client-address-laundry-form.component';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';
import { BackButtonComponent } from '@shared/components/back/back-button.component';

type CreateLaundryPayload = {
  client_id: number;
  client_address_id: number;
  scheduled_pickup_at: string;
  status: 'PENDING';
  service_label: 'NORMAL' | 'EXPRESS';
  transaction_id: null;
};

type LaundryServiceLabel = 'NORMAL' | 'EXPRESS';

@Component({
  selector: 'app-pending',
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DialogModule,
    ConfirmDialogModule,
    MenuModule,
    TagModule,
    MessageModule,
    ProgressSpinnerModule,
    PendingCreateLaundryFormComponent,
    PendingCreateClientAddressLaundryFormComponent,
    LoaderDialogComponent,
    TruncatePipe,
    BackButtonComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './pending.component.html',
  styles: [`
    .pending-item {
      transition: box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease;
    }

    .pending-item-header {
      gap: 0.8rem;
    }

    .pending-item-title {
      min-width: 0;
      flex: 1 1 auto;
    }

    @media screen and (max-width: 376px) {
      .pending-card-shell {
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
    }

    .pending-item-moved {
      animation: pending-item-drop-highlight 900ms ease;
      border-color: var(--yellow-500);
      box-shadow: 0 0 0 0.35rem rgba(234, 179, 8, 0.18);
    }

    @keyframes pending-item-drop-highlight {
      0% {
        transform: scale(0.985);
        box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.35);
      }
      35% {
        transform: scale(1.015);
        box-shadow: 0 0 0 0.55rem rgba(234, 179, 8, 0.24);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(234, 179, 8, 0);
      }
    }
  `],
  encapsulation: ViewEncapsulation.None
})
export class PendingComponent implements OnInit {
  @ViewChild(LoaderDialogComponent) loader?: LoaderDialogComponent;

  readonly items = signal<LaundryServiceCompact[]>([]);
  readonly loading = signal<boolean>(true);
  readonly savingOrder = signal<boolean>(false);
  readonly creating = signal<boolean>(false);
  readonly updatingStatus = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly createDialogVisible = signal<boolean>(false);
  readonly createWithClientAddressDialogVisible = signal<boolean>(false);
  readonly selectedActionItemId = signal<number | null>(null);
  readonly movedItemId = signal<number | null>(null);

  private dragIndex: number | null = null;
  private previousItems: LaundryServiceCompact[] = [];
  private movedItemAnimationTimeout: ReturnType<typeof setTimeout> | null = null;
  rowActions: MenuItem[] = this.buildRowActions();

  constructor(
    private readonly laundryService: LaundryService,
    private readonly router: Router,
    private readonly confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadPending();
  }

  openCreateDialog(): void {
    this.createDialogVisible.set(true);
  }

  closeCreateDialog(): void {
    if (this.creating()) {
      return;
    }
    this.createDialogVisible.set(false);
  }

  openCreateWithClientAddressDialog(): void {
    this.createWithClientAddressDialogVisible.set(true);
  }

  closeCreateWithClientAddressDialog(): void {
    this.createWithClientAddressDialogVisible.set(false);
  }

  loadPending(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.laundryService.getCompact({
      status: 'PENDING',
      page: 1,
      per_page: 200,
      sort_by: 'pending_order',
      sort_dir: 'asc'
    }).subscribe({
      next: (response) => {
        const ordered = [...response.items].sort((a, b) => {
          const ao = a.pending_order ?? Number.MAX_SAFE_INTEGER;
          const bo = b.pending_order ?? Number.MAX_SAFE_INTEGER;
          if (ao !== bo) return ao - bo;
          return a.id - b.id;
        });

        this.items.set(ordered);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No se pudo cargar la cola de pendientes.');
      }
    });
  }

  onDragStart(index: number): void {
    if (this.savingOrder()) {
      return;
    }
    this.dragIndex = index;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(targetIndex: number): void {
    if (this.dragIndex === null || this.dragIndex === targetIndex || this.savingOrder()) {
      this.dragIndex = null;
      return;
    }

    const updated = [...this.items()];
    this.previousItems = [...updated];

    const [moved] = updated.splice(this.dragIndex, 1);
    updated.splice(targetIndex, 0, moved);

    this.items.set(updated);
    this.highlightMovedItem(moved.id);
    this.dragIndex = null;

    this.persistOrder(updated.map((item) => item.id));
  }

  onDragEnd(): void {
    this.dragIndex = null;
  }

  openDetail(item: LaundryServiceCompact): void {
    this.router.navigate(['/laundry', item.id, 'detail'], {
      queryParams: { status: 'PENDING' },
      state: {
        backTo: ['/laundry', 'pending-board']
      }
    });
  }

  trackByLaundryId(_: number, item: LaundryServiceCompact): number {
    return item.id;
  }

  createPendingService(payload: CreateLaundryPayload): void {
    this.creating.set(true);
    this.errorMessage.set(null);
    this.loader?.open('Creando servicio de lavandería...');

    this.laundryService.create(payload).pipe(
      finalize(() => {
        this.creating.set(false);
        this.loader?.close();
      })
    ).subscribe({
      next: () => {
        this.createDialogVisible.set(false);
        this.loadPending();
      },
      error: () => {
        this.errorMessage.set('No se pudo crear el servicio de lavandería.');
      }
    });
  }

  openItemMenu(event: Event, item: LaundryServiceCompact, menu: Menu): void {
    event.stopPropagation();
    this.selectedActionItemId.set(item.id);
    this.rowActions = this.buildRowActions(item);
    menu.toggle(event);
  }

  onCreatedWithClientAddressFlow(): void {
    this.createWithClientAddressDialogVisible.set(false);
    this.loadPending();
  }

  private updatePendingStatus(id: number, status: LaundryServiceStatus): void {
    this.updatingStatus.set(true);
    this.errorMessage.set(null);
    this.loader?.open('Actualizando estado del servicio...');

    this.laundryService.updateStatus(id, status).pipe(
      finalize(() => {
        this.updatingStatus.set(false);
        this.loader?.close();
      })
    ).subscribe({
      next: () => {
        this.loadPending();
      },
      error: () => {
        this.errorMessage.set('No se pudo actualizar el estado del servicio.');
      }
    });
  }

  private updateServiceLabel(id: number, serviceLabel: LaundryServiceLabel): void {
    this.updatingStatus.set(true);
    this.errorMessage.set(null);
    this.loader?.open('Actualizando tipo de servicio...');

    this.laundryService.update(id, { service_label: serviceLabel }).pipe(
      finalize(() => {
        this.updatingStatus.set(false);
        this.loader?.close();
      })
    ).subscribe({
      next: () => {
        this.loadPending();
      },
      error: () => {
        this.errorMessage.set('No se pudo actualizar el tipo de servicio.');
      }
    });
  }

  private runSelectedItemAction(status: LaundryServiceStatus): void {
    const item = this.getSelectedActionItem();
    if (!item) {
      return;
    }

    const confirmationCopy = this.getStatusConfirmationCopy(item, status);

    this.confirmationService.confirm({
      message: confirmationCopy.message,
      header: confirmationCopy.header,
      closable: true,
      closeOnEscape: true,
      icon: confirmationCopy.icon,
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: confirmationCopy.acceptLabel,
        severity: status === 'CANCELLED' ? 'danger' : 'warn',
      },
      accept: () => {
        this.updatePendingStatus(item.id, status);
      }
    });
  }

  private openSelectedItemDetail(): void {
    const item = this.getSelectedActionItem();
    if (!item) {
      return;
    }

    this.openDetail(item);
  }

  private toggleSelectedItemServiceLabel(): void {
    const item = this.getSelectedActionItem();
    if (!item) {
      return;
    }

    const nextLabel = this.getNextServiceLabel(item.service_label);

    this.confirmationService.confirm({
      header: 'Confirmar tipo de servicio',
      message: `Vas a cambiar el servicio #${item.id} del cliente ${item.client.name || 'Cliente sin nombre'} de ${this.getServiceLabelLabel(item.service_label)} a ${this.getServiceLabelLabel(nextLabel)}.`,
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-bolt',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Sí, actualizar',
        severity: 'warn',
      },
      accept: () => {
        this.updateServiceLabel(item.id, nextLabel);
      }
    });
  }

  private persistOrder(ids: number[]): void {
    this.savingOrder.set(true);
    this.errorMessage.set(null);

    this.laundryService.reorderPending(ids).subscribe({
      next: () => {
        this.savingOrder.set(false);
      },
      error: () => {
        this.items.set(this.previousItems);
        this.savingOrder.set(false);
        this.errorMessage.set('No se pudo actualizar el orden. Se restauró la lista anterior.');
      }
    });
  }

  private highlightMovedItem(id: number): void {
    if (this.movedItemAnimationTimeout) {
      clearTimeout(this.movedItemAnimationTimeout);
    }

    this.movedItemId.set(id);
    this.movedItemAnimationTimeout = setTimeout(() => {
      this.movedItemId.set(null);
      this.movedItemAnimationTimeout = null;
    }, 900);
  }

  private getSelectedActionItem(): LaundryServiceCompact | null {
    const selectedId = this.selectedActionItemId();
    if (!selectedId) {
      return null;
    }

    return this.items().find((item) => item.id === selectedId) ?? null;
  }

  private buildRowActions(item?: LaundryServiceCompact | null): MenuItem[] {
    const selectedItem = item ?? this.getSelectedActionItem();

    return [
      {
        label: 'Ver detalle',
        icon: 'pi pi-arrow-right',
        command: () => this.openSelectedItemDetail()
      },
      {
        label: selectedItem
          ? `Cambiar a ${this.getServiceLabelLabel(this.getNextServiceLabel(selectedItem.service_label))}`
          : 'Cambiar tipo de servicio',
        icon: 'pi pi-bolt',
        command: () => this.toggleSelectedItemServiceLabel()
      },
      {
        label: 'Marcar listo para entrega',
        icon: 'pi pi-truck',
        command: () => this.runSelectedItemAction('READY_FOR_DELIVERY')
      },
      {
        label: 'Cancelar servicio',
        icon: 'pi pi-times-circle',
        command: () => this.runSelectedItemAction('CANCELLED')
      }
    ];
  }

  private getStatusLabel(status: LaundryServiceStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'STARTED':
        return 'Iniciado';
      case 'IN_PROGRESS':
        return 'En proceso';
      case 'READY_FOR_DELIVERY':
        return 'Listo para entrega o envio';
      case 'DELIVERED':
        return 'Entregado';
      case 'CANCELLED':
        return 'Cancelado';
    }
  }

  private getNextServiceLabel(serviceLabel: LaundryServiceLabel): LaundryServiceLabel {
    return serviceLabel === 'EXPRESS' ? 'NORMAL' : 'EXPRESS';
  }

  private getServiceLabelLabel(serviceLabel: LaundryServiceLabel): string {
    return serviceLabel === 'EXPRESS' ? 'Express' : 'Normal';
  }

  private getStatusConfirmationCopy(item: LaundryServiceCompact, status: LaundryServiceStatus): {
    header: string;
    message: string;
    icon: string;
    acceptLabel: string;
  } {
    const clientName = item.client.name || 'Cliente sin nombre';
    const currentStatusLabel = this.getStatusLabel(item.status);
    const nextStatusLabel = this.getStatusLabel(status);

    if (status === 'CANCELLED') {
      return {
        header: 'Confirmar cancelación',
        message: `Vas a cancelar el servicio #${item.id} del cliente ${clientName}. Su estado actual es ${currentStatusLabel}.`,
        icon: 'pi pi-times-circle',
        acceptLabel: 'Sí, cancelar'
      };
    }

    return {
      header: 'Confirmar actualización',
      message: `Vas a actualizar el servicio #${item.id} del cliente ${clientName} de ${currentStatusLabel} a ${nextStatusLabel}.`,
      icon: 'pi pi-truck',
      acceptLabel: 'Sí, actualizar'
    };
  }
}
