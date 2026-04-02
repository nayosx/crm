import { HttpParams } from '@angular/common/http';
import { DecimalLike } from '../interfaces/common.interface';

export const toNumber = (value: DecimalLike): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : 0;
  }

  return 0;
};

export const roundCurrency = (value: DecimalLike): number => {
  return Math.round(toNumber(value) * 100) / 100;
};

export const sumCurrency = (values: DecimalLike[]): number => {
  return roundCurrency(values.reduce<number>((accumulator, current) => accumulator + toNumber(current), 0));
};

export const buildHttpParams = (params: object): HttpParams => {
  let httpParams = new HttpParams();

  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    httpParams = httpParams.set(key, String(value));
  });

  return httpParams;
};
