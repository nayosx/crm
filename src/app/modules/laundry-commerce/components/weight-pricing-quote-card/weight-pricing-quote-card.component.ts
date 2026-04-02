import { CurrencyPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { WeightPricingQuoteResponse, WeightPricingQuoteSnapshot } from '../../interfaces/weight-pricing.interface';
import { toNumber } from '../../utils/decimal.util';

@Component({
  selector: 'app-weight-pricing-quote-card',
  imports: [CardModule, MessageModule, TableModule, TagModule, CurrencyPipe],
  templateUrl: './weight-pricing-quote-card.component.html',
  styleUrl: './weight-pricing-quote-card.component.scss'
})
export class WeightPricingQuoteCardComponent {
  @Input() quote: WeightPricingQuoteResponse | WeightPricingQuoteSnapshot | null = null;
  @Input() currentFinalPrice = 0;

  readonly toNumber = toNumber;

  getWeight(): number {
    if (!this.quote || !('weight_lb' in this.quote)) {
      return 0;
    }

    return toNumber(this.quote.weight_lb);
  }
}
