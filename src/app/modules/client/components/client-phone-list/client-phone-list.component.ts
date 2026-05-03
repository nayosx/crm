import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ClientPhone } from '@shared/interfaces/client.interface';

@Component({
  selector: 'app-client-phone-list',
  imports: [
    CommonModule,
    ButtonModule
  ],
  templateUrl: './client-phone-list.component.html'
})
export class ClientPhoneListComponent {
  @Input() phones: ClientPhone[] = [];
  @Input() loading = false;

  @Output() edit = new EventEmitter<ClientPhone>();
  @Output() delete = new EventEmitter<number>();
}
