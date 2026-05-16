import { Component, OnInit, ViewChild, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CalendarOptions, DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayjs from 'dayjs';
import { finalize } from 'rxjs';

import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { LaundryDeliveryService } from '@shared/services/laundry/laundry-delivery.service';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { UserService } from '@shared/services/user/user.service';

import { LaundryServiceCompact } from '@shared/interfaces/laundry-service.interface';
import { LaundryDelivery, LaundryDeliveryDetail } from '@shared/interfaces/delivery-dispatch.interface';
import { User } from '@shared/interfaces/user.interface';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';

import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-dispatch-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FullCalendarModule,
    BackButtonComponent,
    LoaderDialogComponent,
    ButtonModule,
    CardModule,
    ChipModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule,
    DividerModule,
    DropdownModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    TabViewModule,
    TagModule,
    TextareaModule,
    ToastModule,
    ToolbarModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './dispatch-manager.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ManagerDispatchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly deliveryService = inject(LaundryDeliveryService);
  private readonly laundryService = inject(LaundryService);
  private readonly userService = inject(UserService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  @ViewChild(LoaderDialogComponent) loader?: LoaderDialogComponent;

  readonly calendarLoading = signal<boolean>(false);
  readonly calendarError = signal<string | null>(null);
  readonly dispatches = signal<LaundryDelivery[]>([]);
  readonly readyServices = signal<LaundryServiceCompact[]>([]);
  readonly drivers = signal<User[]>([]);
  readonly selectedDispatch = signal<LaundryDeliveryDetail | null>(null);

  readonly createDialogVisible = signal<boolean>(false);
  readonly detailPanelVisible = signal<boolean>(false);
  readonly createLoading = signal<boolean>(false);

  readonly calendarOptions = signal<CalendarOptions>(this.buildCalendarOptions());
  readonly calendarCoverage = signal<{ start: string; end: string } | null>(null);

  readonly assignedCount = computed(() => this.dispatches().filter(d => d.status === 'ASSIGNED').length);
  readonly enRouteCount = computed(() => this.dispatches().filter(d => d.status === 'EN_ROUTE').length);
  readonly deliveredCount = computed(() => this.dispatches().filter(d => d.status === 'DELIVERED').length);
  readonly rejectedCount = computed(() => this.dispatches().filter(d => d.status === 'REJECTED').length);

  createForm!: FormGroup;

  ngOnInit(): void {
    this.initCreateForm();
    this.loadDrivers();
    this.ensureCalendarRange(
      dayjs().startOf('week').format('YYYY-MM-DD'),
      dayjs().endOf('week').format('YYYY-MM-DD')
    );
  }

  initCreateForm(): void {
    this.createForm = this.fb.group({
      laundry_service_id: [null, Validators.required],
      driver_id: [null, Validators.required],
      scheduled_departure_time: [null, Validators.required],
      customer_expected_time: [null, Validators.required],
      notes: [null]
    });
  }

  buildCalendarOptions(): CalendarOptions {
    return {
      plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
      initialView: 'timeGridWeek',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: ''
      },
      height: 'auto',
      allDaySlot: false,
      slotMinTime: '07:00:00',
      slotMaxTime: '21:00:00',
      events: [],
      eventClick: (event) => this.onEventClick(event),
      datesSet: (event) => this.onDatesSet(event)
    };
  }

  onDatesSet(event: DatesSetArg): void {
    const start = dayjs(event.start).format('YYYY-MM-DD');
    const end = dayjs(event.end).subtract(1, 'day').format('YYYY-MM-DD');
    this.ensureCalendarRange(start, end);
  }

  ensureCalendarRange(start: string, end: string): void {
    const coverage = this.calendarCoverage();
    if (coverage && coverage.start <= start && coverage.end >= end) {
      this.syncCalendarEvents();
      return;
    }
    this.fetchDispatches(start, end);
  }

  fetchDispatches(start: string, end: string): void {
    this.calendarLoading.set(true);
    this.calendarError.set(null);

    this.deliveryService.getAll({
      from_date: start,
      to_date: end,
      per_page: 500
    }).pipe(
      finalize(() => this.calendarLoading.set(false))
    ).subscribe({
      next: (res) => {
        this.dispatches.set(res.items);
        this.calendarCoverage.set({ start, end });
        this.syncCalendarEvents();
      },
      error: () => {
        this.calendarError.set('No se pudieron cargar los despachos.');
        this.syncCalendarEvents();
      }
    });
  }

  syncCalendarEvents(): void {
    const events = this.buildCalendarEvents(this.dispatches());
    this.calendarOptions.update((opts) => ({ ...opts, events }));
  }

  buildCalendarEvents(items: LaundryDelivery[]): EventInput[] {
    return items.map((item) => {
      const colorMap: Record<string, string> = {
        ASSIGNED: '#f59e0b',
        EN_ROUTE: '#3b82f6',
        DELIVERED: '#16a34a',
        REJECTED: '#dc2626'
      };
      const borderMap: Record<string, string> = {
        ASSIGNED: '#d97706',
        EN_ROUTE: '#2563eb',
        DELIVERED: '#15803d',
        REJECTED: '#b91c1c'
      };

      return {
        id: String(item.id),
        title: `#${item.id} - ${item.status}`,
        start: item.scheduled_departure_time,
        end: item.customer_expected_time,
        backgroundColor: colorMap[item.status] ?? '#94a3b8',
        borderColor: borderMap[item.status] ?? '#64748b',
        textColor: '#ffffff',
        extendedProps: { dispatch: item }
      };
    });
  }

  onEventClick(event: EventClickArg): void {
    const raw = event.event.extendedProps['dispatch'] as LaundryDelivery;
    if (!raw) return;
    this.openDetail(raw.id);
  }

  openDetail(dispatchId: number): void {
    this.loader?.open('Cargando detalle...');
    this.deliveryService.getById(dispatchId).pipe(
      finalize(() => this.loader?.close())
    ).subscribe({
      next: (detail) => {
        this.selectedDispatch.set(detail);
        this.detailPanelVisible.set(true);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el detalle.' });
      }
    });
  }

  openCreateDialog(): void {
    this.createForm.reset();
    this.loadReadyServices();
    this.createDialogVisible.set(true);
  }

  loadReadyServices(): void {
    this.laundryService.getCompact({ status: 'READY_FOR_DELIVERY' }).subscribe({
      next: (res) => this.readyServices.set(res.items),
      error: () => this.readyServices.set([])
    });
  }

  loadDrivers(): void {
    this.userService.getUsers().subscribe({
      next: (res) => this.drivers.set(res as User[]),
      error: () => this.drivers.set([])
    });
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const formValue = this.createForm.getRawValue();
    this.createLoading.set(true);

    this.deliveryService.create({
      laundry_service_id: formValue.laundry_service_id,
      manager_id: this.getCurrentUserId(),
      driver_id: formValue.driver_id,
      scheduled_departure_time: this.toUtcIsoString(formValue.scheduled_departure_time),
      customer_expected_time: this.toUtcIsoString(formValue.customer_expected_time),
      notes: formValue.notes
    }).pipe(
      finalize(() => this.createLoading.set(false))
    ).subscribe({
      next: () => {
        this.createDialogVisible.set(false);
        this.messageService.add({ severity: 'success', summary: 'Despacho creado', detail: 'La entrega fue agendada correctamente.' });
        this.refreshCalendar();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el despacho.' });
      }
    });
  }

  confirmCancel(dispatch: LaundryDeliveryDetail): void {
    this.confirmationService.confirm({
      header: 'Cancelar despacho',
      message: `¿Cancelar despacho #${dispatch.id}? El servicio volverá a READY_FOR_DELIVERY.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cancelar',
      rejectLabel: 'No',
      accept: () => this.doCancel(dispatch.id)
    });
  }

  private doCancel(id: number): void {
    this.loader?.open('Cancelando...');
    this.deliveryService.updateStatus(id, { status: 'REJECTED' }).pipe(
      finalize(() => this.loader?.close())
    ).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Cancelado', detail: 'Despacho cancelado correctamente.' });
        this.detailPanelVisible.set(false);
        this.refreshCalendar();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cancelar el despacho.' });
      }
    });
  }

  refreshCalendar(): void {
    const coverage = this.calendarCoverage();
    if (coverage) {
      this.fetchDispatches(coverage.start, coverage.end);
    }
  }

  getCurrentUserId(): number {
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

  toUtcIsoString(date: Date | string | null): string {
    if (!date) return '';
    return new Date(date).toISOString().slice(0, 19);
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
}
