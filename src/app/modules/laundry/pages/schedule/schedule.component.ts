import { Component, ViewEncapsulation } from '@angular/core';
import { LaundryStatusListComponent } from '@modules/laundry/components/laundry-status-list/laundry-status-list.component';
import { LaundryServiceLite, LaundryServiceResp } from '@shared/interfaces/laundry-service.interface';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { LaundryStatusColorMap } from '@shared/utils/color.util';

@Component({
  selector: 'app-schedule',
  imports: [
      LaundryStatusListComponent,
      CardModule,
      ButtonModule,
    ],
  templateUrl: './schedule.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ScheduleComponent {

  statusColorMap = LaundryStatusColorMap;

  handleSelect(item: LaundryServiceLite) {
    console.log('Seleccionado:', item);
  }


}
