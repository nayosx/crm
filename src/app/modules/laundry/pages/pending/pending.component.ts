import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';

import { LaundryServiceCompact } from '@shared/interfaces/laundry-service.interface';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { PendingCreateLaundryFormComponent } from './pending-create-laundry-form.component';

type CreateLaundryPayload = {
  client_id: number;
  client_address_id: number;
  scheduled_pickup_at: string;
  status: 'PENDING';
  service_label: 'NORMAL' | 'EXPRESS';
  transaction_id: null;
};

@Component({
  selector: 'app-pending',
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DialogModule,
    TagModule,
    MessageModule,
    ProgressSpinnerModule,
    PendingCreateLaundryFormComponent
  ],
  templateUrl: './pending.component.html',
  encapsulation: ViewEncapsulation.None
})
export class PendingComponent implements OnInit {
  readonly items = signal<LaundryServiceCompact[]>([]);
  readonly loading = signal<boolean>(true);
  readonly savingOrder = signal<boolean>(false);
  readonly creating = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly createDialogVisible = signal<boolean>(false);

  private dragIndex: number | null = null;
  private previousItems: LaundryServiceCompact[] = [];

  constructor(
    private readonly laundryService: LaundryService,
    private readonly router: Router
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

  loadPending(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.laundryService.getCompact({
      status: 'PENDING',
      page: 1,
      per_page: 200
    }).subscribe({
      next: (response) => {
        this.items.set(response.items);
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
    this.dragIndex = null;

    this.persistOrder(updated.map((item) => item.id));
  }

  onDragEnd(): void {
    this.dragIndex = null;
  }

  openDetail(item: LaundryServiceCompact): void {
    this.router.navigate(['/laundry', item.id, 'detail'], {
      queryParams: { status: 'PENDING' }
    });
  }

  trackByLaundryId(_: number, item: LaundryServiceCompact): number {
    return item.id;
  }

  createPendingService(payload: CreateLaundryPayload): void {
    this.creating.set(true);
    this.errorMessage.set(null);

    this.laundryService.create(payload).subscribe({
      next: () => {
        this.creating.set(false);
        this.createDialogVisible.set(false);
        this.loadPending();
      },
      error: () => {
        this.creating.set(false);
        this.errorMessage.set('No se pudo crear el servicio de lavandería.');
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
}
