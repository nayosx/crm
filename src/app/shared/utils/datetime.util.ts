import dayjs from 'dayjs';

export const getRoundedCurrentTime = (): string => {
  const now = dayjs();
  const minutes = now.minute();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  const roundedTime = now.minute(roundedMinutes).second(0).millisecond(0);
  return roundedTime.toISOString();
}

export const combineDateAndTime = (dateInput: Date | string | null | undefined, timeInput: Date | string | null | undefined): Date | null => {
  if (!dateInput || !timeInput) return null;
  const d = dayjs(dateInput);
  const t = dayjs(timeInput);
  const combined = d.hour(t.hour()).minute(t.minute()).second(t.second() ?? 0).millisecond(0);
  return combined.toDate();
}

export const formatToSQLDateTime = (input: Date | string): string => {
  return dayjs(input).format('YYYY-MM-DD HH:mm:ss');
}

export const combineToSQLDateTime = (dateInput: Date | string | null | undefined, timeInput: Date | string | null | undefined): string | null => {
  const combined = combineDateAndTime(dateInput, timeInput);
  return combined ? formatToSQLDateTime(combined) : null;
}
