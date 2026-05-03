import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, Subscription, catchError, of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';

import {
  type LaundryQueueUpdatedEvent,
  type LaundrySocketTransportError
} from '@shared/services/socket/laundry/laundry-socket.types';
import { LaundrySocketService } from '@shared/services/socket/laundry/laundry-socket.service';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import {
  type LaundryServiceCompact,
  type LaundryServiceStatus,
  type LaundryServiceSummaryExtra
} from '@shared/interfaces/laundry-service.interface';
import {
  LaundryPendingQueueTexts,
  LaundryServiceLabelMap,
  LaundrySocketQueueTexts,
  LaundryStatusLabelMap
} from '@shared/i18n/laundry-ui-texts';
import { getLaundryStatusSeverity } from '@shared/utils/color.util';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined;
type ConfirmationDialogMode = 'complete' | 'error';

@Component({
  selector: 'app-pending-queue',
  imports: [
    CommonModule,
    TagModule,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    ProgressSpinnerModule,
    BackButtonComponent,
    LoaderDialogComponent,
    TruncatePipe
  ],
  providers: [ConfirmationService],
  templateUrl: './pending-queue.component.html',
  styleUrl: './pending-queue.component.scss'
})
export class PendingQueueComponent implements OnInit, OnDestroy {
  @ViewChild(LoaderDialogComponent) loader?: LoaderDialogComponent;

  private readonly subscription = new Subscription();
  readonly texts = LaundryPendingQueueTexts;
  readonly connectionTexts = LaundrySocketQueueTexts;
  readonly statusLabels = LaundryStatusLabelMap;
  readonly serviceLabels = LaundryServiceLabelMap;

  readonly items = signal<LaundryServiceCompact[]>([]);
  readonly loading = signal<boolean>(true);
  readonly updatingStatus = signal<boolean>(false);
  readonly preparingConfirmation = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly total = computed(() => this.items().length);
  readonly confirmationDialogMode = signal<ConfirmationDialogMode>('complete');
  readonly confirmDialogHasNote = signal<boolean>(true);
  readonly confirmDialogExtras = signal<LaundryServiceSummaryExtra[]>([]);
  readonly confirmDialogHasExtras = computed(() => this.confirmDialogExtras().length > 0);

  readonly connected$;
  readonly reconnecting$;

  constructor(
    private readonly laundrySocket: LaundrySocketService,
    private readonly laundryService: LaundryService,
    private readonly router: Router,
    private readonly confirmationService: ConfirmationService
  ) {
    this.connected$ = this.laundrySocket.connected$;
    this.reconnecting$ = this.laundrySocket.reconnecting$;
  }

  ngOnInit(): void {
    this.laundrySocket.connect();
    this.bindSocketStreams();
    this.joinPendingRoom();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.laundrySocket.leaveQueue('PENDING').pipe(catchError(() => of(null))).subscribe();
  }

  openDetail(item: LaundryServiceCompact): void {
    this.router.navigate(['/laundry', item.id, 'form-preview'], {
      state: {
        backTo: ['/laundry', 'pending']
      }
    });
  }

  confirmCompleteStep(item: LaundryServiceCompact): void {
    this.preparingConfirmation.set(true);
    this.errorMessage.set(null);
    this.loader?.open('Cargando extras del servicio...');

    this.laundryService.getSummary(item.id).pipe(
      finalize(() => {
        this.preparingConfirmation.set(false);
        this.loader?.close();
      })
    ).subscribe({
      next: (summary) => {
        if (!this.hasAssociatedServices(summary)) {
          this.showMissingServicesError(item);
          return;
        }

        const hasNote = typeof summary.laundry_service.notes === 'string'
          && summary.laundry_service.notes.trim().length > 0;
        this.openCompleteStepConfirmation(item, summary.extras ?? [], hasNote);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los extras del servicio para confirmar el cambio de estado.');
      }
    });
  }

  getSeverity(status: LaundryServiceStatus): TagSeverity {
    const severity = getLaundryStatusSeverity(status);
    return severity === 'warning' ? 'warn' : severity;
  }

  getStatusLabel(status: LaundryServiceStatus): string {
    return this.statusLabels[status];
  }

  getServiceLabel(serviceLabel: LaundryServiceCompact['service_label']): string {
    return this.serviceLabels[serviceLabel];
  }

  getServiceSeverity(serviceLabel: LaundryServiceCompact['service_label']): TagSeverity {
    return serviceLabel === 'EXPRESS' ? 'danger' : 'secondary';
  }

  trackByLaundryId(_: number, item: LaundryServiceCompact): number {
    return item.id;
  }

