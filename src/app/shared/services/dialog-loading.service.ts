import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type DialogLoadingState = {
  visible: boolean;
  text: string;
};

@Injectable({
  providedIn: 'root'
})
export class DialogLoadingService {
  private readonly stateSubject = new BehaviorSubject<DialogLoadingState>({
    visible: false,
    text: 'Cargando, por favor espere...'
  });

  readonly state$ = this.stateSubject.asObservable();

  show(text = 'Cargando, por favor espere...'): void {
    this.stateSubject.next({
      visible: true,
      text
    });
  }

  hide(): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      visible: false
    });
  }
}
