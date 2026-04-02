import { OrderExtraItem, OrderItem } from '../interfaces/order.interface';
import { sumCurrency, toNumber } from './decimal.util';

export interface OrderTotals {
  subtotalItems: number;
  subtotalExtras: number;
  delivery: number;
  globalDiscount: number;
  totalFinal: number;
}

export const calculateOrderItemSubtotal = (item: Pick<OrderItem, 'quantity' | 'final_unit_price' | 'discount_amount'>): number => {
  const base = toNumber(item.final_unit_price) * Math.max(item.quantity || 0, 0);
  return Math.max(0, Math.round((base - toNumber(item.discount_amount)) * 100) / 100);
};

export const calculateOrderExtraSubtotal = (item: Pick<OrderExtraItem, 'quantity' | 'final_unit_price'>): number => {
  return Math.max(0, Math.round(toNumber(item.final_unit_price) * Math.max(item.quantity || 0, 0) * 100) / 100);
};

export const calculateOrderTotals = (payload: {
  items: Pick<OrderItem, 'subtotal'>[];
  extras: Pick<OrderExtraItem, 'subtotal'>[];
  delivery_final_amount?: number;
  global_discount_amount?: number;
}): OrderTotals => {
  const subtotalItems = sumCurrency(payload.items.map((item) => item.subtotal));
  const subtotalExtras = sumCurrency(payload.extras.map((item) => item.subtotal));
  const delivery = toNumber(payload.delivery_final_amount);
  const globalDiscount = toNumber(payload.global_discount_amount);
  const totalFinal = Math.max(0, Math.round((subtotalItems + subtotalExtras + delivery - globalDiscount) * 100) / 100);

  return {
    subtotalItems,
    subtotalExtras,
    delivery,
    globalDiscount,
    totalFinal
  };
};

export const hasPriceOverride = (recommended: number | null | undefined, finalPrice: number | null | undefined): boolean => {
  if (recommended === null || recommended === undefined) {
    return false;
  }

  return Math.abs((finalPrice ?? 0) - recommended) >= 0.01;
};
