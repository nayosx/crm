import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-decimal-input',
  standalone: true,
  imports: [InputTextModule],
  template: `
    <input
      #inputElement
      pInputText
      [id]="id"
      type="text"
      inputmode="decimal"
      pattern="[0-9]*"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      [class]="inputClass"
      [placeholder]="placeholder"
      [disabled]="disabled"
      [value]="displayValue"
      (keydown)="onKeydown($event)"
      (paste)="onPaste($event)"
      (input)="onInput($event)"
      (blur)="onBlur()"
      (compositionstart)="onCompositionStart()"
      (compositionend)="onCompositionEnd($event)"
      (focus)="onFocus($event)">
  `
})
export class DecimalInputComponent implements OnChanges {
  @ViewChild('inputElement') private inputElement?: ElementRef<HTMLInputElement>;

  @Input() id?: string;
  @Input() value: string | number | null | undefined = '';
  @Input() disabled: boolean = false;
  @Input() decimals: number = 2;
  @Input() min: number = 0;
  @Input() allowNegative: boolean = false;
  @Input() placeholder: string = '';
  @Input() inputClass: string = '';
  @Input() selectOnFocus: boolean = false;

  @Output() valueChange = new EventEmitter<string>();

  displayValue: string = '';
  private rawDigits: string = '';
  private composing = false;
  private suppressInput = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('value' in changes) {
      this.syncFromExternalValue(this.value);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (this.handleEditingKey(event)) {
      return;
    }

    const allowedKeys = new Set([
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ]);

    if (allowedKeys.has(event.key)) {
      return;
    }

    if (this.composing) {
      return;
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      this.insertDigit(event.key);
      return;
    }

    event.preventDefault();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text') ?? '';
    const nextDigits = pastedText.replace(/\D/g, '');
    if (!nextDigits) {
      return;
    }

    this.rawDigits = this.trimLeadingZeros(nextDigits);
    this.emitFormattedValue();
    this.setCursorToEnd();
  }

  onInput(event: Event): void {
    if (this.suppressInput) {
      return;
    }

    if (this.composing) {
      return;
    }

    const input = event.target as HTMLInputElement;
    if (input.value !== this.displayValue) {
      input.value = this.displayValue;
    }
  }

  onBlur(): void {
    if (this.displayValue !== this.formatDigits(this.rawDigits)) {
      this.emitFormattedValue();
    }
  }

  onCompositionStart(): void {
    this.composing = true;
  }

  onCompositionEnd(event: CompositionEvent): void {
    this.composing = false;

    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');

    if (digits) {
      this.rawDigits = this.trimLeadingZeros(digits);
    } else {
      this.rawDigits = '';
    }

    this.emitFormattedValue();
    this.setCursorToEnd();
  }

  onFocus(event: FocusEvent): void {
    if (this.selectOnFocus) {
      (event.target as HTMLInputElement).select();
    }
  }

  // ---- cursor / selection helpers ----

  private getSelectionRange(): { start: number; end: number } {
    const input = this.inputElement?.nativeElement;
    if (!input) {
      return { start: this.rawDigits.length, end: this.rawDigits.length };
    }

    const selStart = input.selectionStart ?? 0;
    const selEnd = input.selectionEnd ?? 0;
    const coversAll = selStart === 0 && selEnd === input.value.length && input.value.length > 0;

    if (coversAll) {
      return { start: 0, end: this.rawDigits.length };
    }

    const rawStart = this.displayPosToRawIndex(selStart);
    const rawEnd = this.displayPosToRawIndex(selEnd);

    return rawStart <= rawEnd
      ? { start: rawStart, end: rawEnd }
      : { start: rawEnd, end: rawStart };
  }

  private restoreCursor(rawPos: number): void {
    const input = this.inputElement?.nativeElement;
    if (!input) return;

    const displayPos = this.rawIndexToDisplayPos(rawPos);
    input.setSelectionRange(displayPos, displayPos);
  }

  private setCursorToEnd(): void {
    const input = this.inputElement?.nativeElement;
    if (!input) return;

    const end = this.displayValue.length;
    input.setSelectionRange(end, end);
  }

