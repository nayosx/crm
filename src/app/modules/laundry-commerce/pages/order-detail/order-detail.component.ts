import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { Order } from '../../interfaces/order.interface';
import { OrdersApiService } from '../../services/orders-api.service';
import { WeightPricingQuoteCardComponent } from '../../components/weight-pricing-quote-card/weight-pricing-quote-card.component';
import { toNumber } from '../../utils/decimal.util';

@Component({
  selector: 'app-order-detail-page',
  imports: [
    RouterLink,
    ToolbarModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    MessageModule,
    AccordionModule,
    CurrencyPipe,
    DatePipe,
    WeightPricingQuoteCardComponent
  ],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss'
})
export class OrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersApi = inject(OrdersApiService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly order = signal<Order | null>(null);
  readonly toNumber = toNumber;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.ordersApi.getById(id).pipe(
      finalize(() => this.loading.set(false)),
      catchError(() => {
        this.error.set('No fue posible cargar el detalle del pedido.');
        return of(null);
      })
    ).subscribe((order) => this.order.set(order));
  }

  getStatusSeverity(status: Order['status']): 'secondary' | 'info' | 'warn' | 'success' | 'danger' {
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

  hasPricingSnapshots(order: Order | null): boolean {
    return Boolean(order?.items.some((item) => item.pricing_snapshot));
  }
}
