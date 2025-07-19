import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { PaginatedTransactions, PaymentType, Transaction, TransactionCategory, TransactionResponse } from '@shared/interfaces/transaction.interface';
import { PaymentTypeService } from './payment-type.service';
import { TransactionCategoryService } from './transaction-category.service';
import { environment } from '@env/environment.development';

@Injectable({
    providedIn: 'root'
})
export class TransactionService {
    private apiUrl = `${environment.API}/transactions`;

    constructor(
        private http: HttpClient,
        private paymentTypeService: PaymentTypeService,
        private categoryService: TransactionCategoryService
    ) { }

    getTransactions(params?: {
        user_id?: number;
        start_date?: string;
        end_date?: string;
        page?: number;
        per_page?: number;
    }): Observable<PaginatedTransactions> {
        const queryParams: any = {};
        if (params?.user_id !== undefined) queryParams.user_id = params.user_id;
        if (params?.start_date) queryParams.start_date = params.start_date;
        if (params?.end_date) queryParams.end_date = params.end_date;
        if (params?.page) queryParams.page = params.page;
        if (params?.per_page) queryParams.per_page = params.per_page;

        return this.http.get<PaginatedTransactions>(this.apiUrl, { params: queryParams });
    }


    getTransaction(id: number): Observable<Transaction> {
        return this.http.get<Transaction>(`${this.apiUrl}/${id}`);
    }

    createTransaction(transaction: Partial<Transaction>): Observable<TransactionResponse> {
        return this.http.post<TransactionResponse>(this.apiUrl, transaction);
    }

    updateTransaction(id: number, transaction: Partial<Transaction>): Observable<Transaction> {
        return this.http.put<Transaction>(`${this.apiUrl}/${id}`, transaction);
    }

    deleteTransaction(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    loadPaymentTypesAndCategories(): Observable<{
        paymentTypes: PaymentType[];
        categories: TransactionCategory[];
    }> {
        return forkJoin({
            paymentTypes: this.paymentTypeService.getPaymentTypes(),
            categories: this.categoryService.getCategories()
        });
    }
}
