import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { Extra } from '../../interfaces/extra.interface';
import { OrderExtraFormModel } from '../../store/order-form.facade';
import { ExtraSelectorComponent } from '../extra-selector/extra-selector.component';

@Component({
  selector: 'app-order-extra-form-row',
  imports: [
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputNumberModule,
    ExtraSelectorComponent
  ],
  templateUrl: './order-extra-form-row.component.html',
  styleUrl: './order-extra-form-row.component.scss'
})
export class OrderExtraFormRowComponent {
  @Input({ required: true }) form!: FormGroup<OrderExtraFormModel>;
  @Input() extras: Extra[] = [];
  @Input() index = 0;
  @Output() removed = new EventEmitter<void>();
  @Output() extraSelected = new EventEmitter<number | null>();
}
