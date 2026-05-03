import dayjs from 'dayjs';
import { WorkSession, WorkSessionDaySummary, WorkSessionSummary } from '../models/work-session.model';

export const DAILY_TARGET_MINUTES = 9 * 60 + 30;

export function isSessionActive(session: WorkSession | null | undefined): boolean {
  return Boolean(session && session.status === 'IN_PROGRESS' && !session.logout_time);
}

export function getDateKey(value: string): string {
  return value.slice(0, 10);
}

export function getTimeLabel(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return dayjs(value).format('hh:mm A');
}

export function getDateLabel(value: string): string {
  return dayjs(value).format('ddd D MMM');
}

export function getSessionDurationMs(session: WorkSession, nowMs = Date.now()): number {
  const start = dayjs(session.login_time).valueOf();
  const end = session.logout_time ? dayjs(session.logout_time).valueOf() : nowMs;
  return Math.max(end - start, 0);
}

export function getSessionDurationMinutes(session: WorkSession, nowMs = Date.now()): number {
  return Math.floor(getSessionDurationMs(session, nowMs) / 60000);
}

export function formatMinutes(minutes: number): string {
  const normalizedMinutes = Number.isFinite(minutes) ? minutes : 0;
  const safeMinutes = Math.max(Math.floor(normalizedMinutes), 0);
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (!hours) {
    return `${remainder}m`;
  }

  if (!remainder) {
    return `${hours}h`;
  }

  return `${hours}h ${remainder}m`;
}

export function formatDurationClock(totalMs: number): string {
  const safeSeconds = Math.max(Math.floor(totalMs / 1000), 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

export function parseBackendDurationToMinutes(value: string | null | undefined): number {
  if (!value || typeof value !== 'string') {
    return 0;
  }

  const [hours = '0', minutes = '0'] = value.split(':');
  const totalMinutes = Number(hours) * 60 + Number(minutes);

  return Number.isFinite(totalMinutes) ? totalMinutes : 0;
}

export function summarizeSessions(
  sessions: WorkSession[],
  nowMs = Date.now(),
  dailyTargetMinutes = DAILY_TARGET_MINUTES
): WorkSessionSummary {
  const totalMinutes = sessions.reduce((total, session) => total + getSessionDurationMinutes(session, nowMs), 0);
  const activeDays = groupSessionsByDate(sessions).size;
  const targetMinutes = activeDays * dailyTargetMinutes;

  return {
    totalMinutes,
    extraMinutes: Math.max(totalMinutes - targetMinutes, 0),
    missingMinutes: Math.max(targetMinutes - totalMinutes, 0),
    sessionsCount: sessions.length
  };
}

export function groupSessionsByDate(sessions: WorkSession[]): Map<string, WorkSession[]> {
  const grouped = new Map<string, WorkSession[]>();

  for (const session of sessions) {
    const key = getDateKey(session.login_time);
    const current = grouped.get(key) ?? [];
    current.push(session);
    grouped.set(key, current);
  }

  return grouped;
}

export function buildDaySummary(
  date: string,
  sessions: WorkSession[],
  nowMs = Date.now(),
  dailyTargetMinutes = DAILY_TARGET_MINUTES
): WorkSessionDaySummary {
  const sortedSessions = [...sessions].sort((a, b) => a.login_time.localeCompare(b.login_time));
  const summary = summarizeSessions(sortedSessions, nowMs, dailyTargetMinutes);
  const firstSession = sortedSessions[0];
  const lastSession = sortedSessions.at(-1);
  const active = sortedSessions.some((session) => isSessionActive(session));

  let status: WorkSessionDaySummary['status'] = 'EMPTY';
  if (active) {
    status = 'ACTIVE';
  } else if (!sortedSessions.length) {
    status = 'EMPTY';
  } else if (summary.missingMinutes > 0) {
    status = 'SHORT';
  } else {
    status = 'COMPLETE';
  }

  return {
    ...summary,
    date,
    label: getDateLabel(date),
    status,
    startTime: firstSession ? getTimeLabel(firstSession.login_time) : null,
    endTime: lastSession?.logout_time ? getTimeLabel(lastSession.logout_time) : null
  };
}
