import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { Order, OrderStatus } from '../../interfaces/order.interface';
import { PaginatedResponse } from '../../interfaces/paginated-response.interface';
import { OrdersApiService } from '../../services/orders-api.service';
import { UserService } from '@shared/services/user/user.service';
import { User } from '@shared/interfaces/user.interface';

@Component({
  selector: 'app-order-list-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ToolbarModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    TagModule,
    MessageModule,
    CurrencyPipe,
    DatePipe
  ],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss'
})
export class OrderListComponent implements OnInit {
  private readonly ordersApi = inject(OrdersApiService);
  private readonly userService = inject(UserService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly orders = signal<Order[]>([]);
  readonly totalRecords = signal(0);
  readonly page = signal(1);
  readonly rows = signal(10);
  readonly cashiers = signal<User[]>([]);
  readonly statusOptions = [
    { label: 'Todos', value: '' },
    { label: 'Borrador', value: 'DRAFT' },
    { label: 'Confirmado', value: 'CONFIRMED' },
    { label: 'En proceso', value: 'IN_PROGRESS' },
    { label: 'Listo', value: 'READY' },
    { label: 'Entregado', value: 'DELIVERED' },
    { label: 'Cancelado', value: 'CANCELLED' }
  ];

  readonly filters = new FormGroup({
    client: new FormControl('', { nonNullable: true }),
    status: new FormControl<OrderStatus | ''>('', { nonNullable: true }),
    cashierUserId: new FormControl<number | null>(null),
    dateRange: new FormControl<Date[] | null>(null)
  });

  ngOnInit(): void {
    this.userService.getUserslite().pipe(catchError(() => of([]))).subscribe((users) => this.cashiers.set(users));
    this.loadOrders();
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadOrders();
  }

  onPage(event: { first: number; rows: number }): void {
    this.rows.set(event.rows);
    this.page.set(Math.floor(event.first / event.rows) + 1);
    this.loadOrders();
  }

  getStatusSeverity(status: OrderStatus): 'secondary' | 'info' | 'warn' | 'success' | 'danger' {
    switch (status) {
      case 'CONFIRMED':
        return 'info';
      case 'IN_PROGRESS':
        return 'warn';
      case 'READY':
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  private loadOrders(): void {
    const dateRange = this.filters.controls.dateRange.value;
    const dateFrom = dateRange?.[0] ? dateRange[0].toISOString().slice(0, 10) : null;
    const dateTo = dateRange?.[1] ? dateRange[1].toISOString().slice(0, 10) : null;

    this.loading.set(true);
    this.error.set('');

    this.ordersApi.list({
      page: this.page(),
      per_page: this.rows(),
      client: this.filters.controls.client.value || undefined,
      status: this.filters.controls.status.value || '',
      cashier_user_id: this.filters.controls.cashierUserId.value,
      date_from: dateFrom,
      date_to: dateTo
    }).pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => {
        this.error.set('No fue posible cargar la lista de pedidos.');
        return of({
          items: [],
          total: 0,
          page: this.page(),
          pages: 0,
          current_page: 1,
          per_page: this.rows()
        } satisfies PaginatedResponse<Order>);
      })
    ).subscribe((response) => {
      this.orders.set(response.items);
      this.totalRecords.set(response.total);
    });
  }
}
