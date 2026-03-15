import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, catchError, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DataViewModule } from 'primeng/dataview';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { BackButtonComponent } from '@shared/components/back/back-button.component';

import {
  type LaundryQueueUpdatedEvent,
  type LaundrySocketTransportError
} from '@shared/services/socket/laundry/laundry-socket.types';
import { LaundrySocketService } from '@shared/services/socket/laundry/laundry-socket.service';
import {
  type LaundryServiceCompact,
  type LaundryServiceStatus
} from '@shared/interfaces/laundry-service.interface';
import {
  LaundryPendingQueueTexts,
  LaundryServiceLabelMap,
  LaundrySocketQueueTexts,
  LaundryStatusLabelMap
} from '@shared/i18n/laundry-ui-texts';
import { getLaundryStatusSeverity } from '@shared/utils/color.util';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined;

@Component({
  selector: 'app-pending-queue',
  imports: [
    CommonModule,
    CardModule,
    DataViewModule,
    TagModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    BackButtonComponent
  ],
  templateUrl: './pending-queue.component.html',
  styleUrl: './pending-queue.component.scss'
})
export class PendingQueueComponent implements OnInit, OnDestroy {
  private readonly subscription = new Subscription();
  readonly texts = LaundryPendingQueueTexts;
  readonly connectionTexts = LaundrySocketQueueTexts;
  readonly statusLabels = LaundryStatusLabelMap;
  readonly serviceLabels = LaundryServiceLabelMap;

  readonly items = signal<LaundryServiceCompact[]>([]);
  readonly loading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly total = computed(() => this.items().length);

  readonly connected$;
  readonly reconnecting$;

  constructor(
    private readonly laundrySocket: LaundrySocketService,
    private readonly router: Router
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
    this.router.navigate(['/laundry', item.id, 'detail'], {
      queryParams: { status: 'PENDING' },
      state: {
        backTo: ['/laundry', 'pending']
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

  private bindSocketStreams(): void {
    this.subscription.add(
      this.laundrySocket.queueUpdated$.subscribe((event) => {
        this.applyQueueUpdate(event as LaundryQueueUpdatedEvent<LaundryServiceCompact>);
      })
    );

    this.subscription.add(
      this.laundrySocket.queueError$.subscribe((event) => {
        this.errorMessage.set(event.error);
      })
    );

    this.subscription.add(
      this.laundrySocket.transportError$.subscribe((event: LaundrySocketTransportError) => {
        this.errorMessage.set(event.code ?? this.connectionTexts.socketTransportError);
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
}
