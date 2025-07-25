import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { LaundryServiceResp } from '@shared/interfaces/laundry-service.interface';
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

  onFormSubmit(data: Partial<LaundryServiceResp>): void {
    this.laundryService.create(data).subscribe({
      next: (resp) => {
        console.log('Laundry service created:', resp);
        this.router.navigate(['/laundry', `${resp.id}`, 'edit']);
      },
      error: () => {
      }
    });
  }
}