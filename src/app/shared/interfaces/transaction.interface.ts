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


export interface TransactionResponse {
  message: string;
  transaction: Transaction;
}
