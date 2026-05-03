import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { finalize, map, switchMap } from 'rxjs';
import { Client } from '@shared/interfaces/client.interface';
import { Transaction } from '@shared/interfaces/transaction.interface';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { TransactionService } from '@shared/services/transaction/transaction.service';
import { DialogLoadingService } from '@shared/services/dialog-loading.service';
import { TransactionFormComponent } from '@modules/transaction/components/transaction-form/transaction-form.component';
import { LaundryTransactionPrefill } from '@shared/utils/laundry-transaction.util';

@Component({
  selector: 'app-laundry-transaction-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    MessageModule,
    ProgressSpinnerModule,
    TransactionFormComponent
  ],
  templateUrl: './laundry-transaction-dialog.component.html'
})
export class LaundryTransactionDialogComponent implements OnChanges {
  private readonly transactionService = inject(TransactionService);
  private readonly laundryService = inject(LaundryService);
  private readonly dialogLoadingService = inject(DialogLoadingService);

  @Input() visible = false;
  @Input() serviceId: number | null = null;
  @Input() client: Client | null | undefined = null;
  @Input() prefill: LaundryTransactionPrefill | null = null;
  @Input() transactionId: number | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() transactionLinked = new EventEmitter<Transaction>();

  submitting = false;
  loadingTransaction = false;
  errorMessage: string | null = null;
  currentTransaction: Transaction | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['visible'] || changes['transactionId']) && this.visible) {
      this.loadTransactionForEdition();
    }

    if (changes['visible'] && !this.visible) {
      this.currentTransaction = null;
      this.loadingTransaction = false;
      this.errorMessage = null;
    }
  }

  onVisibleChange(visible: boolean): void {
    if (this.submitting || this.loadingTransaction) {
      return;
    }

    this.visible = visible;
    this.errorMessage = null;
    this.visibleChange.emit(visible);
  }

  onTransactionSubmit(transaction: Partial<Transaction>): void {
    if (!this.serviceId) {
      this.errorMessage = 'No se encontró el servicio para registrar el cobro.';
      return;
    }

    this.submitting = true;
    this.errorMessage = null;
    this.dialogLoadingService.show('Registrando transacción...');

    const request$ = this.currentTransaction?.id
      ? this.transactionService.updateTransaction(this.currentTransaction.id, transaction)
      : this.transactionService.createTransaction(transaction).pipe(
          switchMap((resp) =>
            this.laundryService.update(this.serviceId!, { transaction_id: resp.transaction.id }).pipe(
              map(() => resp.transaction)
            )
          )
        );

    request$.pipe(
      finalize(() => {
        this.submitting = false;
        this.dialogLoadingService.hide();
      })
    ).subscribe({
      next: (transactionResp) => {
        this.currentTransaction = transactionResp;
        this.visible = false;
        this.visibleChange.emit(false);
        this.transactionLinked.emit(transactionResp);
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(
          error,
          this.currentTransaction?.id
            ? 'No se pudo actualizar la transacción.'
            : 'No se pudo registrar la transacción.'
        );
      }
    });
  }

  private loadTransactionForEdition(): void {
    if (!this.transactionId) {
      this.currentTransaction = null;
      this.loadingTransaction = false;
      return;
    }

    this.loadingTransaction = true;
    this.errorMessage = null;
    this.dialogLoadingService.show('Cargando transacción...');

    this.transactionService.getTransaction(this.transactionId).pipe(
      finalize(() => {
        this.loadingTransaction = false;
        this.dialogLoadingService.hide();
      })
    ).subscribe({
      next: (transaction) => {
        this.currentTransaction = transaction;
      },
      error: (error) => {
        this.currentTransaction = null;
        this.errorMessage = this.extractErrorMessage(error, 'No se pudo cargar la transacción.');
      }
    });
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return fallback;
  }
}
