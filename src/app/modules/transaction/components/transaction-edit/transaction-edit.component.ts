import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TransactionService } from '@shared/services/transaction/transaction.service';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { CardModule } from 'primeng/card';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { DialogLoadingService } from '@shared/services/dialog-loading.service';
import { Transaction } from '@shared/interfaces/transaction.interface';

@Component({
  selector: 'app-transaction-edit',
  imports: [
    CommonModule,
    CardModule,
    BackButtonComponent,
    TransactionFormComponent,
    LoaderDialogComponent,
  ],
  templateUrl: './transaction-edit.component.html',
  encapsulation: ViewEncapsulation.None
})
export class TransactionEditComponent implements OnInit {

  transaction?: Transaction;
  loading = true;
  submitting = false;

  constructor(
    private route: ActivatedRoute,
    private transactionService: TransactionService,
    private router: Router,
    private dialogLoadingService: DialogLoadingService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/transactions']);
      return;
    }

    this.dialogLoadingService.show('Cargando transacción...');
    this.transactionService.getTransaction(id).subscribe({
      next: (transaction) => {
        this.transaction = transaction;
        this.loading = false;
        this.dialogLoadingService.hide();
      },
      error: () => {
        this.loading = false;
        this.dialogLoadingService.hide();
        this.router.navigate(['/transactions']);
      }
    });
  }

  update(data: Partial<any>): void {
    if (!this.transaction) return;

    this.submitting = true;
    this.transactionService.updateTransaction(this.transaction.id, data).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/transactions']);
      },
      error: (err) => {
        console.error('Error al actualizar transacción', err);
        this.submitting = false;
      }
    });
  }

}
