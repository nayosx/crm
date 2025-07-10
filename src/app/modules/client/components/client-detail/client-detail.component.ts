import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ClientFullResponse } from '@shared/interfaces/client.interface';

@Component({
  selector: 'app-client-detail',
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
  ],
  templateUrl: './client-detail.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ClientDetailComponent {
  @Input() client?: ClientFullResponse;

  @Input() useCard = true;

  getPhoneLink(phone: string): string {
    return 'tel:' + phone.replace(/[^0-9+]/g, '');
  }

  getWhatsAppLink(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return 'https://wa.me/' + cleaned;
  }


}