import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { LaundryService } from '@shared/services/laundry/laundry.service';
import {
  LaundryServiceResp,
  LaundryServiceStatus,
  LaundryServiceStatusValues
} from '@shared/interfaces/laundry-service.interface';
import { LaundryStatusColorMap } from '@shared/utils/color.util';

type StatusOption = { label: string; value: LaundryServiceStatus | null };

@Component({
  selector: 'app-laundry',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    CardModule,
    TagModule,
    SelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './laundry.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LaundryComponent implements OnInit, OnDestroy {
  laundries: LaundryServiceResp[] = [];
  totalRecords = 0;
  loading = true;
  rows = 10;
  statusColorMap = LaundryStatusColorMap;

  filtersForm!: FormGroup;
  statusOptions: StatusOption[] = [];
  private subs = new Subscription();

  constructor(
    private router: Router,
    private laundryService: LaundryService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.statusOptions = [
      { label: 'Todos', value: null },
      ...LaundryServiceStatusValues.map(s => ({ label: s, value: s }))
    ];

    this.filtersForm = this.fb.group({
      status: [null]
    });

    this.loadPage(1, this.rows);

    const s = this.filtersForm.get('status')!;
    this.subs.add(
      s.valueChanges.pipe(debounceTime(150), distinctUntilChanged()).subscribe(() => {
        this.loadPage(1, this.rows);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadPage(page: number, perPage: number): void {
    this.loading = true;

    const status = this.filtersForm?.value?.status as LaundryServiceStatus | null | undefined;

    this.laundryService.getAll({
      page,
      per_page: perPage,
      status: status ?? undefined
    }).subscribe({
      next: (res) => {
        this.laundries = res.items;
        this.totalRecords = res.total;
        this.loading = false;
      },
      error: () => {
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

  resetFilters(): void {
    this.filtersForm.reset({ status: null });
  }

  onCreateLaundry(): void {
    this.router.navigate(['/laundry/create']);
  }

  onEditLaundry(id: number): void {
    this.router.navigate([`/laundry/${id}/edit`]);
  }
}
