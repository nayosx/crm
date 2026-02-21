import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@shared/services/auth/auth.service';

import {
  LAUNDRY_SOCKET_CONFIG,
  LAUNDRY_SOCKET_FACTORY,
  type LaundrySocket
} from './laundry-socket.tokens';
import {
  type LaundryQueueJoinAck,
  type LaundryQueueUpdatedEvent,
  type LaundrySocketConfig
} from './laundry-socket.types';
import { LaundrySocketService, LaundrySocketAckError, LaundrySocketTimeoutError } from './laundry-socket.service';

type EventHandler = (...args: unknown[]) => void;

class MockManager {
  private readonly handlers = new Map<string, EventHandler[]>();

  on(event: string, handler: EventHandler): void {
    const current = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...current, handler]);
  }

  trigger(event: string, ...args: unknown[]): void {
    (this.handlers.get(event) ?? []).forEach((handler) => handler(...args));
  }
}

class MockSocket {
  connected = false;
  active = false;
  io = new MockManager();
  lastEmit: { event: string; payload: unknown } | null = null;
  nextAckError: unknown = null;
  nextAckResponse: unknown = {
    ok: true,
    room: 'status:all',
    filters: { status: ['ALL'] },
    items: [],
    total: 0
  } satisfies LaundryQueueJoinAck;

  private readonly handlers = new Map<string, EventHandler[]>();

  on(event: string, handler: EventHandler): this {
    const current = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...current, handler]);
    return this;
  }

  timeout(_ms: number): this {
    return this;
  }

  emit(event: string, payload: unknown, callback?: (err: unknown, response?: unknown) => void): this {
    this.lastEmit = { event, payload };

    if (callback) {
      callback(this.nextAckError, this.nextAckResponse);
    }

    return this;
  }

  connect(): this {
    this.active = true;
    this.connected = true;
    this.trigger('connect');
    return this;
  }

  disconnect(): this {
    this.active = false;
    this.connected = false;
    this.trigger('disconnect');
    return this;
  }

  removeAllListeners(): this {
    this.handlers.clear();
    return this;
  }

  trigger(event: string, ...args: unknown[]): void {
    (this.handlers.get(event) ?? []).forEach((handler) => handler(...args));
  }
}

describe('LaundrySocketService', () => {
  let service: LaundrySocketService;
  let mockSocket: MockSocket;

  beforeEach(() => {
    mockSocket = new MockSocket();

    TestBed.configureTestingModule({
      providers: [
        LaundrySocketService,
        {
          provide: AuthService,
          useValue: {
            getAccessToken: () => 'jwt-token'
          }
        },
        {
          provide: LAUNDRY_SOCKET_CONFIG,
          useValue: {
            url: 'http://localhost:3000',
            path: '/socket.io',
            ackTimeoutMs: 1500,
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelayMs: 300,
            reconnectionDelayMaxMs: 1200,
            transports: ['websocket', 'polling']
          } satisfies LaundrySocketConfig
        },
        {
          provide: LAUNDRY_SOCKET_FACTORY,
          useValue: () => mockSocket as unknown as LaundrySocket
        }
      ]
    });

    service = TestBed.inject(LaundrySocketService);
  });

  it('normalizes status filters to uppercase before join emit', async () => {
    mockSocket.nextAckResponse = {
      ok: true,
      room: 'status:pending+started',
      filters: { status: ['PENDING', 'STARTED'] },
      items: [],
      total: 0
    };

    await firstValueFrom(service.joinQueue('pending, started'));

    expect(mockSocket.lastEmit).toEqual({
      event: 'laundry:queue:join',
      payload: { status: ['PENDING', 'STARTED'] }
    });
  });

  it('throws for invalid reorder ids', () => {
    expect(() => service.reorderPending([1, 0, 3])).toThrowError('Invalid id in reorder list: 0');
  });

  it('maps timeout ack errors to LaundrySocketTimeoutError', async () => {
    mockSocket.nextAckError = new Error('operation timed out');
    mockSocket.nextAckResponse = undefined;

    await expectAsync(firstValueFrom(service.joinQueue())).toBeRejectedWithError(LaundrySocketTimeoutError);
  });

  it('maps contract ack errors to LaundrySocketAckError', async () => {
    mockSocket.nextAckError = null;
    mockSocket.nextAckResponse = {
      ok: false,
      error: 'Invalid filter',
      code: 'BAD_FILTER'
    };

    await expectAsync(firstValueFrom(service.joinQueue('READY'))).toBeRejectedWithError(
      LaundrySocketAckError,
      'Invalid filter'
    );
  });

  it('emits queue updates as observable stream', async () => {
    const expected: LaundryQueueUpdatedEvent = {
      items: [{ id: 1 }],
      total: 1,
      filters: { status: ['PENDING'] }
    };

    const promise = firstValueFrom(service.queueUpdated$);
    service.connect();
    mockSocket.trigger('laundry:queue:updated', expected);

    await expectAsync(promise).toBeResolvedTo(expected);
  });
});
