import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Extra } from '../../interfaces/extra.interface';

@Component({
  selector: 'app-extra-selector',
  imports: [ReactiveFormsModule, SelectModule],
  templateUrl: './extra-selector.component.html'
})
export class ExtraSelectorComponent {
  @Input({ required: true }) control!: FormControl<number | null>;
  @Input() extras: Extra[] = [];
  @Output() selected = new EventEmitter<number | null>();

  onSelected(value: number | null): void {
    this.selected.emit(value);
  }
}
