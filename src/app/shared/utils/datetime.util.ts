import dayjs from 'dayjs';

export const getRoundedCurrentTime = (): string => {
  const now = dayjs();
  const minutes = now.minute();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;

  const roundedTime = now.minute(roundedMinutes).second(0).millisecond(0);

  // Si se pasa de la hora, dayjs lo manejará correctamente (ej. 23:52 => 00:00)
  return roundedTime.toISOString();
}
