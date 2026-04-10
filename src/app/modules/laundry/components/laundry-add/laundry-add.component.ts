import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { LaundryServiceCreatePayload, LaundryServiceUpdatePayload } from '@shared/interfaces/laundry-service.interface';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { CardModule } from 'primeng/card';
import { LaundryFormComponent } from '../laundry-form/laundry-form.component';
import { BackButtonComponent } from '@shared/components/back/back-button.component';

@Component({
  selector: 'app-laundry-add',
  imports: [
    CardModule,
    LaundryFormComponent,
    BackButtonComponent,
  ],
  templateUrl: './laundry-add.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LaundryAddComponent {
  constructor(
    private laundryService: LaundryService,
    private router: Router,
  ) {}

  onFormSubmit(data: LaundryServiceUpdatePayload & { isRedirect?: boolean }): void {
    delete data.isRedirect;

    const payload: LaundryServiceCreatePayload = {
      client_id: data.client_id as number,
      client_address_id: data.client_address_id as number,
      scheduled_pickup_at: data.scheduled_pickup_at as string,
      status: data.status as LaundryServiceCreatePayload['status'],
      service_label: data.service_label as LaundryServiceCreatePayload['service_label'],
      fulfillment_type: data.fulfillment_type ?? 'WALK_IN',
      transaction_id: data.transaction_id ?? null,
      notes: data.notes ?? null
    };

    this.laundryService.create(payload).subscribe({
      next: (resp) => {
        console.log('Laundry service created:', resp);
        this.router.navigate(['/laundry', `${resp.id}`, 'edit']);
      },
      error: () => {
      }
    });
  }
}
