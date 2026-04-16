import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarOptions, DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayjs from 'dayjs';
import { Subscription, interval } from 'rxjs';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { KEYSTORE } from '@core/keystore';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { UserData } from '@shared/interfaces/auth.interface';
import {
  LiteUser,
  WorkSession,
  WorkSessionDaySummary,
  WorkSessionsReportRow
} from './models/work-session.model';
import {
  DAILY_TARGET_MINUTES,
  buildDaySummary,
  formatDurationClock,
  formatMinutes,
  getDateKey,
  getTimeLabel,
  groupSessionsByDate,
  isSessionActive,
  parseBackendDurationToMinutes,
  summarizeSessions
} from './utils/work-session-time.util';
import { WorkSessionStatusService } from './services/work-session-status.service';
import { WorkSessionsApiService } from './services/work-sessions-api.service';
import { WorkSessionsHistoryService } from './services/work-sessions-history.service';
import { WorkSessionsReportService } from './services/work-sessions-report.service';

type CalendarCoverage = {
  start: string;
  end: string;
};

type DisplaySession = WorkSession & {
  dateLabel: string;
  loginLabel: string | null;
  logoutLabel: string | null;
  durationLabel: string;
};

@Component({
  selector: 'app-work-sessions',
  imports: [
    CommonModule,
    FormsModule,
    FullCalendarModule,
    BackButtonComponent,
    ButtonModule,
    CardModule,
    ChipModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule,
    DividerModule,
    DropdownModule,
    TextareaModule,
    MessageModule,
    SkeletonModule,
    TableModule,
    TabViewModule,
    TagModule,
    ToastModule,
    ToolbarModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './work-sessions.component.html',
  styleUrl: './work-sessions.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class WorkSessionsComponent implements OnInit, OnDestroy {
  private readonly statusService = inject(WorkSessionStatusService);
  private readonly historyService = inject(WorkSessionsHistoryService);
  private readonly reportService = inject(WorkSessionsReportService);
  private readonly api = inject(WorkSessionsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly subscription = new Subscription();

  readonly dailyTargetLabel = formatMinutes(DAILY_TARGET_MINUTES);
  readonly formatMinutes = formatMinutes;
  readonly activeTabIndex = signal<number>(0);
  readonly now = signal<number>(Date.now());

  readonly currentSession = this.statusService.session;
  readonly currentSessionLoading = this.statusService.loading;
  readonly currentSessionMutating = this.statusService.mutating;
  readonly currentSessionError = this.statusService.error;
  readonly historyLoading = this.historyService.loading;
  readonly historyError = this.historyService.error;
  readonly reportLoading = this.reportService.loading;
  readonly reportError = this.reportService.error;

  readonly users = signal<LiteUser[]>([]);
  readonly usersLoading = signal<boolean>(false);
  readonly usersError = signal<string | null>(null);

  readonly calendarSessions = signal<WorkSession[]>([]);
  readonly calendarLoading = signal<boolean>(false);
  readonly calendarError = signal<string | null>(null);
  readonly calendarCoverage = signal<CalendarCoverage | null>(null);

  readonly selectedDaySummary = signal<WorkSessionDaySummary | null>(null);
  readonly selectedDaySessions = signal<WorkSession[]>([]);
  readonly dayDetailVisible = signal<boolean>(false);

  readonly historyStartDate = signal<Date>(dayjs().startOf('month').toDate());
  readonly historyEndDate = signal<Date>(dayjs().endOf('month').toDate());
  readonly historyUserId = signal<number | null>(null);

  readonly reportStartDate = signal<Date>(dayjs().startOf('month').toDate());
  readonly reportEndDate = signal<Date>(dayjs().endOf('month').toDate());

  readonly forceCloseUserId = signal<number | null>(null);
  readonly forceCloseComments = signal<string>('');
  readonly forceCloseLoading = signal<boolean>(false);

  readonly currentUser = signal<UserData | null>(this.readCurrentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role_id === 1);

  readonly todaySessions = computed(() => {
    const todayKey = dayjs().format('YYYY-MM-DD');
    return this.calendarSessions().filter((session) => getDateKey(session.login_time) === todayKey);
  });

  readonly todaySummary = computed(() => summarizeSessions(this.todaySessions(), this.now()));
  readonly weekSummaries = computed(() => this.buildWeekSummaries());
  readonly weekSummary = computed(() => summarizeSessions(this.getWeekSessions(), this.now()));
  readonly monthSummary = computed(() => summarizeSessions(this.getMonthSessions(), this.now()));
  readonly historyRows = computed<DisplaySession[]>(() =>
    this.historyService.sessions().map((session) => this.toDisplaySession(session))
  );
  readonly reportRows = this.reportService.rows;

  readonly reportKpis = computed(() => this.buildReportKpis(this.reportRows()));

  readonly weekCalendarOptions = signal<CalendarOptions>(this.createWeekCalendarOptions());
  readonly monthCalendarOptions = signal<CalendarOptions>(this.createMonthCalendarOptions());

  ngOnInit(): void {
    this.statusService.loadLatest();
    this.loadUsersIfNeeded();
    this.loadHistory();
    this.loadReport();
    this.ensureCalendarRange(dayjs().startOf('month').format('YYYY-MM-DD'), dayjs().endOf('month').format('YYYY-MM-DD'));

    this.subscription.add(
      interval(1000).subscribe(() => this.now.set(Date.now()))
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  startSession(): void {
    this.statusService.start(() => {
      this.refreshAllViews();
      this.pushToast('success', 'Jornada', this.statusService.message() ?? 'Jornada iniciada.');
    });
  }

  endSession(): void {
    this.statusService.end(() => {
      this.refreshAllViews();
      this.pushToast('success', 'Jornada', this.statusService.message() ?? 'Jornada finalizada.');
    });
  }

  loadHistory(): void {
    this.historyService.load({
      start_date: this.toApiDate(this.historyStartDate()),
      end_date: this.toApiDate(this.historyEndDate()),
      user_id: this.historyUserId() ?? undefined
    });
  }

  loadReport(): void {
    this.reportService.load({
      start_date: this.toApiDate(this.reportStartDate()),
      end_date: this.toApiDate(this.reportEndDate())
    });
  }

  setHistoryStartDate(value: Date | Date[] | null): void {
    if (value instanceof Date) {
      this.historyStartDate.set(value);
    }
  }

  setHistoryEndDate(value: Date | Date[] | null): void {
    if (value instanceof Date) {
      this.historyEndDate.set(value);
    }
  }

  setReportStartDate(value: Date | Date[] | null): void {
    if (value instanceof Date) {
      this.reportStartDate.set(value);
    }
  }

  setReportEndDate(value: Date | Date[] | null): void {
    if (value instanceof Date) {
      this.reportEndDate.set(value);
    }
  }

  downloadCsv(): void {
    const startDate = this.toApiDate(this.reportStartDate());
    const endDate = this.toApiDate(this.reportEndDate());

    this.api.downloadReportCsv({ start_date: startDate, end_date: endDate }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `work-sessions-${startDate}-${endDate}.csv`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        this.pushToast('success', 'Reporte', 'CSV descargado correctamente.');
      },
      error: (error: HttpErrorResponse) => {
        this.pushToast('error', 'Reporte', this.getErrorMessage(error, 'No se pudo descargar el CSV.'));
      }
    });
  }

  confirmForceClose(): void {
    const userId = this.forceCloseUserId();
    const comments = this.forceCloseComments().trim();

    if (!userId || !comments) {
      this.pushToast('warn', 'Cierre manual', 'Selecciona un usuario y agrega un comentario.');
      return;
    }

    const selectedUser = this.users().find((user) => user.id === userId);

    this.confirmationService.confirm({
      header: 'Cerrar jornada manualmente',
      message: `Se cerrará la jornada activa de ${selectedUser?.name ?? 'este usuario'}.`,
      icon: 'pi pi-exclamation-triangle',
      closable: true,
      closeOnEscape: true,
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true
      },
      acceptButtonProps: {
        label: 'Cerrar jornada',
        severity: 'danger'
      },
      accept: () => this.forceClose(userId, comments)
    });
  }

  onWeekDatesSet(event: DatesSetArg): void {
    this.ensureCalendarRange(
      dayjs(event.start).format('YYYY-MM-DD'),
      dayjs(event.end).subtract(1, 'day').format('YYYY-MM-DD')
    );
  }

  onMonthDatesSet(event: DatesSetArg): void {
    this.ensureCalendarRange(
      dayjs(event.start).format('YYYY-MM-DD'),
      dayjs(event.end).subtract(1, 'day').format('YYYY-MM-DD')
    );
  }

  onCalendarEventClick(event: EventClickArg): void {
    const rawSession = event.event.extendedProps['session'];

    if (!this.isWorkSession(rawSession)) {
      return;
    }

    const date = getDateKey(rawSession.login_time);
    this.openDayDetail(date);
  }

  openDayDetail(date: string): void {
    const sessions = this.calendarSessions().filter((session) => getDateKey(session.login_time) === date);
    this.selectedDaySessions.set(sessions);
    this.selectedDaySummary.set(buildDaySummary(date, sessions, this.now()));
    this.dayDetailVisible.set(true);
  }

  closeDayDetail(): void {
    this.dayDetailVisible.set(false);
  }

  getTodayProgressLabel(): string {
    const summary = this.todaySummary();

    if (!summary.sessionsCount) {
      return 'Sin marcaciones registradas hoy';
    }

    if (summary.extraMinutes > 0) {
      return `${formatMinutes(summary.extraMinutes)} extra`;
    }

    if (summary.missingMinutes > 0) {
      return `${formatMinutes(summary.missingMinutes)} faltantes`;
    }

    return 'Meta diaria completada';
  }

  getTodayProgressSeverity(): 'success' | 'warn' | 'info' {
    const summary = this.todaySummary();

    if (!summary.sessionsCount) {
      return 'info';
    }

    return summary.missingMinutes > 0 ? 'warn' : 'success';
  }

  getLiveDurationLabel(): string {
    const session = this.currentSession();

    if (!session) {
      return '00:00:00';
    }

    return formatDurationClock(dayjs().diff(dayjs(session.login_time)));
  }

  getStatusSeverity(status: WorkSessionDaySummary['status']): 'success' | 'info' | 'warn' | 'secondary' {
    if (status === 'ACTIVE') {
      return 'info';
    }

    if (status === 'SHORT') {
      return 'warn';
    }

    if (status === 'COMPLETE') {
      return 'success';
    }

    return 'secondary';
  }

  getSessionTagSeverity(status: WorkSession['status']): 'success' | 'info' {
    return status === 'IN_PROGRESS' ? 'info' : 'success';
  }

  getSessionStatusLabel(status: WorkSession['status']): string {
    return status === 'IN_PROGRESS' ? 'Activa' : 'Completada';
  }

  getWeekEventCountLabel(): string {
    const summary = this.weekSummary();
    return `${summary.sessionsCount} jornada${summary.sessionsCount === 1 ? '' : 's'}`;
  }

  trackBySessionId(_: number, session: WorkSession): number {
    return session.id;
  }

  private refreshAllViews(): void {
    this.statusService.loadLatest();
    this.loadHistory();
    this.loadReport();

    const coverage = this.calendarCoverage();
    if (coverage) {
      this.fetchCalendarSessions(coverage.start, coverage.end);
    }
  }

  private loadUsersIfNeeded(): void {
    if (!this.isAdmin()) {
      return;
    }

    this.usersLoading.set(true);
    this.usersError.set(null);

    this.api.liteUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.usersLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.usersLoading.set(false);
        this.usersError.set(this.getErrorMessage(error, 'No se pudo cargar el listado de usuarios.'));
      }
    });
  }

  private ensureCalendarRange(start: string, end: string): void {
    const coverage = this.calendarCoverage();

    if (coverage && coverage.start <= start && coverage.end >= end) {
      this.syncCalendarEvents();
      return;
    }

    this.fetchCalendarSessions(start, end);
  }

  private fetchCalendarSessions(start: string, end: string): void {
    this.calendarLoading.set(true);
    this.calendarError.set(null);

    this.api.history({ start_date: start, end_date: end }).subscribe({
      next: (sessions) => {
        this.calendarSessions.set(sessions);
        this.calendarCoverage.set({ start, end });
        this.calendarLoading.set(false);
        this.syncCalendarEvents();
      },
      error: (error: HttpErrorResponse) => {
        this.calendarSessions.set([]);
        this.calendarLoading.set(false);
        this.calendarError.set(this.getErrorMessage(error, 'No se pudo cargar el calendario de jornadas.'));
        this.syncCalendarEvents();
      }
    });
  }

  private syncCalendarEvents(): void {
    const events = this.buildCalendarEvents(this.calendarSessions());

    this.weekCalendarOptions.update((options) => ({
      ...options,
      events
    }));

    this.monthCalendarOptions.update((options) => ({
      ...options,
      events
    }));
  }

  private buildCalendarEvents(sessions: WorkSession[]): EventInput[] {
    return sessions.map((session) => {
      const active = isSessionActive(session);
      const fallbackEnd = dayjs(session.login_time).add(30, 'minute').toISOString();
      const minutes = Math.max(
        Math.floor((session.logout_time ? dayjs(session.logout_time) : dayjs()).diff(dayjs(session.login_time), 'minute', true)),
        0
      );
      const diffMinutes = minutes - DAILY_TARGET_MINUTES;

      let backgroundColor = '#dbeafe';
      let borderColor = '#60a5fa';

      if (active) {
        backgroundColor = '#dbeafe';
        borderColor = '#2563eb';
      } else if (diffMinutes >= 0) {
        backgroundColor = '#dcfce7';
        borderColor = '#16a34a';
      } else {
        backgroundColor = '#fef3c7';
        borderColor = '#d97706';
      }

      return {
        id: String(session.id),
        title: active
          ? `${getTimeLabel(session.login_time)} - Activa`
          : `${getTimeLabel(session.login_time)} - ${getTimeLabel(session.logout_time)}`,
        start: session.login_time,
        end: session.logout_time ?? fallbackEnd,
        allDay: false,
        backgroundColor,
        borderColor,
        textColor: '#0f172a',
        extendedProps: {
          session
        }
      };
    });
  }

  private buildWeekSummaries(): WorkSessionDaySummary[] {
    const start = dayjs().startOf('week');
    const grouped = groupSessionsByDate(this.getWeekSessions());

    return Array.from({ length: 7 }, (_, index) => {
      const date = start.add(index, 'day').format('YYYY-MM-DD');
      const sessions = grouped.get(date) ?? [];
      return buildDaySummary(date, sessions, this.now());
    });
  }

  private getWeekSessions(): WorkSession[] {
    const start = dayjs().startOf('week').format('YYYY-MM-DD');
    const end = dayjs().endOf('week').format('YYYY-MM-DD');

    return this.calendarSessions().filter((session) => {
      const key = getDateKey(session.login_time);
      return key >= start && key <= end;
    });
  }

  private getMonthSessions(): WorkSession[] {
    const start = dayjs().startOf('month').format('YYYY-MM-DD');
    const end = dayjs().endOf('month').format('YYYY-MM-DD');

    return this.calendarSessions().filter((session) => {
      const key = getDateKey(session.login_time);
      return key >= start && key <= end;
    });
  }

  private buildReportKpis(rows: WorkSessionsReportRow[]): Array<{ label: string; value: string }> {
    const totals = rows.reduce((accumulator, row) => ({
      sesiones: accumulator.sesiones + row.total_sesiones,
      duracion: accumulator.duracion + parseBackendDurationToMinutes(row.total_duracion),
      extra: accumulator.extra + parseBackendDurationToMinutes(row.total_extra),
      faltante: accumulator.faltante + parseBackendDurationToMinutes(row.total_faltante)
    }), {
      sesiones: 0,
      duracion: 0,
      extra: 0,
      faltante: 0
    });

    return [
      { label: 'Total sesiones', value: String(totals.sesiones) },
      { label: 'Total horas', value: formatMinutes(totals.duracion) },
      { label: 'Horas extra', value: formatMinutes(totals.extra) },
      { label: 'Horas faltantes', value: formatMinutes(totals.faltante) }
    ];
  }

  toDisplaySession(session: WorkSession): DisplaySession {
    return {
      ...session,
      dateLabel: dayjs(session.login_time).format('D MMM YYYY'),
      loginLabel: getTimeLabel(session.login_time),
      logoutLabel: getTimeLabel(session.logout_time),
      durationLabel: formatMinutes(
        Math.floor(
          (session.logout_time ? dayjs(session.logout_time) : dayjs()).diff(dayjs(session.login_time), 'minute', true)
        )
      )
    };
  }

  private forceClose(userId: number, comments: string): void {
    this.forceCloseLoading.set(true);

    this.api.forceEnd({ user_id: userId, comments }).subscribe({
      next: (response) => {
        this.forceCloseLoading.set(false);
        this.forceCloseUserId.set(null);
        this.forceCloseComments.set('');
        this.refreshAllViews();
        this.pushToast('success', 'Cierre manual', response.message);
      },
      error: (error: HttpErrorResponse) => {
        this.forceCloseLoading.set(false);
        this.pushToast('error', 'Cierre manual', this.getErrorMessage(error, 'No se pudo cerrar la jornada.'));
      }
    });
  }

  private createWeekCalendarOptions(): CalendarOptions {
    return {
      plugins: [timeGridPlugin, interactionPlugin],
      initialView: 'timeGridWeek',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: ''
      },
      height: 'auto',
      allDaySlot: false,
      slotMinTime: '05:00:00',
      slotMaxTime: '23:00:00',
      events: [],
      eventClick: (event) => this.onCalendarEventClick(event),
      datesSet: (event) => this.onWeekDatesSet(event)
    };
  }

  private createMonthCalendarOptions(): CalendarOptions {
    return {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: ''
      },
      height: 'auto',
      events: [],
      eventClick: (event) => this.onCalendarEventClick(event),
      datesSet: (event) => this.onMonthDatesSet(event)
    };
  }

  private pushToast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail });
  }

  private toApiDate(value: Date): string {
    return dayjs(value).format('YYYY-MM-DD');
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const apiMessage = error.error && typeof error.error === 'object' && 'message' in error.error
      ? error.error.message
      : null;

    return typeof apiMessage === 'string' && apiMessage.trim().length ? apiMessage : fallback;
  }

  private readCurrentUser(): UserData | null {
    const rawUser = sessionStorage.getItem(KEYSTORE.user);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as UserData;
    } catch {
      return null;
    }
  }

  private isWorkSession(value: unknown): value is WorkSession {
    if (!value || typeof value !== 'object') {
      return false;
    }

    return 'id' in value && 'user_id' in value && 'login_time' in value && 'status' in value;
  }
}
