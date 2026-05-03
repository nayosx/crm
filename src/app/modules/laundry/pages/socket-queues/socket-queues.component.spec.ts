import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { LaundrySocketService } from '@shared/services/socket/laundry/laundry-socket.service';
import { SocketQueuesComponent } from './socket-queues.component';

class LaundrySocketServiceMock {
  connected$ = of(true);
  reconnecting$ = of(false);
  queueUpdated$ = new Subject<unknown>();
  queueError$ = new Subject<{ error: string; code?: string }>();
  transportError$ = new Subject<{ kind: 'transport'; code?: string }>();

  connect(): void {}

  joinQueue<TItem = unknown>() {
    return of({
      ok: true,
      room: 'status:all',
      filters: { status: ['ALL'] },
      items: [] as TItem[],
      total: 0
    });
  }

  leaveQueue() {
    return of({ ok: true, room: 'status:all' });
  }
}

describe('SocketQueuesComponent', () => {
  let component: SocketQueuesComponent;
  let fixture: ComponentFixture<SocketQueuesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocketQueuesComponent],
      providers: [
        {
          provide: LaundrySocketService,
          useClass: LaundrySocketServiceMock
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SocketQueuesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
