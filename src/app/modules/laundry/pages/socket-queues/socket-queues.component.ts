import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Observable, Subscription, catchError, of } from 'rxjs';
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
  LaundryServiceLabelMap,
  LaundrySocketQueueTexts,
  LaundryStatusLabelMap
} from '@shared/i18n/laundry-ui-texts';
import { getLaundryStatusSeverity } from '@shared/utils/color.util';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined;

@Component({
  selector: 'app-socket-queues',
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    TagModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    BackButtonComponent
  ],
  templateUrl: './socket-queues.component.html',
  styleUrl: './socket-queues.component.scss'
})
export class SocketQueuesComponent implements OnInit, OnDestroy {
  private readonly subscription = new Subscription();
  readonly texts = LaundrySocketQueueTexts;
  readonly statusLabels = LaundryStatusLabelMap;
  readonly serviceLabels = LaundryServiceLabelMap;

  readonly pendingItems = signal<LaundryServiceCompact[]>([]);
  readonly readyItems = signal<LaundryServiceCompact[]>([]);
  readonly pendingLoading = signal<boolean>(true);
  readonly readyLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  readonly pendingCount = computed(() => this.pendingItems().length);
  readonly readyCount = computed(() => this.readyItems().length);

  readonly connected$: Observable<boolean>;
  readonly reconnecting$: Observable<boolean>;

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
    this.joinInitialRooms();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();

    this.laundrySocket.leaveQueue('PENDING').pipe(catchError(() => of(null))).subscribe();
    this.laundrySocket.leaveQueue('READY_FOR_DELIVERY').pipe(catchError(() => of(null))).subscribe();
  }

  openDetail(item: LaundryServiceCompact, status: LaundryServiceStatus): void {
    this.router.navigate(['/laundry', item.id, 'detail'], {
      queryParams: { status },
      state: {
        backTo: ['/laundry', 'socket-queues']
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
        this.errorMessage.set(event.code ?? this.texts.socketTransportError);
      })
    );
  }

  private joinInitialRooms(): void {
    this.subscription.add(
      this.laundrySocket.joinQueue<LaundryServiceCompact>('PENDING').subscribe({
        next: (ack) => {
          this.pendingItems.set(ack.items);
          this.pendingLoading.set(false);
        },
        error: (error: unknown) => {
          this.pendingLoading.set(false);
          this.errorMessage.set(error instanceof Error ? error.message : this.texts.joinPendingError);
        }
      })
    );

    this.subscription.add(
      this.laundrySocket.joinQueue<LaundryServiceCompact>('READY_FOR_DELIVERY').subscribe({
        next: (ack) => {
          this.readyItems.set(ack.items);
          this.readyLoading.set(false);
        },
        error: (error: unknown) => {
          this.readyLoading.set(false);
          this.errorMessage.set(error instanceof Error ? error.message : this.texts.joinReadyError);
        }
      })
    );
  }

  private applyQueueUpdate(event: LaundryQueueUpdatedEvent<LaundryServiceCompact>): void {
    const statuses = event.filters.status.map((status) => status.toUpperCase());

    if (statuses.length === 0 || statuses.includes('ALL')) {
      this.pendingItems.set(event.items.filter((item) => item.status === 'PENDING'));
      this.readyItems.set(event.items.filter((item) => item.status === 'READY_FOR_DELIVERY'));
      return;
    }

    if (statuses.includes('PENDING')) {
      this.pendingItems.set(event.items.filter((item) => item.status === 'PENDING'));
      this.pendingLoading.set(false);
    }

    if (statuses.includes('READY_FOR_DELIVERY')) {
      this.readyItems.set(event.items.filter((item) => item.status === 'READY_FOR_DELIVERY'));
      this.readyLoading.set(false);
    }
  }
}
