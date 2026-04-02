import { CurrencyPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { OrderTotals } from '../../utils/order-totals.util';

@Component({
  selector: 'app-order-summary-card',
  imports: [CardModule, DividerModule, CurrencyPipe],
  templateUrl: './order-summary-card.component.html',
  styleUrl: './order-summary-card.component.scss'
})
export class OrderSummaryCardComponent {
  @Input({ required: true }) totals!: OrderTotals;
}
