import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ServicePriceOption } from '../../interfaces/service-price-option.interface';
import { LaundryCommercialService } from '../../interfaces/service.interface';
import { OrderItemFormModel } from '../../store/order-form.facade';
import { hasPriceOverride } from '../../utils/order-totals.util';
import { ServiceSelectorComponent } from '../service-selector/service-selector.component';
import { WeightPricingQuoteCardComponent } from '../weight-pricing-quote-card/weight-pricing-quote-card.component';

@Component({
  selector: 'app-order-item-form-row',
  imports: [
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    MessageModule,
    TagModule,
    ServiceSelectorComponent,
    WeightPricingQuoteCardComponent
  ],
  templateUrl: './order-item-form-row.component.html',
  styleUrl: './order-item-form-row.component.scss'
})
export class OrderItemFormRowComponent implements OnInit, OnDestroy {
  @Input({ required: true }) form!: FormGroup<OrderItemFormModel>;
  @Input() services: LaundryCommercialService[] = [];
  @Input() priceOptions: ServicePriceOption[] = [];
  @Input() quoteLoading = false;
  @Input() index = 0;
  @Output() removed = new EventEmitter<void>();
  @Output() serviceSelected = new EventEmitter<number | null>();
  @Output() priceOptionSelected = new EventEmitter<number | null>();
  @Output() quoteRequested = new EventEmitter<void>();

  private subscription = new Subscription();

  ngOnInit(): void {
    this.subscription.add(
      this.form.controls.weightLb.valueChanges.pipe(
        debounceTime(350),
        distinctUntilChanged()
      ).subscribe((value) => {
        if (this.form.controls.serviceType.value === 'WEIGHT' && (value ?? 0) > 0) {
          this.quoteRequested.emit();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get servicePriceOptions(): ServicePriceOption[] {
    return this.priceOptions.filter((item) => item.service_id === this.form.controls.serviceId.value);
  }

  get canEditFinalPrice(): boolean {
    if (this.form.controls.serviceType.value === 'WEIGHT') {
      return Boolean(this.form.controls.quote.value?.allow_manual_override);
    }

    return this.form.controls.allowManualOverride.value;
  }

  get hasOverride(): boolean {
    return hasPriceOverride(
      this.form.controls.recommendedUnitPrice.value,
      this.form.controls.finalUnitPrice.value
    );
  }
}
