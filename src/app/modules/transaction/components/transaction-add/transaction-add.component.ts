import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { TransactionService } from '@shared/services/transaction/transaction.service';
import { CardModule } from 'primeng/card';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';
import { SkeletonModule } from 'primeng/skeleton';


@Component({
  selector: 'app-transaction-add',
  imports: [
    CommonModule,
    CardModule,
    BackButtonComponent,
    TransactionFormComponent,
    SkeletonModule,
  ],
  templateUrl: './transaction-add.component.html',
  encapsulation: ViewEncapsulation.None
})
export class TransactionAddComponent {

  constructor(
    private transactionService: TransactionService,
    private router: Router
  ) {}

  create(data: Partial<any>): void {
    this.transactionService.createTransaction(data).subscribe({
      next: () => {
        this.router.navigate(['/transactions']);
      },
      error: (err) => {
        console.error('Error al crear transacción', err);
        // Aquí puedes mostrar notificación o alerta si gustas
      }
    });
  }
}