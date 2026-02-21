import { InjectionToken } from '@angular/core';
import { io, Socket, type ManagerOptions, type SocketOptions } from 'socket.io-client';
import { environment } from '@env/environment';

import {
  type LaundryClientToServerEvents,
  type LaundryServerToClientEvents,
  type LaundrySocketConfig
} from './laundry-socket.types';

export type LaundrySocket = Socket<LaundryServerToClientEvents, LaundryClientToServerEvents>;
export type LaundrySocketFactory = (
  url: string,
  options: Partial<ManagerOptions & SocketOptions>
) => LaundrySocket;

export const LAUNDRY_SOCKET_CONFIG = new InjectionToken<LaundrySocketConfig>('LAUNDRY_SOCKET_CONFIG', {
  providedIn: 'root',
  factory: (): LaundrySocketConfig => ({
    url: environment.API,
    path: environment.socketPath ?? '/socket.io',
    ackTimeoutMs: 8000,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelayMs: 1000,
    reconnectionDelayMaxMs: 5000,
    transports: ['websocket', 'polling']
  })
});

export const LAUNDRY_SOCKET_FACTORY = new InjectionToken<LaundrySocketFactory>('LAUNDRY_SOCKET_FACTORY', {
  providedIn: 'root',
  factory: (): LaundrySocketFactory => (url, options) =>
    io<LaundryServerToClientEvents, LaundryClientToServerEvents>(url, options)
});
