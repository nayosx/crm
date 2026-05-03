import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true,
  pure: true
})
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, max = 30, ellipsis = '…', preserveWords = false): string {
    if (value == null) return '';
    const str = String(value);
    if (max <= 0) return '';
    if (str.length <= max) return str;
    const cut = Math.max(0, max - (ellipsis ? ellipsis.length : 0));
    let sliced = str.slice(0, cut);
    if (preserveWords && cut > 0) {
      const i = sliced.lastIndexOf(' ');
      if (i > 0) sliced = sliced.slice(0, i);
    }
    return sliced + (ellipsis || '');
  }
}
