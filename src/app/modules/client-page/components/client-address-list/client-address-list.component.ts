import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { ClientAddress } from '@shared/interfaces/client.interface';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-client-address-list',
  imports: [
    CommonModule,
    ButtonModule
  ],
  templateUrl: './client-address-list.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ClientAddressListComponent {
  @Input() addresses: ClientAddress[] = [];
  @Input() loading = false;

  @Output() edit = new EventEmitter<ClientAddress>();
  @Output() delete = new EventEmitter<number>();
}