import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, signal } from '@angular/core';
import { CalendarOptions, DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayjs from 'dayjs';
import { interval, Subscription } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { KEYSTORE } from '@core/keystore';
import { UserData } from '@shared/interfaces/auth.interface';
import { GlobalSettingsApiService } from '@modules/laundry-commerce/services/global-settings-api.service';
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

export type DisplaySession = WorkSession & {
  dateLabel: string;
  loginLabel: string | null;
  logoutLabel: string | null;
  durationLabel: string;
};

export abstract class WorkSessionsBaseComponent {
  protected readonly statusService = inject(WorkSessionStatusService);
  protected readonly historyService = inject(WorkSessionsHistoryService);
  protected readonly reportService = inject(WorkSessionsReportService);
  protected readonly api = inject(WorkSessionsApiService);
  protected readonly globalSettingsApi = inject(GlobalSettingsApiService);
  protected readonly messageService = inject(MessageService);
  protected readonly confirmationService = inject(ConfirmationService);
  protected readonly subscription = new Subscription();

  readonly dailyTargetMinutes = signal<number>(540);
  readonly dailyTargetLabel = computed(() => formatMinutes(this.dailyTargetMinutes()));
  readonly formatMinutes = formatMinutes;
  readonly activeTabIndex = signal<number>(0);
  readonly now = signal<number>(Date.now());
  readonly sessionMutationText = signal<string>('Procesando jornada...');

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
  readonly scopedUserId = signal<number | null>(null);

  readonly reportStartDate = signal<Date>(dayjs().startOf('month').toDate());
  readonly reportEndDate = signal<Date>(dayjs().endOf('month').toDate());
  readonly reportUserId = signal<number | null>(null);

  readonly forceCloseUserId = signal<number | null>(null);
  readonly forceCloseComments = signal<string>('');
  readonly forceCloseLoading = signal<boolean>(false);

  readonly currentUser = signal<UserData | null>(this.readCurrentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role_id === 1);

  readonly todaySessions = computed(() => {
    const todayKey = dayjs().format('YYYY-MM-DD');
    return this.calendarSessions().filter((session) => getDateKey(session.login_time) === todayKey);
  });
  readonly fallbackActiveSession = computed(() =>
    this.todaySessions().find((session) => isSessionActive(session)) ?? null
  );
  readonly displaySession = computed(() => this.currentSession() ?? this.fallbackActiveSession());
  readonly hasActiveSession = computed(() => isSessionActive(this.displaySession()));
  readonly canStartSession = computed(() => !this.currentSessionMutating() && !this.hasActiveSession());
  readonly canEndSession = computed(() => !this.currentSessionMutating() && this.hasActiveSession());
  readonly liveDurationLabel = computed(() => {
    const session = this.displaySession();
    if (!session) {
      return '00:00:00';
    }

    const elapsedMs = Math.max(this.now() - dayjs(session.login_time).valueOf(), 0);
    return formatDurationClock(elapsedMs);
  });

  readonly todaySummary = computed(() => summarizeSessions(this.todaySessions(), this.now(), this.dailyTargetMinutes()));
  readonly weekSummaries = computed(() => this.buildWeekSummaries());
  readonly weekSummary = computed(() => summarizeSessions(this.getWeekSessions(), this.now(), this.dailyTargetMinutes()));
  readonly monthSummary = computed(() => summarizeSessions(this.getMonthSessions(), this.now(), this.dailyTargetMinutes()));
  readonly historyRows = computed<DisplaySession[]>(() =>
    this.historyService.sessions().map((session) => this.toDisplaySession(session))
  );
  readonly reportRows = this.reportService.rows;
  readonly reportKpis = computed(() => this.buildReportKpis(this.reportRows()));
  readonly adminHistorySummary = computed(() =>
    summarizeSessions(this.historyService.sessions(), this.now(), this.dailyTargetMinutes())
  );
  readonly adminKpis = computed(() => [
    { label: 'Total sesiones', value: String(this.adminHistorySummary().sessionsCount) },
    { label: 'Total horas', value: formatMinutes(this.adminHistorySummary().totalMinutes) },
    { label: 'Horas extra', value: formatMinutes(this.adminHistorySummary().extraMinutes) },
    { label: 'Horas faltantes', value: formatMinutes(this.adminHistorySummary().missingMinutes) }
  ]);

  readonly weekCalendarOptions = signal<CalendarOptions>(this.createWeekCalendarOptions());
  readonly monthCalendarOptions = signal<CalendarOptions>(this.createMonthCalendarOptions());

  initBase(options?: { users?: boolean; history?: boolean; report?: boolean; calendar?: boolean }): void {
    const config = {
      users: false,
      history: true,
      report: false,
      calendar: false,
      ...options
    };

    this.statusService.loadLatest();
    this.loadDailyTargetTime();

    if (config.users) {
      this.loadUsers();
    }

    if (config.history) {
      this.loadHistory();
    }

    if (config.report) {
      this.loadReport();
    }

    if (config.calendar) {
      this.ensureCalendarRange(dayjs().startOf('month').format('YYYY-MM-DD'), dayjs().endOf('month').format('YYYY-MM-DD'));
    }

    this.subscription.add(interval(1000).subscribe(() => this.now.set(Date.now())));
  }

  destroyBase(): void {
    this.subscription.unsubscribe();
  }

  startSession(): void {
    if (!this.canStartSession()) {
      return;
    }

    this.sessionMutationText.set('Iniciando jornada...');
    this.statusService.start(() => {
      this.refreshAllViews();
      this.pushToast('success', 'Jornada', this.statusService.message() ?? 'Jornada iniciada.');
    });
  }

  endSession(): void {
    if (!this.canEndSession()) {
      return;
    }

    this.sessionMutationText.set('Finalizando jornada...');
    this.statusService.end(() => {
      this.refreshAllViews();
      this.pushToast('success', 'Jornada', this.statusService.message() ?? 'Jornada finalizada.');
    });
  }

  loadHistory(): void {
    this.historyService.load({
      start_date: this.toApiDate(this.historyStartDate()),
      end_date: this.toApiDate(this.historyEndDate()),
      user_id: this.scopedUserId() ?? this.historyUserId() ?? undefined
    });
  }

  loadReport(): void {
    this.reportService.load({
      start_date: this.toApiDate(this.reportStartDate()),
      end_date: this.toApiDate(this.reportEndDate()),
      user_id: this.reportUserId() ?? undefined
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

    this.api.downloadReportCsv({
      start_date: startDate,
      end_date: endDate,
      user_id: this.reportUserId() ?? undefined
    }).subscribe({
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

  applyAdminFilters(): void {
    this.reportStartDate.set(this.historyStartDate());
    this.reportEndDate.set(this.historyEndDate());
    this.reportUserId.set(this.historyUserId());
    this.loadHistory();
    this.loadReport();
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

    this.openDayDetail(getDateKey(rawSession.login_time));
  }

  openDayDetail(date: string): void {
    const sessions = this.calendarSessions().filter((session) => getDateKey(session.login_time) === date);
    this.selectedDaySessions.set(sessions);
    this.selectedDaySummary.set(buildDaySummary(date, sessions, this.now()));
    this.dayDetailVisible.set(true);
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
    return !summary.sessionsCount ? 'info' : summary.missingMinutes > 0 ? 'warn' : 'success';
  }

  getStatusSeverity(status: WorkSessionDaySummary['status']): 'success' | 'info' | 'warn' | 'secondary' {
    if (status === 'ACTIVE') return 'info';
    if (status === 'SHORT') return 'warn';
    if (status === 'COMPLETE') return 'success';
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

  toDisplaySession(session: WorkSession): DisplaySession {
    return {
      ...session,
      dateLabel: dayjs(session.login_time).format('D MMM YYYY'),
      loginLabel: getTimeLabel(session.login_time),
      logoutLabel: getTimeLabel(session.logout_time),
      durationLabel: formatMinutes(
        Math.floor((session.logout_time ? dayjs(session.logout_time) : dayjs()).diff(dayjs(session.login_time), 'minute', true))
      )
    };
  }

  private refreshAllViews(): void {
    this.statusService.loadLatest();
    this.loadHistory();
    if (this.reportLoading() || this.reportRows().length) {
      this.loadReport();
    }

    const coverage = this.calendarCoverage();
    if (coverage) {
      this.fetchCalendarSessions(coverage.start, coverage.end);
    }
  }

  private loadUsers(): void {
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

  private loadDailyTargetTime(): void {
    this.globalSettingsApi.getWorkSessionDailyTargetTime().subscribe({
      next: (value) => {
        this.dailyTargetMinutes.set(this.normalizeDailyTargetMinutes(value));
      },
      error: () => {
        this.dailyTargetMinutes.set(540);
      }
    });
  }

  private ensureCalendarRange(start: string, end: string): void {
    const coverage = this.calendarCoverage();

    if (coverage && coverage.start <= start && coverage.end >= end) {
      return;
    }

    this.fetchCalendarSessions(start, end);
  }

  private fetchCalendarSessions(start: string, end: string): void {
    this.calendarLoading.set(true);
    this.calendarError.set(null);

    this.api.history({
      start_date: start,
      end_date: end,
      user_id: this.scopedUserId() ?? undefined
    }).subscribe({
      next: (sessions) => {
        this.calendarSessions.set(this.mergeSessions(this.calendarSessions(), sessions));
        this.calendarCoverage.set(this.mergeCoverage(this.calendarCoverage(), { start, end }));
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
    this.weekCalendarOptions.update((options) => ({ ...options, events }));
    this.monthCalendarOptions.update((options) => ({ ...options, events }));
  }

  private mergeCoverage(current: CalendarCoverage | null, next: CalendarCoverage): CalendarCoverage {
    if (!current) {
      return next;
    }

    return {
      start: current.start < next.start ? current.start : next.start,
      end: current.end > next.end ? current.end : next.end
    };
  }

  private mergeSessions(current: WorkSession[], next: WorkSession[]): WorkSession[] {
    const byId = new Map<number, WorkSession>();

    for (const session of current) {
      byId.set(session.id, session);
    }

    for (const session of next) {
      byId.set(session.id, session);
    }

    return Array.from(byId.values()).sort((a, b) => a.login_time.localeCompare(b.login_time));
  }

  private buildCalendarEvents(sessions: WorkSession[]): EventInput[] {
    return sessions.map((session) => {
      const active = isSessionActive(session);
      const minutes = Math.max(
        Math.floor((session.logout_time ? dayjs(session.logout_time) : dayjs()).diff(dayjs(session.login_time), 'minute', true)),
        0
      );
      const stateClass = active ? 'is-active' : minutes >= this.dailyTargetMinutes() ? 'is-complete' : 'is-short';

      return {
        id: String(session.id),
        title: active
          ? `${getTimeLabel(session.login_time)} - Activa`
          : `${getTimeLabel(session.login_time)} - ${getTimeLabel(session.logout_time)}`,
        start: session.login_time,
        end: session.logout_time ?? dayjs(session.login_time).add(30, 'minute').toISOString(),
        allDay: false,
        classNames: ['work-session-event', stateClass],
        extendedProps: { session }
      };
    });
  }

  private buildWeekSummaries(): WorkSessionDaySummary[] {
    const start = dayjs().startOf('week');
    const grouped = groupSessionsByDate(this.getWeekSessions());

    return Array.from({ length: 7 }, (_, index) => {
      const date = start.add(index, 'day').format('YYYY-MM-DD');
      return buildDaySummary(date, grouped.get(date) ?? [], this.now(), this.dailyTargetMinutes());
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
    }), { sesiones: 0, duracion: 0, extra: 0, faltante: 0 });

    return [
      { label: 'Total sesiones', value: String(totals.sesiones) },
      { label: 'Total horas', value: formatMinutes(totals.duracion) },
      { label: 'Horas extra', value: formatMinutes(totals.extra) },
      { label: 'Horas faltantes', value: formatMinutes(totals.faltante) }
    ];
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
      headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
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
      headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
      height: 'auto',
      events: [],
      eventClick: (event) => this.onCalendarEventClick(event),
      datesSet: (event) => this.onMonthDatesSet(event)
    };
  }

  private pushToast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail });
  }

  private normalizeDailyTargetMinutes(value: string | null | undefined): number {
    if (!value) {
      return 540;
    }

    const minutes = parseBackendDurationToMinutes(value);
    return minutes > 0 ? minutes : 540;
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
    return !!value && typeof value === 'object' && 'id' in value && 'user_id' in value && 'login_time' in value && 'status' in value;
  }
}
