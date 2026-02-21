import {
  LAUNDRY_STATUSES,
  type LaundryStatus,
  type LaundryStatusInput,
  type LaundryQueueStatusPayload
} from './laundry-socket.types';

const LAUNDRY_STATUS_SET = new Set<string>(LAUNDRY_STATUSES);

export function normalizeLaundryStatuses(input?: LaundryStatusInput): LaundryStatus[] {
  if (input == null || input === '') {
    return [];
  }

  const values = Array.isArray(input) ? input : [input];
  const expanded = values
    .flatMap((entry) => String(entry).split(','))
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);

  if (expanded.length === 0 || expanded.includes('ALL')) {
    return [];
  }

  const unique = Array.from(new Set(expanded));
  const invalid = unique.filter((status) => !LAUNDRY_STATUS_SET.has(status));

  if (invalid.length > 0) {
    throw new Error(`Invalid laundry status filter: ${invalid.join(', ')}`);
  }

  return unique as LaundryStatus[];
}

export function toLaundryStatusPayload(input?: LaundryStatusInput): LaundryQueueStatusPayload | undefined {
  const normalized = normalizeLaundryStatuses(input);

  if (normalized.length === 0) {
    return undefined;
  }

  if (normalized.length === 1) {
    return { status: normalized[0] };
  }

  return { status: normalized };
}

export function validateLaundryIds(ids: readonly number[]): number[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids must be a non-empty number array');
  }

  const invalid = ids.find((id) => !Number.isInteger(id) || id <= 0);
  if (invalid !== undefined) {
    throw new Error(`Invalid id in reorder list: ${invalid}`);
  }

  return [...ids];
}
