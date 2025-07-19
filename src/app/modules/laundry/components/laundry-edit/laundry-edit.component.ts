import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LaundryServiceResp } from '@shared/interfaces/laundry-service.interface';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { CardModule } from 'primeng/card';
import { LaundryFormComponent } from '../laundry-form/laundry-form.component';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-laundry-edit',
  imports: [
    CommonModule,
    CardModule,
    LaundryFormComponent,
    BackButtonComponent,
  ],
  templateUrl: './laundry-edit.component.html',
  encapsulation: ViewEncapsulation.None,
  standalone: true
})
export class LaundryEditComponent implements OnInit {
  initialData?: LaundryServiceResp;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private laundryService: LaundryService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.laundryService.getById(+id).subscribe({
        next: (data) => {
          this.initialData = data;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.router.navigate(['/laundry']);
        }
      });
    }
  }

  onFormSubmit(data: Partial<LaundryServiceResp>): void {
    if (!this.initialData) return;

    this.laundryService.update(this.initialData.id, data).subscribe({
      next: () => {
        this.router.navigate(['/laundry']);
      },
      error: () => {
      }
    });
  }
}
