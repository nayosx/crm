import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Transaction, TransactionCategory, PaymentType } from '@shared/interfaces/transaction.interface';
import { Client } from '@shared/interfaces/client.interface';
import { ClientListComponent } from '@shared/components/client-list/client-list.component';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { EditorModule } from 'primeng/editor';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DialogModule } from 'primeng/dialog';
import { UserData } from '@shared/interfaces/auth.interface';
import { TransactionService } from '@shared/services/transaction/transaction.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-transaction-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ClientListComponent,
    SelectModule,
    InputTextModule,
    ButtonModule,
    CardModule,
    DividerModule,
    TagModule,
    EditorModule,
    SelectButtonModule,
    DialogModule,
    CurrencyPipe
  ],
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.scss',
  animations: [
    trigger('customerPriceReveal', [
      state('base', style({
        transform: 'scale(1)',
        boxShadow: '0 0 0 rgba(0, 0, 0, 0)'
      })),
      state('extra', style({
        transform: 'scale(1)',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)'
      })),
      transition('base => extra', [
        style({
          transform: 'scale(0.96)',
          boxShadow: '0 0 0 rgba(0, 0, 0, 0)'
        }),
        animate('280ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({
          transform: 'scale(1.03)',
          boxShadow: '0 16px 34px rgba(0, 0, 0, 0.16)'
        })),
        animate('180ms ease-out', style({
          transform: 'scale(1)',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)'
        }))
      ]),
      transition('extra => base', [
        animate('180ms ease-out')
      ])
    ])
  ]
})
export class TransactionFormComponent implements OnInit {
  @Input() transaction: Transaction | null = null;
  @Input() submitLabel = 'Guardar';
  @Input() client: Client | null | undefined = null;

  @Output() onSubmit = new EventEmitter<Partial<Transaction>>();

  form!: FormGroup;
  selectedClientName = '';
  displayClientDialog = false;
  userId: number | null = null;

  paymentTypes: PaymentType[] = [];
  categories: TransactionCategory[] = [];
  ready = false;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userRaw = sessionStorage.getItem('user');
    if (userRaw) {
      const user: UserData = JSON.parse(userRaw);
      this.userId = user.id;
    }

    const isAutoMode = !!this.client;

    this.transactionService.loadPaymentTypesAndCategories().subscribe(data => {
      this.paymentTypes = data.paymentTypes;
      this.categories = data.categories;
      this.ready = true;

      this.form = this.fb.group({
        transaction_type: [{ value: isAutoMode ? 'IN' : this.transaction?.transaction_type || 'IN', disabled: isAutoMode }, Validators.required],
        payment_type_id: [this.transaction?.payment_type_id || null, Validators.required],
        category_id: [{ value: this.transaction?.category_id || null, disabled: true }],
        client_id: [{ value: isAutoMode ? this.client?.id : this.transaction?.client_id || null, disabled: isAutoMode }],
        detail: [this.transaction?.detail || null],
        amount: [
          this.transaction?.amount || '',
          [
            Validators.required,
            Validators.min(0.01),
            Validators.pattern(/^\d+(\.\d{1,2})?$/)
          ]
        ]
      });

      if (isAutoMode && this.client) {
        this.selectedClientName = this.client.name;
      }

      this.updateValidators(this.form.get('transaction_type')?.value);

      this.form.get('transaction_type')?.valueChanges.subscribe(type => {
        this.updateValidators(type);
      });
    });
  }

  get selectedPaymentType(): PaymentType | undefined {
    const paymentTypeId = Number(this.form?.get('payment_type_id')?.value);
    return this.paymentTypes.find((item) => item.id === paymentTypeId);
  }

  get baseAmount(): number {
    const rawAmount = this.form?.get('amount')?.value;
    const parsed = Number(rawAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  get surchargeTypeLabel(): string {
    const surchargeType = this.selectedPaymentType?.surcharge_type;

    if (surchargeType === 'FIXED') {
      return 'Monto fijo';
    }

    if (surchargeType === 'PERCENT') {
      return 'Porcentaje';
    }

    return 'Sin recargo';
  }

  get surchargeValue(): number {
    const rawValue = Number(this.selectedPaymentType?.surcharge_value ?? 0);
    return Number.isFinite(rawValue) ? rawValue : 0;
  }

  get surchargeAmount(): number {
    if (!this.selectedPaymentType) {
      return 0;
    }

    if (this.selectedPaymentType.surcharge_type === 'FIXED') {
      return this.roundCurrency(this.surchargeValue);
    }

    if (this.selectedPaymentType.surcharge_type === 'PERCENT') {
      return this.roundCurrency(this.baseAmount * (this.surchargeValue / 100));
    }

    return 0;
  }

  get totalToCharge(): number {
    return this.roundCurrency(this.baseAmount + this.surchargeAmount);
  }

  get customerPriceAnimationState(): 'base' | 'extra' {
    return this.surchargeAmount > 0 ? 'extra' : 'base';
  }

  updateValidators(type: 'IN' | 'OUT'): void {
    const categoryControl = this.form.get('category_id');
    const clientControl = this.form.get('client_id');

    if (type === 'IN') {
      if (!this.client) {
        clientControl?.enable();
        clientControl?.setValidators([Validators.required]);
        clientControl?.updateValueAndValidity();
      }

      categoryControl?.setValue(null);
      categoryControl?.clearValidators();
      categoryControl?.disable();
    } else {
      categoryControl?.enable();
      categoryControl?.setValidators([Validators.required]);
      categoryControl?.updateValueAndValidity();

      if (!this.client) {
        clientControl?.setValue(null);
        clientControl?.clearValidators();
        clientControl?.disable();
      }

      this.selectedClientName = '';
    }
  }

  openClientDialog(): void {
    this.displayClientDialog = true;
  }

  onClientSelected(client: Client): void {
    this.form.get('client_id')?.setValue(client.id);
    this.selectedClientName = client.name;
    this.displayClientDialog = false;
  }

  submit(): void {
    if (this.form.valid) {
      const formValue = this.form.getRawValue();
      formValue.user_id = this.userId;

      this.onSubmit.emit(formValue);
    } else {
      this.form.markAllAsTouched();
    }
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
