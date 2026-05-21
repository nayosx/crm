import { Component, OnInit, ViewChild, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { AmPmTimePipe } from '@shared/pipes/am-pm-time.pipe';
import { LaundryDeliveryService } from '@shared/services/laundry/laundry-delivery.service';

import {
  DispatchStatus,
  LaundryDeliveryEnriched
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
    AmPmTimePipe,
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
  styleUrl: './dispatch-worker.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class WorkerDispatchComponent implements OnInit {
  private readonly deliveryService = inject(LaundryDeliveryService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  @ViewChild(LoaderDialogComponent) loader?: LoaderDialogComponent;

  readonly assigned = signal<LaundryDeliveryEnriched[]>([]);
  readonly enRoute = signal<LaundryDeliveryEnriched[]>([]);
  readonly delivered = signal<LaundryDeliveryEnriched[]>([]);
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
      to_date: today,
      per_page: 500,
      format: 'detailed'
    }).subscribe({
      next: (res) => this.assigned.set([...(res.items as LaundryDeliveryEnriched[])].sort((a, b) =>
        new Date(a.scheduled_departure_time).getTime() - new Date(b.scheduled_departure_time).getTime()
      )),
      error: () => this.assigned.set([])
    });

    this.deliveryService.getAll({
      driver_id: driverId,
      status: 'EN_ROUTE',
      per_page: 500,
      format: 'detailed'
    }).subscribe({
      next: (res) => this.enRoute.set([...(res.items as LaundryDeliveryEnriched[])].sort((a, b) => {
        const aTime = a.actual_departure_time ? new Date(a.actual_departure_time).getTime() : Infinity;
        const bTime = b.actual_departure_time ? new Date(b.actual_departure_time).getTime() : Infinity;
        return aTime - bTime;
      })),
      error: () => this.enRoute.set([])
    });

    this.deliveryService.getAll({
      driver_id: driverId,
      status: 'DELIVERED',
      from_date: today,
      per_page: 500,
      format: 'detailed'
    }).subscribe({
      next: (res) => {
        this.delivered.set([...(res.items as LaundryDeliveryEnriched[])].sort((a, b) => {
          const aTime = a.actual_delivery_time ? new Date(a.actual_delivery_time).getTime() : Infinity;
          const bTime = b.actual_delivery_time ? new Date(b.actual_delivery_time).getTime() : Infinity;
          return aTime - bTime;
        }));
        this.loading.set(false);
      },
      error: () => {
        this.delivered.set([]);
        this.loading.set(false);
      }
    });
  }

  accept(dispatch: LaundryDeliveryEnriched): void {
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
      acceptButtonProps: { severity: 'success' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.doUpdateStatus(dispatch.id, 'EN_ROUTE')
    });
  }

  markDelivered(dispatch: LaundryDeliveryEnriched): void {
    this.confirmationService.confirm({
      header: 'Marcar como entregado',
      message: `¿Confirmar entrega del despacho #${dispatch.id}?`,
      icon: 'pi pi-check-circle',
      acceptLabel: 'Sí, entregado',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'success' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.doUpdateStatus(dispatch.id, 'DELIVERED')
    });
  }

  openReject(dispatch: LaundryDeliveryEnriched): void {
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

  getClientAddress(dispatch: LaundryDeliveryEnriched): string | undefined {
    return dispatch.client?.addresses?.[0]?.address_text;
  }

  getDispatchTypeLabel(dispatch: LaundryDeliveryEnriched): string {
    return dispatch.service?.status === 'PENDING' ? 'Recolecta' : 'Entrega';
  }

  getDispatchTypeSeverity(dispatch: LaundryDeliveryEnriched): 'info' | 'success' {
    return dispatch.service?.status === 'PENDING' ? 'info' : 'success';
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

  getReactionMinutes(dispatch: LaundryDeliveryEnriched): number | null {
    if (!dispatch.actual_departure_time || !dispatch.scheduled_departure_time) return null;
    const diff = new Date(dispatch.actual_departure_time).getTime() - new Date(dispatch.scheduled_departure_time).getTime();
    return Math.round(diff / 60000);
  }

  getDelayMinutes(dispatch: LaundryDeliveryEnriched): number | null {
    if (!dispatch.actual_delivery_time || !dispatch.customer_expected_time) return null;
    const diff = new Date(dispatch.actual_delivery_time).getTime() - new Date(dispatch.customer_expected_time).getTime();
    return Math.round(diff / 60000);
  }

  getRoadMinutes(dispatch: LaundryDeliveryEnriched): number | null {
    if (!dispatch.actual_delivery_time || !dispatch.actual_departure_time) return null;
    const diff = new Date(dispatch.actual_delivery_time).getTime() - new Date(dispatch.actual_departure_time).getTime();
    return Math.round(diff / 60000);
  }

  getTimelinessLabel(dispatch: LaundryDeliveryEnriched): string | null {
    const minutes = this.getTimelinessMinutes(dispatch);
    if (minutes === null) return null;
    if (minutes >= 30) return 'Muy tarde';
    if (minutes >= 20) return 'Tarde';
    return 'A tiempo';
  }

  getTimelinessSeverity(dispatch: LaundryDeliveryEnriched): 'success' | 'warn' | 'danger' {
    const minutes = this.getTimelinessMinutes(dispatch) ?? 0;
    if (minutes >= 30) return 'danger';
    if (minutes >= 20) return 'warn';
    return 'success';
  }

  getTimelinessClass(dispatch: LaundryDeliveryEnriched): string {
    const minutes = this.getTimelinessMinutes(dispatch) ?? 0;
    if (minutes >= 30) return 'card-timeline-very-late';
    if (minutes >= 20) return 'card-timeline-late';
    return 'card-timeline-on-time';
  }

  private getTimelinessMinutes(dispatch: LaundryDeliveryEnriched): number | null {
    if (dispatch.status === 'DELIVERED') return null;
    const targetTime = dispatch.status === 'ASSIGNED'
      ? dispatch.scheduled_departure_time
      : dispatch.customer_expected_time;
    if (!targetTime) return null;
    return Math.round((Date.now() - new Date(targetTime).getTime()) / 60000);
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
