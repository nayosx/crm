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
      [class]="inputClass"
      [placeholder]="placeholder"
      [disabled]="disabled"
      [value]="displayValue"
      (keydown)="onKeydown($event)"
      (paste)="onPaste($event)"
      (input)="onInput($event)"
      (blur)="onBlur()">
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

  @Output() valueChange = new EventEmitter<string>();

  displayValue: string = '';
  private rawDigits: string = '';

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
      'ArrowDown'
    ]);

    if (allowedKeys.has(event.key)) {
      return;
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      this.pushDigit(event.key);
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
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = this.displayValue;
  }

  onBlur(): void {
    if (this.displayValue !== this.formatDigits(this.rawDigits)) {
      this.emitFormattedValue();
    }
  }

  private syncFromExternalValue(value: string | number | null | undefined): void {
    this.rawDigits = this.extractDigits(value);
    this.displayValue = this.formatDigits(this.rawDigits);
    this.syncInputElement();
  }

  private pushDigit(digit: string): void {
    this.rawDigits = this.trimLeadingZeros(`${this.rawDigits}${digit}`);
    this.emitFormattedValue();
  }

  private popDigit(): void {
    this.rawDigits = this.rawDigits.slice(0, -1);
    this.emitFormattedValue();
  }

  private emitFormattedValue(): void {
    this.displayValue = this.formatDigits(this.rawDigits);
    this.syncInputElement();
    this.valueChange.emit(this.displayValue);
  }

  private syncInputElement(): void {
    if (this.inputElement) {
      this.inputElement.nativeElement.value = this.displayValue;
    }
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

  private handleDeleteKey(event: KeyboardEvent): void {
    event.preventDefault();

    if (!this.rawDigits) {
      this.emitFormattedValue();
      return;
    }

    this.popDigit();
  }

  private getSelectionCoversAll(input: HTMLInputElement): boolean {
    return (input.selectionStart ?? 0) === 0 && (input.selectionEnd ?? 0) === input.value.length;
  }

  private resetDigits(): void {
    this.rawDigits = '';
    this.emitFormattedValue();
  }

  private getEventInput(event: KeyboardEvent): HTMLInputElement | null {
    return event.target instanceof HTMLInputElement ? event.target : null;
  }

  private shouldReplaceAll(event: KeyboardEvent): boolean {
    const input = this.getEventInput(event);
    return !!input && this.getSelectionCoversAll(input);
  }

  private handleEditingKey(event: KeyboardEvent): boolean {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      if (this.shouldReplaceAll(event)) {
        event.preventDefault();
        this.resetDigits();
        return true;
      }

      this.handleDeleteKey(event);
      return true;
    }

    return false;
  }
}