  private displayPosToRawIndex(displayPos: number): number {
    let digitCount = 0;
    for (let i = 0; i < displayPos && i < this.displayValue.length; i++) {
      if (/\d/.test(this.displayValue[i])) {
        digitCount++;
      }
    }
    return Math.min(digitCount, this.rawDigits.length);
  }

  private rawIndexToDisplayPos(rawIndex: number): number {
    let digitCount = 0;
    for (let i = 0; i < this.displayValue.length; i++) {
      if (/\d/.test(this.displayValue[i])) {
        if (digitCount >= rawIndex) {
          return i;
        }
        digitCount++;
      }
    }
    return this.displayValue.length;
  }

  // ---- digit mutation ----

  private insertDigit(digit: string): void {
    const { start: rawStart, end: rawEnd } = this.getSelectionRange();

    const before = this.rawDigits.slice(0, rawStart);
    const after = this.rawDigits.slice(rawEnd);
    this.rawDigits = this.trimLeadingZeros(`${before}${digit}${after}`);

    const newRawCursor = rawStart + 1;
    this.emitFormattedValue();
    this.restoreCursor(newRawCursor);
  }

  // ---- value sync / formatting ----

  private emitFormattedValue(): void {
    this.displayValue = this.formatDigits(this.rawDigits);
    this.syncInputElement();
    this.valueChange.emit(this.displayValue);
  }

  private syncInputElement(): void {
    if (!this.inputElement) return;

    this.suppressInput = true;
    this.inputElement.nativeElement.value = this.displayValue;
    this.suppressInput = false;
  }

  private syncFromExternalValue(value: string | number | null | undefined): void {
    const newRawDigits = this.extractDigits(value);
    const newDisplayValue = this.formatDigits(newRawDigits);

    if (newDisplayValue === this.displayValue) {
      return;
    }

    this.rawDigits = newRawDigits;
    this.displayValue = newDisplayValue;
    this.syncInputElement();
  }

  private extractDigits(value: string | number | null | undefined): string {
    if (value == null || value === '') {
      return '';
    }

    const normalized = typeof value === 'number'
      ? value.toFixed(this.decimals)
      : String(value).replace(/,/g, '.');

    const numericValue = Number(normalized);
    if (!Number.isFinite(numericValue)) {
      return '';
    }

    const clampedValue = this.allowNegative ? numericValue : Math.max(this.min, numericValue);
    const scaledValue = Math.round(Math.abs(clampedValue) * (10 ** this.decimals));
    return String(scaledValue);
  }

  private formatDigits(digits: string): string {
    const safeDigits = digits || '0';
    const paddedDigits = safeDigits.padStart(this.decimals + 1, '0');
    const integerPart = paddedDigits.slice(0, -this.decimals) || '0';
    const decimalPart = paddedDigits.slice(-this.decimals);

    if (this.decimals === 0) {
      return integerPart;
    }

    return `${integerPart}.${decimalPart}`;
  }

  private trimLeadingZeros(value: string): string {
    const trimmed = value.replace(/^0+(?=\d)/, '');
    return trimmed.slice(0, 12);
  }

  // ---- deletion ----

  private handleDeleteKey(event: KeyboardEvent): void {
    event.preventDefault();

    const { start: rawStart, end: rawEnd } = this.getSelectionRange();

    if (rawEnd > rawStart) {
      this.rawDigits = this.rawDigits.slice(0, rawStart) + this.rawDigits.slice(rawEnd);
      this.emitFormattedValue();
      this.restoreCursor(rawStart);
      return;
    }

    if (event.key === 'Backspace') {
      if (rawStart === 0 || !this.rawDigits) {
        return;
      }
      this.rawDigits = this.rawDigits.slice(0, rawStart - 1) + this.rawDigits.slice(rawStart);
      this.emitFormattedValue();
      this.restoreCursor(rawStart - 1);
      return;
    }

    if (event.key === 'Delete') {
      if (rawStart >= this.rawDigits.length) {
        return;
      }
      this.rawDigits = this.rawDigits.slice(0, rawStart) + this.rawDigits.slice(rawStart + 1);
      this.emitFormattedValue();
      this.restoreCursor(rawStart);
      return;
    }
  }

  private handleEditingKey(event: KeyboardEvent): boolean {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      this.handleDeleteKey(event);
      return true;
    }

    return false;
  }
}
