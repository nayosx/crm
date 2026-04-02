import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DeliveryZone } from '../../interfaces/delivery-zone.interface';
import { toNumber } from '../../utils/decimal.util';

@Component({
  selector: 'app-delivery-zone-selector',
  imports: [ReactiveFormsModule, SelectModule, CurrencyPipe],
  templateUrl: './delivery-zone-selector.component.html'
})
export class DeliveryZoneSelectorComponent {
  @Input({ required: true }) control!: FormControl<number | null>;
  @Input() zones: DeliveryZone[] = [];
  @Output() selected = new EventEmitter<number | null>();

  readonly toNumber = toNumber;

  onSelected(value: number | null): void {
    this.selected.emit(value);
  }
}
