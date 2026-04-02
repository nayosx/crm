import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { LaundryCommercialService } from '../../interfaces/service.interface';

@Component({
  selector: 'app-service-selector',
  imports: [ReactiveFormsModule, SelectModule],
  templateUrl: './service-selector.component.html'
})
export class ServiceSelectorComponent {
  @Input({ required: true }) control!: FormControl<number | null>;
  @Input() services: LaundryCommercialService[] = [];
  @Input() placeholder = 'Selecciona servicio';
  @Output() selected = new EventEmitter<number | null>();

  onSelected(value: number | null): void {
    this.selected.emit(value);
  }
}
