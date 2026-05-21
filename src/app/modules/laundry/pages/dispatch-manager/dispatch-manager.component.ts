import { Component, OnInit, ViewChild, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CalendarOptions, DatesSetArg, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { FullCalendarModule } from '@fullcalendar/angular';
import esLocale from '@fullcalendar/core/locales/es';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { finalize } from 'rxjs';

import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { BottomNavigationComponent, BottomNavigationAction } from '@shared/components/bottom-navigation/bottom-navigation.component';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { AmPmTimePipe } from '@shared/pipes/am-pm-time.pipe';
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
    BottomNavigationComponent,
    LoaderDialogComponent,
    AmPmTimePipe,
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
  styleUrl: './dispatch-manager.component.scss',
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
  readonly serviceType = signal<'PENDING' | 'READY_FOR_DELIVERY'>('READY_FOR_DELIVERY');
  readonly currentStep = signal<1 | 2>(1);

  readonly dialogHeader = computed(() => this.serviceType() === 'PENDING' ? 'Agendar nueva recolecta' : 'Agendar nueva entrega');
  readonly serviceTypeLabel = computed(() => this.serviceType() === 'PENDING' ? 'Servicio pendiente de recolecta' : 'Servicio listo para entrega');

  readonly calendarOptions = signal<CalendarOptions>(this.buildCalendarOptions());
  readonly calendarCoverage = signal<{ start: string; end: string } | null>(null);

  private fetchInProgress = false;

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
      hiddenDays: [6],
      locale: esLocale,
      dayHeaderFormat: { weekday: 'short', day: 'numeric' },
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: ''
      },
      height: 'auto',
      allDaySlot: false,
      slotMinTime: '07:00:00',
      slotMaxTime: '23:00:00',
      slotLabelFormat: { hour: 'numeric', minute: '2-digit', hour12: true },
      editable: true,
      snapDuration: '00:05:00',
      eventDragMinDistance: 10,
      eventAllow: (dropInfo, draggedEvent) => {
        if (!draggedEvent) return false;
        const dispatch = draggedEvent.extendedProps['dispatch'] as LaundryDelivery;
        if (dispatch?.status !== 'ASSIGNED') return false;
        const today = dayjs().startOf('day');
        const newStart = dayjs(dropInfo.start);
        return newStart.valueOf() >= today.valueOf();
      },
      events: [],
      eventClick: (event) => this.onEventClick(event),
      eventDrop: (info) => this.onEventDrop(info),
      eventResize: (info) => this.onEventResize(info),
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
    if (this.fetchInProgress) {
      return;
    }

    this.fetchInProgress = true;
    this.calendarLoading.set(true);
    this.calendarError.set(null);

    this.deliveryService.getAll({
      from_date: start,
      to_date: end,
      per_page: 500
    }).pipe(
      finalize(() => {
        this.calendarLoading.set(false);
        this.fetchInProgress = false;
      })
    ).subscribe({
      next: (res) => {
        this.dispatches.set(res.items);
        this.calendarCoverage.set({ start, end });
        this.syncCalendarEvents();
      },
      error: (err) => {
        console.error('[dispatch-manager] API error:', err);
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
        title: `#${item.id} - ${this.getStatusLabel(item.status)}`,
        start: item.scheduled_departure_time,
        end: item.customer_expected_time,
        allDay: false,
        editable: item.status === 'ASSIGNED',
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
    this.serviceType.set('READY_FOR_DELIVERY');
    this.currentStep.set(1);
    this.createDialogVisible.set(true);
  }

  loadServicesForType(status: string): void {
    this.laundryService.getCompact({ status: status as any }).subscribe({
      next: (res) => this.readyServices.set(res.items),
      error: () => this.readyServices.set([])
    });
  }

  onServiceTypeChange(status: 'PENDING' | 'READY_FOR_DELIVERY'): void {
    this.serviceType.set(status);
    this.createForm.get('laundry_service_id')?.reset();
    this.loadServicesForType(status);
    this.currentStep.set(2);
  }

  goBackToStep1(): void {
    this.currentStep.set(1);
    this.serviceType.set('READY_FOR_DELIVERY');
    this.createForm.get('laundry_service_id')?.reset();
  }

  onDialogVisibilityChange(visible: boolean): void {
    this.createDialogVisible.set(visible);
    if (!visible) {
      this.currentStep.set(1);
    }
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
      scheduled_departure_time: dayjs(this.snapTo5Minutes(formValue.scheduled_departure_time)).format('YYYY-MM-DDTHH:mm:ss'),
      customer_expected_time: dayjs(this.snapTo5Minutes(formValue.customer_expected_time)).format('YYYY-MM-DDTHH:mm:ss'),
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

  getCalendarEventCount(): number {
    const ev = this.calendarOptions().events;
    return Array.isArray(ev) ? ev.length : 0;
  }

  snapTo5Minutes(date: Date): Date {
    const d = dayjs(date);
    const minutes = d.minute();
    const snapped = Math.round(minutes / 5) * 5;
    return d.minute(snapped).second(0).millisecond(0).toDate();
  }

  onDateTimeSelect(controlName: string, date: Date): void {
    const snapped = this.snapTo5Minutes(date);
    this.createForm.get(controlName)?.setValue(snapped);
  }

  formatTime(date: Date): string {
    return dayjs(date).locale('es').format('ddd D MMM, h:mm A');
  }

  bottomNavigationActions(): BottomNavigationAction[] {
    return [
      {
        id: 'create-dispatch',
        label: 'Nuevo despacho',
        icon: 'pi pi-plus',
        mobileMode: 'primary'
      }
    ];
  }

  onBottomNavigationAction(actionId: string): void {
    if (actionId === 'create-dispatch') {
      this.openCreateDialog();
    }
  }

  onEventDrop(info: EventDropArg): void {
    const dispatch = info.event.extendedProps['dispatch'] as LaundryDelivery;
    if (!dispatch) {
      info.revert();
      return;
    }

    const newStart = this.snapTo5Minutes(info.event.start!);
    const newEnd = this.snapTo5Minutes(info.event.end ?? info.event.start!);
    const oldStart = info.oldEvent.start!;
    const oldEnd = info.oldEvent.end ?? info.oldEvent.start!;

    const driver = this.drivers().find(d => d.id === dispatch.driver_id);
    const driverName = driver?.name ?? `#${dispatch.driver_id}`;

    this.confirmationService.confirm({
      header: 'Reagendar despacho',
      message: `<b>Despacho #${dispatch.id}</b><br><br>Repartidor: ${driverName}<br>Hora anterior: ${this.formatTime(oldStart)}<br>Nueva hora de entrega: <b>${this.formatTime(newStart)}</b>`,
      icon: 'pi pi-calendar-clock',
      acceptLabel: 'Reagendar',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'success' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => {
        this.doReschedule(
          dispatch.id,
          dayjs(newStart).format('YYYY-MM-DDTHH:mm:ss'),
          dayjs(newEnd).format('YYYY-MM-DDTHH:mm:ss')
        );
      },
      reject: () => { info.revert(); }
    });
  }

  onEventResize(info: any): void {
    const dispatch = info.event.extendedProps['dispatch'] as LaundryDelivery;
    if (!dispatch) {
      info.revert();
      return;
    }

    const newStart = this.snapTo5Minutes(info.event.start!);
    const newEnd = this.snapTo5Minutes(info.event.end!);
    const oldStart = info.oldEvent.start!;
    const oldEnd = info.oldEvent.end!;

    const driver = this.drivers().find(d => d.id === dispatch.driver_id);
    const driverName = driver?.name ?? `#${dispatch.driver_id}`;

    this.confirmationService.confirm({
      header: 'Reagendar despacho',
      message: `<b>Despacho #${dispatch.id}</b><br><br>Repartidor: ${driverName}<br>Hora anterior: ${this.formatTime(oldStart)} - ${this.formatTime(oldEnd)}<br>Nueva hora de entrega: <b>${this.formatTime(newStart)} - ${this.formatTime(newEnd)}</b>`,
      icon: 'pi pi-calendar-clock',
      acceptLabel: 'Reagendar',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'success' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => {
        this.doReschedule(
          dispatch.id,
          dayjs(newStart).format('YYYY-MM-DDTHH:mm:ss'),
          dayjs(newEnd).format('YYYY-MM-DDTHH:mm:ss')
        );
      },
      reject: () => { info.revert(); }
    });
  }

  private doReschedule(dispatchId: number, newStart: string, newEnd: string): void {
    this.loader?.open('Reagendando...');
    this.deliveryService.update(dispatchId, {
      scheduled_departure_time: newStart,
      customer_expected_time: newEnd
    }).pipe(
      finalize(() => this.loader?.close())
    ).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Reagendado', detail: 'Despacho reagendado correctamente.' });
        this.refreshCalendar();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reagendar el despacho.' });
        this.refreshCalendar();
      }
    });
  }
}
