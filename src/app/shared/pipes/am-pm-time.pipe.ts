import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';

@Pipe({
  name: 'amPmTime',
  standalone: true,
  pure: true
})
export class AmPmTimePipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    if (!value) return '';
    return dayjs(value).format('h:mm A');
  }
}