  getItemColumnClass(): string {
    const total = this.total();

    if (total <= 1) {
      return 'col-12 col-md-6 col-lg-12';
    }

    if (total === 2) {
      return 'col-12 col-md-6 col-lg-6';
    }

    return 'col-12 col-md-6 col-lg-4';
  }

  private updateCurrentStatus(id: number, status: LaundryServiceStatus): void {
    this.updatingStatus.set(true);
    this.errorMessage.set(null);
    this.clearConfirmationContext();
    this.loader?.open('Actualizando estado del servicio...');

    this.laundryService.updateStatus(id, status).pipe(
      finalize(() => {
        this.updatingStatus.set(false);
        this.loader?.close();
      })
    ).subscribe({
      next: () => {
        this.items.set(this.items().filter((item) => item.id !== id));
      },
      error: () => {
        this.errorMessage.set('No se pudo actualizar el estado del servicio.');
      }
    });
  }

  private bindSocketStreams(): void {
    this.subscription.add(
      this.laundrySocket.queueUpdated$.subscribe((event) => {
        this.applyQueueUpdate(event as LaundryQueueUpdatedEvent<LaundryServiceCompact>);
      })
    );

    this.subscription.add(
      this.laundrySocket.queueError$.subscribe((event) => {
        this.errorMessage.set(typeof event.error === 'string' ? event.error : JSON.stringify(event.error));
      })
    );

    this.subscription.add(
      this.laundrySocket.transportError$.subscribe((event: LaundrySocketTransportError) => {
        this.errorMessage.set(event.code != null ? String(event.code) : this.connectionTexts.socketTransportError);
      })
    );
  }

  private joinPendingRoom(): void {
    this.subscription.add(
      this.laundrySocket.joinQueue<LaundryServiceCompact>('PENDING').subscribe({
        next: (ack) => {
          this.items.set(this.sortPendingItems(ack.items));
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(error instanceof Error ? error.message : this.connectionTexts.joinPendingError);
        }
      })
    );
  }

  private applyQueueUpdate(event: LaundryQueueUpdatedEvent<LaundryServiceCompact>): void {
    const statuses = event.filters.status.map((status) => status.toUpperCase());

    if (statuses.length === 0 || statuses.includes('ALL') || statuses.includes('PENDING')) {
      this.items.set(
        this.sortPendingItems(event.items.filter((item) => item.status === 'PENDING'))
      );
      this.loading.set(false);
    }
  }

  private sortPendingItems(items: LaundryServiceCompact[]): LaundryServiceCompact[] {
    return [...items].sort((a, b) => {
      const aOrder = a.pending_order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.pending_order ?? Number.MAX_SAFE_INTEGER;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      return a.id - b.id;
    });
  }

  private openCompleteStepConfirmation(
    item: LaundryServiceCompact,
    extras: LaundryServiceSummaryExtra[],
    hasNote: boolean
  ): void {
    const clientName = item.client?.name || this.texts.unnamedClient;
    const currentStatusLabel = this.getStatusLabel(item.status);
    const nextStatusLabel = this.getStatusLabel('READY_FOR_DELIVERY');

    this.confirmationDialogMode.set('complete');
    this.confirmDialogHasNote.set(hasNote);
    this.confirmDialogExtras.set(extras.filter((extra) => this.hasVisibleExtra(extra)));

    this.confirmationService.confirm({
      header: 'Confirmar cambio de estado',
      message: `Servicio #${item.id} del cliente ${clientName}.`,
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-check-circle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Sí, completar',
        severity: 'warn',
      },
      accept: () => {
        this.updateCurrentStatus(item.id, 'READY_FOR_DELIVERY');
      },
      reject: () => {
        this.clearConfirmationContext();
      }
    });
  }

  private showMissingServicesError(item: LaundryServiceCompact): void {
    const clientName = item.client?.name || this.texts.unnamedClient;

    this.confirmationDialogMode.set('error');
    this.clearConfirmationContext();

    this.confirmationService.confirm({
      header: 'No se puede completar el paso',
      message: `El servicio #${item.id} del cliente ${clientName} no tiene ningun servicio asociado.`,
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectVisible: false,
      acceptButtonProps: {
        label: 'Entendido',
        severity: 'danger',
      },
      accept: () => {
        this.clearConfirmationContext();
      }
    });
  }

  private hasAssociatedServices(summary: {
    manual_items: unknown[];
    weight_service_detail: unknown | null;
  }): boolean {
    return summary.manual_items.length > 0
      || summary.weight_service_detail != null;
  }

  private hasVisibleExtra(extra: LaundryServiceSummaryExtra): boolean {
    return Number(extra.quantity ?? 0) > 0;
  }

  private clearConfirmationContext(): void {
    this.confirmationDialogMode.set('complete');
    this.confirmDialogHasNote.set(true);
    this.confirmDialogExtras.set([]);
  }
}
