export interface WorkSession {
  id: number;
  user_id: number;
  login_time: string;
  logout_time: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED';
  comments: string | null;
}

export interface WorkSessionsReportRow {
  user_id: number;
  nombre_usuario: string;
  total_sesiones: number;
  total_duracion: string;
  total_extra: string;
  total_faltante: string;
}

export interface LiteUser {
  id: number;
  name: string;
}

export interface WorkSessionLatestResponse {
  session?: WorkSession;
  message?: string;
}

export interface WorkSessionMutationResponse {
  message: string;
  session?: WorkSession;
}

export interface WorkSessionReportResponse {
  daily_target_time?: string;
  report: WorkSessionsReportRow[];
}

export interface WorkSessionFilters {
  user_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface WorkSessionSummary {
  totalMinutes: number;
  extraMinutes: number;
  missingMinutes: number;
  sessionsCount: number;
}

export interface WorkSessionDaySummary extends WorkSessionSummary {
  date: string;
  label: string;
  status: 'ACTIVE' | 'COMPLETE' | 'SHORT' | 'EMPTY';
  startTime: string | null;
  endTime: string | null;
}
