import { Component, OnInit, ViewChild, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { LaundryDeliveryService } from '@shared/services/laundry/laundry-delivery.service';

import {
  DispatchStatus,
  LaundryDelivery,
  LaundryDeliveryDetail
} from '@shared/interfaces/delivery-dispatch.interface';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-dispatch-worker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BackButtonComponent,
    LoaderDialogComponent,
    AccordionModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    DialogModule,
    DividerModule,
    MessageModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './dispatch-worker.component.html',
  encapsulation: ViewEncapsulation.None
})
export class WorkerDispatchComponent implements OnInit {
  private readonly deliveryService = inject(LaundryDeliveryService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  @ViewChild(LoaderDialogComponent) loader?: LoaderDialogComponent;

  readonly assigned = signal<LaundryDelivery[]>([]);
  readonly enRoute = signal<LaundryDelivery[]>([]);
  readonly delivered = signal<LaundryDelivery[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly currentDriverId = signal<number>(this.readCurrentUserId());

  readonly rejectDialogVisible = signal<boolean>(false);
  readonly rejectForm!: FormGroup;
  readonly rejectTargetId = signal<number | null>(null);
  readonly rejectLoading = signal<boolean>(false);

  readonly activeAccordionIndex = signal<number | number[] | undefined>(0);

  readonly hasEnRoute = computed(() => this.enRoute().length > 0);
  readonly todayLabel = computed(() => new Date().toLocaleDateString('es-SV'));

  constructor() {
    this.rejectForm = this.fb.group({
      notes: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    const driverId = this.currentDriverId();
    const today = new Date().toISOString().split('T')[0];

    this.deliveryService.getAll({
      driver_id: driverId,
      status: 'ASSIGNED',
      from_date: today,
      per_page: 500
    }).subscribe({
      next: (res) => this.assigned.set(res.items),
      error: () => this.assigned.set([])
    });

    this.deliveryService.getAll({
      driver_id: driverId,
      status: 'EN_ROUTE',
      per_page: 500
    }).subscribe({
      next: (res) => this.enRoute.set(res.items),
      error: () => this.enRoute.set([])
    });

    this.deliveryService.getAll({
      driver_id: driverId,
      status: 'DELIVERED',
      from_date: today,
      per_page: 500
    }).subscribe({
      next: (res) => {
        this.delivered.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.delivered.set([]);
        this.loading.set(false);
      }
    });
  }

  accept(dispatch: LaundryDelivery): void {
    if (this.hasEnRoute()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Acción no permitida',
        detail: 'Solo puedes tener una entrega activa a la vez. Completa o rechaza la actual primero.'
      });
      return;
    }

    this.confirmationService.confirm({
      header: 'Aceptar entrega',
      message: `¿Aceptar despacho #${dispatch.id}? Se marcará como EN RUTA.`,
      icon: 'pi pi-car',
      acceptLabel: 'Sí, aceptar',
      rejectLabel: 'Cancelar',
      accept: () => this.doUpdateStatus(dispatch.id, 'EN_ROUTE')
    });
  }

  markDelivered(dispatch: LaundryDelivery): void {
    this.confirmationService.confirm({
      header: 'Marcar como entregado',
      message: `¿Confirmar entrega del despacho #${dispatch.id}?`,
      icon: 'pi pi-check-circle',
      acceptLabel: 'Sí, entregado',
      rejectLabel: 'Cancelar',
      accept: () => this.doUpdateStatus(dispatch.id, 'DELIVERED')
    });
  }

  openReject(dispatch: LaundryDelivery): void {
    this.rejectTargetId.set(dispatch.id);
    this.rejectForm.reset({ notes: '' });
    this.rejectDialogVisible.set(true);
  }

  submitReject(): void {
    if (this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();
      return;
    }

    const id = this.rejectTargetId();
    if (!id) return;

    const notes = this.rejectForm.value.notes;
    this.rejectLoading.set(true);

    this.deliveryService.updateStatus(id, { status: 'REJECTED', notes }).pipe(
      finalize(() => {
        this.rejectLoading.set(false);
        this.rejectDialogVisible.set(false);
      })
    ).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Rechazado', detail: 'El despacho fue rechazado.' });
        this.loadAll();
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'No se pudo rechazar el despacho.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
      }
    });
  }

  private doUpdateStatus(id: number, status: DispatchStatus): void {
    this.loader?.open(status === 'EN_ROUTE' ? 'Aceptando...' : 'Confirmando entrega...');

    this.deliveryService.updateStatus(id, { status }).pipe(
      finalize(() => this.loader?.close())
    ).subscribe({
      next: () => {
        const label = status === 'EN_ROUTE' ? 'En ruta' : 'Entregado';
        this.messageService.add({ severity: 'success', summary: label, detail: `Despacho #${id} actualizado.` });
        this.loadAll();
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'No se pudo actualizar el despacho.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
      }
    });
  }

  openMap(address: string | undefined): void {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }

  getClientAddress(dispatch: LaundryDelivery): string | undefined {
    // The backend detail response includes nested client_address, but the list response does not.
    // For now, return undefined; the component can load detail if needed.
    return undefined;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      ASSIGNED: 'Asignado',
      EN_ROUTE: 'En ruta',
      DELIVERED: 'Entregado',
      REJECTED: 'Rechazado'
    };
    return labels[status] ?? status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      ASSIGNED: 'warn',
      EN_ROUTE: 'info',
      DELIVERED: 'success',
      REJECTED: 'danger'
    };
    return map[status] ?? 'secondary';
  }

  getReactionMinutes(dispatch: LaundryDelivery): number | null {
    if (!dispatch.actual_departure_time || !dispatch.scheduled_departure_time) return null;
    const diff = new Date(dispatch.actual_departure_time).getTime() - new Date(dispatch.scheduled_departure_time).getTime();
    return Math.round(diff / 60000);
  }

  getDelayMinutes(dispatch: LaundryDelivery): number | null {
    if (!dispatch.actual_delivery_time || !dispatch.customer_expected_time) return null;
    const diff = new Date(dispatch.actual_delivery_time).getTime() - new Date(dispatch.customer_expected_time).getTime();
    return Math.round(diff / 60000);
  }

  getRoadMinutes(dispatch: LaundryDelivery): number | null {
    if (!dispatch.actual_delivery_time || !dispatch.actual_departure_time) return null;
    const diff = new Date(dispatch.actual_delivery_time).getTime() - new Date(dispatch.actual_departure_time).getTime();
    return Math.round(diff / 60000);
  }

  private readCurrentUserId(): number {
    try {
      const raw = sessionStorage.getItem('user');
      if (raw) {
        const user = JSON.parse(raw);
        return user.id ?? 1;
      }
    } catch {
      // ignore
    }
    return 1;
  }
}
