export type DecimalLike = number | string | null | undefined;

export interface SelectOption<T = number> {
  label: string;
  value: T;
}
