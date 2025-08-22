import { Component, ViewEncapsulation } from '@angular/core';
import { LaundryStatusListComponent } from '@modules/laundry/components/laundry-status-list/laundry-status-list.component';
import { LaundryServiceCompact, LaundryServiceLite, LaundryServiceResp } from '@shared/interfaces/laundry-service.interface';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { LaundryStatusColorMap } from '@shared/utils/color.util';
import { Router } from '@angular/router';

@Component({
  selector: 'app-delivery',
  imports: [
    LaundryStatusListComponent,
    CardModule,
    ButtonModule,
  ],
  templateUrl: './delivery.component.html',
  encapsulation: ViewEncapsulation.None
})
export class DeliveryComponent {
  statusColorMap = LaundryStatusColorMap;

  constructor(private router: Router) {}

  handleSelect(item: LaundryServiceCompact):void {
    this.router.navigate(['/laundry', item.id, 'detail'], {
      queryParams: { status: 'READY_FOR_DELIVERY' }
    });
  }

}
