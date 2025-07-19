import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { TransactionService } from '@shared/services/transaction/transaction.service';
import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

import { Transaction } from '@shared/interfaces/transaction.interface';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-transaction',
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    CardModule,
    TagModule,
    DatePickerModule,
    FormsModule,
  ],
  templateUrl: './transaction.component.html',
  encapsulation: ViewEncapsulation.None
})
export class TransactionComponent {

  transactions: Transaction[] = [];
  loading = true;
  totalRecords = 0;
  rows = 5;

  // Filtros
  startDate?: Date;
  endDate?: Date;

  constructor(
    private router: Router,
    private transactionServ: TransactionService
  ) {}

  loadPage(page: number, perPage: number): void {
    this.loading = true;

    const params: any = {
      page,
      per_page: perPage,
    };

    if (this.startDate) {
      params.start_date = this.startDate.toISOString().substring(0, 10);
    }

    if (this.endDate) {
      params.end_date = this.endDate.toISOString().substring(0, 10);
    }

    this.transactionServ.getTransactions(params).subscribe({
      next: (data) => {
        this.transactions = data.items;
        this.totalRecords = data.total;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar transacciones', error);
        this.loading = false;
      }
    });
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    const perPage = event.rows ?? this.rows;
    const page = ((event.first ?? 0) / perPage) + 1;
    this.rows = perPage;
    this.loadPage(page, perPage);
  }

  onResetFilters(): void {
    this.startDate = undefined;
    this.endDate = undefined;
    this.rows = 5;
    this.loadPage(1, this.rows);
  }

  onCreate(): void {
    this.router.navigate(['/transactions/create']);
  }
}
