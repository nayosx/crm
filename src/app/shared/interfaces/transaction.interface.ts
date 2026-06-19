export type PaymentSurchargeType = 'PERCENT' | 'FIXED' | 'NONE';

export interface Transaction {
  id: number;
  user_id: number;
  transaction_type: 'IN' | 'OUT';
  payment_type_id: number;
  category_id: number | null;
  client_id: number | null;
  detail: string | null;
  amount: string;
  created_at: string;
  updated_at: string;
  payment_type_name?: string;
  payment_type_code?: string;
  payment_surcharge_type?: PaymentSurchargeType | null;
  payment_surcharge_value?: string | null;
  category_name?: string;
  client_name?: string | null;
  user_name?: string | null;
}

export interface TransactionFull {
  id: number;
  amount: string;
  category_id: number | null;
  client_id: number;
  client_name: string;
  created_at: string;
  updated_at: string;
  detail: string;
  payment_type_id: number;
  payment_type_name: string;
  transaction_type: 'IN' | 'OUT';
  user_id: number;
  user_name: string;
}

export interface TransactionCategory {
  id: number;
  category_name: string;
}

export interface PaymentType {
  id: number;
  code?: string;
  name: string;
  description: string | null;
  surcharge_type?: PaymentSurchargeType | null;
  surcharge_value?: string | null;
  is_active?: boolean;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

export interface TransactionResponse {
  message: string;
  transaction: Transaction;
}

export interface TransactionFortnightSummaryRange {
  start_date: string;
  end_date: string;
}

export interface TransactionFortnightSummaryFilters {
  user_id: number | null;
}

export interface TransactionFortnightSummaryItem {
  year: number;
  month: number;
  fortnight: 1 | 2;
  label: string;
  bucket_start_date: string;
  bucket_end_date: string;
  in_total: string;
  out_total: string;
}

export interface TransactionFortnightSummaryResponse {
  range: TransactionFortnightSummaryRange;
  filters: TransactionFortnightSummaryFilters;
  items: TransactionFortnightSummaryItem[];
}
