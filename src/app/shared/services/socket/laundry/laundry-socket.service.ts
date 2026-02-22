import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { AuthService } from '@shared/services/auth/auth.service';
import { type ManagerOptions, type SocketOptions } from 'socket.io-client';

import {
  type LaundryAckError,
  type LaundryClientEventName,
  type LaundryEventAckMap,
  type LaundryEventPayloadMap,
  type LaundryEventSuccessAckMap,
  type LaundryQueueErrorEvent,
  type LaundryQueueJoinAckSuccess,
  type LaundryQueueLeaveAckSuccess,
  type LaundryQueuePingAckSuccess,
  type LaundryQueueUpdatedEvent,
  type LaundryPendingReorderAckSuccess,
  type LaundrySocketTransportError
} from './laundry-socket.types';
import {
  LAUNDRY_SOCKET_CONFIG,
  LAUNDRY_SOCKET_FACTORY,
  type LaundrySocket
} from './laundry-socket.tokens';
import { toLaundryStatusPayload, validateLaundryIds } from './laundry-socket.helpers';

export class LaundrySocketAckError extends Error {
  constructor(
    message: string,
    readonly event: LaundryClientEventName,
    readonly code?: string,
    readonly room?: string
  ) {
    super(message);
    this.name = 'LaundrySocketAckError';
  }
}

export class LaundrySocketTimeoutError extends Error {
  readonly rootCause?: unknown;

  constructor(
    readonly event: LaundryClientEventName,
    timeoutMs: number,
    cause?: unknown
  ) {
    super(`Socket ack timeout for ${event} after ${timeoutMs}ms`);
    this.name = 'LaundrySocketTimeoutError';
    this.rootCause = cause;
  }
}

@Injectable({
  providedIn: 'root'
})
export class LaundrySocketService {
  private readonly authService = inject(AuthService);
  private readonly socketConfig = inject(LAUNDRY_SOCKET_CONFIG);
  private readonly socketFactory = inject(LAUNDRY_SOCKET_FACTORY);

  private socket: LaundrySocket | null = null;
  private activeToken: string | null = null;

  private readonly connectedSubject = new BehaviorSubject<boolean>(false);
  private readonly reconnectingSubject = new BehaviorSubject<boolean>(false);
  private readonly transportErrorSubject = new Subject<LaundrySocketTransportError>();
  private readonly queueUpdatedSubject = new Subject<LaundryQueueUpdatedEvent>();
  private readonly queueErrorSubject = new Subject<LaundryQueueErrorEvent>();

  readonly connected$ = this.connectedSubject.asObservable();
  readonly reconnecting$ = this.reconnectingSubject.asObservable();
  readonly transportError$ = this.transportErrorSubject.asObservable();
  readonly queueUpdated$ = this.queueUpdatedSubject.asObservable();
  readonly queueError$ = this.queueErrorSubject.asObservable();

  connect(): void {
    const socket = this.getOrCreateSocket();

    if (socket.connected) {
      this.connectedSubject.next(true);
      return;
    }

    if (!socket.active) {
      socket.connect();
    }
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.disconnect();
    this.connectedSubject.next(false);
    this.reconnectingSubject.next(false);
  }

  refreshAuthAndReconnect(nextToken?: string | null): void {
    const token = nextToken ?? this.authService.getAccessToken();

    if (this.activeToken === token) {
      return;
    }

    const shouldReconnect = Boolean(this.socket?.connected || this.socket?.active);
    this.destroySocket();
    this.activeToken = token;

    if (shouldReconnect) {
      this.connect();
    }
  }

  joinQueue<TItem = unknown>(status?: string | readonly string[]): Observable<LaundryQueueJoinAckSuccess<TItem>> {
    const payload = toLaundryStatusPayload(status);
    return this.emitWithAck('laundry:queue:join', payload) as Observable<LaundryQueueJoinAckSuccess<TItem>>;
  }

  leaveQueue(status?: string | readonly string[]): Observable<LaundryQueueLeaveAckSuccess> {
    const payload = toLaundryStatusPayload(status);
    return this.emitWithAck('laundry:queue:leave', payload);
  }

  reorderPending(
    ids: readonly number[],
    status?: string | readonly string[]
  ): Observable<LaundryPendingReorderAckSuccess<unknown>>;
  reorderPending<TResult = unknown>(
    ids: readonly number[],
    status?: string | readonly string[]
  ): Observable<LaundryPendingReorderAckSuccess<TResult>> {
    const validIds = validateLaundryIds(ids);
    const payload = {
      ids: validIds,
      ...toLaundryStatusPayload(status)
    };

    return this.emitWithAck('laundry:pending:reorder', payload) as Observable<LaundryPendingReorderAckSuccess<TResult>>;
  }

