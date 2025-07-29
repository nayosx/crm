import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';

import { LaundryService } from '@shared/services/laundry/laundry.service';
import { LaundryServiceResp } from '@shared/interfaces/laundry-service.interface';
import { LaundryStatusColorMap } from '@shared/utils/color.util';
import { TagModule } from 'primeng/tag';


@Component({
  selector: 'app-laundry',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    CardModule,
    TagModule,
  ],
  templateUrl: './laundry.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LaundryComponent {
  laundries: LaundryServiceResp[] = [];
  totalRecords = 0;
  loading = true;
  rows = 10;
  statusColorMap = LaundryStatusColorMap;

  constructor(
    private router: Router,
    private laundryService: LaundryService
  ) {}

  loadPage(page: number, perPage: number): void {
    this.loading = true;

    this.laundryService.getAll({
      page,
      per_page: perPage
    }).subscribe({
      next: (res) => {
        this.laundries = res.items;
        this.totalRecords = res.total;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando programaciones', err);
        this.loading = false;
      }
    });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const perPage = event.rows ?? this.rows;
    const page = ((event.first ?? 0) / perPage) + 1;

    this.rows = perPage;
    this.loadPage(page, perPage);
  }

  onCreateLaundry(): void {
    this.router.navigate(['/laundry/create']);
  }

  onEditLaundry(id: number): void {
    this.router.navigate([`/laundry/${id}/edit`]);
  }
}
