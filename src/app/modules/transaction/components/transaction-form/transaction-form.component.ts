import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Transaction, TransactionCategory, PaymentType } from '@shared/interfaces/transaction.interface';
import { Client } from '@shared/interfaces/client.interface';
import { ClientListComponent } from '@shared/components/client-list/client-list.component';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
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
    FormsModule,
    ReactiveFormsModule,
    ClientListComponent,
    SelectModule,
    InputTextModule,
    ButtonModule,
    TagModule,
    EditorModule,
    SelectButtonModule,
    DialogModule
  ],
  templateUrl: './transaction-form.component.html'
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

      console.log('Form submitted:', formValue);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
