import { Injectable } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';

import { type LaundryQueueLeaveAckSuccess, type LaundryQueueUpdatedEvent } from './laundry-socket.types';
import { LaundrySocketService } from './laundry-socket.service';

@Injectable({
  providedIn: 'root'
})
export class LaundryQueueSyncServiceExample {
  constructor(private readonly laundrySocket: LaundrySocketService) {}

  watchPendingQueue(): Observable<LaundryQueueUpdatedEvent> {
    this.laundrySocket.connect();

    return this.laundrySocket.joinQueue('PENDING').pipe(
      switchMap(() => this.laundrySocket.queueUpdated$)
    );
  }

  stopPendingQueue(): Observable<LaundryQueueLeaveAckSuccess> {
    return this.laundrySocket.leaveQueue('PENDING').pipe(
      tap(() => this.laundrySocket.disconnect())
    );
  }
}
