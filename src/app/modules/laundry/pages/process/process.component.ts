import { Component, ViewEncapsulation } from '@angular/core';
import { LaundryStatusListComponent } from '@modules/laundry/components/laundry-status-list/laundry-status-list.component';
import { LaundryServiceCompact } from '@shared/interfaces/laundry-service.interface';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { LaundryStatusColorMap } from '@shared/utils/color.util';
import { Router } from '@angular/router';
import { BackButtonComponent } from '@shared/components/back/back-button.component';

@Component({
  selector: 'app-process',
   imports: [
       LaundryStatusListComponent,
       CardModule,
       ButtonModule,
       BackButtonComponent,
     ],
  templateUrl: './process.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ProcessComponent {

  statusColorMap = LaundryStatusColorMap;

  constructor(private router: Router) {}

  handleSelect(item: LaundryServiceCompact):void {
    this.router.navigate(['/laundry', item.id, 'detail'], {
      queryParams: { status: 'IN_PROGRESS' },
      state: {
        backTo: ['/laundry', 'work-in-progress']
      }
    });
  }


}
