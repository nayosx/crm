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
  category_name?: string;
}

export interface TransactionCategory {
  id: number;
  category_name: string;
}

export interface PaymentType {
  id: number;
  name: string;
  description: string | null;
}

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}
