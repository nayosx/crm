export const LAUNDRY_STATUSES = [
  'PENDING',
  'STARTED',
  'IN_PROGRESS',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED'
] as const;

export type LaundryStatus = (typeof LAUNDRY_STATUSES)[number];
export type LaundryStatusWithAll = LaundryStatus | 'ALL';

export type LaundryStatusInput =
  | LaundryStatusWithAll
  | string
  | readonly (LaundryStatusWithAll | string)[]
  | null
  | undefined;

export interface LaundryQueueStatusPayload {
  status?: string | string[];
}

export interface LaundryQueueJoinPayload extends LaundryQueueStatusPayload {}

export interface LaundryQueueLeavePayload extends LaundryQueueStatusPayload {}

export interface LaundryPendingReorderPayload extends LaundryQueueStatusPayload {
  ids: number[];
}

export interface LaundryQueueFilters {
  status: string[];
}

export interface LaundryAckError {
  ok: false;
  error: string;
  code?: string;
  room?: string;
}

export interface LaundryQueueJoinAckSuccess<TItem = unknown> {
  ok: true;
  room: string;
  filters: LaundryQueueFilters;
  items: TItem[];
  total: number;
}

export type LaundryQueueJoinAck<TItem = unknown> = LaundryQueueJoinAckSuccess<TItem> | LaundryAckError;

export interface LaundryQueueLeaveAckSuccess {
  ok: true;
  room: string;
}

export type LaundryQueueLeaveAck = LaundryQueueLeaveAckSuccess | LaundryAckError;

export interface LaundryPendingReorderAckSuccess<TResult = unknown> {
  ok: true;
  result: TResult;
  room: string;
}

export type LaundryPendingReorderAck<TResult = unknown> = LaundryPendingReorderAckSuccess<TResult> | LaundryAckError;

export interface LaundryQueuePingAckSuccess<TPayload = unknown> {
  ok: true;
  echo: TPayload;
}

export type LaundryQueuePingAck<TPayload = unknown> = LaundryQueuePingAckSuccess<TPayload> | LaundryAckError;

export interface LaundryQueueUpdatedEvent<TItem = unknown> {
  items: TItem[];
  total: number;
  filters: LaundryQueueFilters;
}

export interface LaundryQueueErrorEvent {
  error: string;
  code?: string;
}

export interface LaundrySocketConfig {
  url: string;
  path: string;
  ackTimeoutMs: number;
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelayMs: number;
  reconnectionDelayMaxMs: number;
  transports: ('websocket' | 'polling')[];
}

export interface LaundrySocketState {
  connected: boolean;
  reconnecting: boolean;
}

export interface LaundrySocketContractError {
  kind: 'contract';
  event: LaundryClientEventName;
  code?: string;
  room?: string;
}

export interface LaundrySocketTransportError {
  kind: 'transport';
  event?: LaundryClientEventName;
  code?: string;
}

export type LaundrySocketErrorDetails = LaundrySocketContractError | LaundrySocketTransportError;

export interface LaundryClientToServerEvents {
  'laundry:queue:join': (
    payload: LaundryQueueJoinPayload | undefined,
    ack: (response: LaundryQueueJoinAck) => void
  ) => void;
  'laundry:queue:leave': (
    payload: LaundryQueueLeavePayload | undefined,
    ack: (response: LaundryQueueLeaveAck) => void
  ) => void;
  'laundry:pending:reorder': (
    payload: LaundryPendingReorderPayload,
    ack: (response: LaundryPendingReorderAck) => void
  ) => void;
  'laundry:queue:ping': (
    payload: unknown,
    ack: (response: LaundryQueuePingAck) => void
  ) => void;
}

export interface LaundryServerToClientEvents {
  'laundry:queue:updated': (payload: LaundryQueueUpdatedEvent) => void;
  'laundry:queue:error': (payload: LaundryQueueErrorEvent) => void;
}

export type LaundryClientEventName = keyof LaundryClientToServerEvents;

export interface LaundryEventPayloadMap {
  'laundry:queue:join': LaundryQueueJoinPayload | undefined;
  'laundry:queue:leave': LaundryQueueLeavePayload | undefined;
  'laundry:pending:reorder': LaundryPendingReorderPayload;
  'laundry:queue:ping': unknown;
}

export interface LaundryEventAckMap {
  'laundry:queue:join': LaundryQueueJoinAck;
  'laundry:queue:leave': LaundryQueueLeaveAck;
  'laundry:pending:reorder': LaundryPendingReorderAck;
  'laundry:queue:ping': LaundryQueuePingAck;
}

export type LaundryEventSuccessAckMap = {
  [K in keyof LaundryEventAckMap]: Extract<LaundryEventAckMap[K], { ok: true }>;
};