  ping<TPayload = unknown>(data?: TPayload): Observable<LaundryQueuePingAckSuccess<TPayload>> {
    return this.emitWithAck('laundry:queue:ping', data ?? null) as Observable<LaundryQueuePingAckSuccess<TPayload>>;
  }

  private emitWithAck<K extends LaundryClientEventName>(
    event: K,
    payload: LaundryEventPayloadMap[K]
  ): Observable<LaundryEventSuccessAckMap[K]> {
    const socket = this.getOrCreateSocket();
    if (!socket.active && !socket.connected) {
      socket.connect();
    }

    return new Observable<LaundryEventSuccessAckMap[K]>((subscriber) => {
      const callback = (err: unknown, response?: LaundryEventAckMap[K]) => {
        if (err) {
          subscriber.error(new LaundrySocketTimeoutError(event, this.socketConfig.ackTimeoutMs, err));
          return;
        }

        if (!response) {
          subscriber.error(new LaundrySocketAckError(`Empty ack received for ${event}`, event));
          return;
        }

        if (!response.ok) {
          const ackErr = response as LaundryAckError;
          subscriber.error(new LaundrySocketAckError(ackErr.error, event, ackErr.code, ackErr.room));
          return;
        }

        subscriber.next(response as LaundryEventSuccessAckMap[K]);
        subscriber.complete();
      };

      this.emitWithTimeout(socket, event, payload, callback);
    });
  }

  private emitWithTimeout<K extends LaundryClientEventName>(
    socket: LaundrySocket,
    event: K,
    payload: LaundryEventPayloadMap[K],
    callback: (err: unknown, response?: LaundryEventAckMap[K]) => void
  ): void {
    (socket.timeout(this.socketConfig.ackTimeoutMs) as {
      emit: (eventName: K, payloadData: LaundryEventPayloadMap[K], ackCallback: typeof callback) => void;
    }).emit(event, payload, callback);
  }

  private getOrCreateSocket(): LaundrySocket {
    if (this.socket) {
      return this.socket;
    }

    this.activeToken = this.authService.getAccessToken();
    this.socket = this.socketFactory(this.socketConfig.url, this.buildSocketOptions(this.activeToken));
    this.bindSocketEvents(this.socket);

    return this.socket;
  }

  private destroySocket(): void {
    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.connectedSubject.next(false);
    this.reconnectingSubject.next(false);
  }

  private bindSocketEvents(socket: LaundrySocket): void {
    socket.on('connect', () => {
      this.connectedSubject.next(true);
      this.reconnectingSubject.next(false);
    });

    socket.on('disconnect', () => {
      this.connectedSubject.next(false);
    });

    socket.io.on('reconnect_attempt', () => {
      this.reconnectingSubject.next(true);
    });

    socket.io.on('reconnect', () => {
      this.reconnectingSubject.next(false);
      this.connectedSubject.next(true);
    });

    socket.io.on('reconnect_error', (error: Error) => {
      this.transportErrorSubject.next({
        kind: 'transport',
        code: error.message
      });
    });

    socket.io.on('reconnect_failed', () => {
      this.reconnectingSubject.next(false);
      this.connectedSubject.next(false);
      this.transportErrorSubject.next({
        kind: 'transport',
        code: 'reconnect_failed'
      });
    });

    socket.on('connect_error', (error: Error) => {
      this.connectedSubject.next(false);
      this.transportErrorSubject.next({
        kind: 'transport',
        code: error.message
      });
    });

    socket.on('laundry:queue:updated', (payload: LaundryQueueUpdatedEvent) => {
      this.queueUpdatedSubject.next(payload);
    });

    socket.on('laundry:queue:error', (payload: LaundryQueueErrorEvent) => {
      this.queueErrorSubject.next(payload);
    });
  }

  private buildSocketOptions(token: string | null): Partial<ManagerOptions & SocketOptions> {
    const tokenPayload = token ? { token } : undefined;

    return {
      path: this.socketConfig.path,
      autoConnect: false,
      reconnection: this.socketConfig.reconnection,
      reconnectionAttempts: this.socketConfig.reconnectionAttempts,
      reconnectionDelay: this.socketConfig.reconnectionDelayMs,
      reconnectionDelayMax: this.socketConfig.reconnectionDelayMaxMs,
      transports: this.socketConfig.transports,
      auth: tokenPayload,
      query: tokenPayload
    };
  }
}
