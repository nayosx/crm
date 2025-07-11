import { Component, Input, Output, EventEmitter, ViewChild, ViewEncapsulation, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ClientPhoneFacade } from '@shared/services/client/client-phone-facade.service';
import { ClientPhone } from '@shared/interfaces/client.interface';

@Component({
  selector: 'app-client-phone-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputSwitchModule
  ],
  templateUrl: './client-phone-input.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ClientPhoneInputComponent implements OnChanges {
  @Input() clientId?: number;
  @Input() phoneToEdit?: ClientPhone;
  @Output() phoneSaved = new EventEmitter<void>();

  @ViewChild('phoneForm') phoneForm!: NgForm;

  model = {
    phone_number: '',
    is_primary: false
  };

  loading = false;

  constructor(private phoneFacade: ClientPhoneFacade) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['phoneToEdit'] && this.phoneToEdit) {
      this.model = {
        phone_number: this.phoneToEdit.phone_number,
        is_primary: this.phoneToEdit.is_primary
      };
    }
  }

  onSubmit() {
    if (!this.clientId || !this.model.phone_number) return;

    this.loading = true;

    const data = {
      client_id: this.clientId,
      phone_number: this.model.phone_number,
      is_primary: this.model.is_primary
    };

    const obs = this.phoneToEdit
      ? this.phoneFacade.updatePhone(this.phoneToEdit.id, data)
      : this.phoneFacade.createPhone(data);

    obs.subscribe({
      next: () => {
        this.loading = false;
        this.phoneFacade.reload();
        this.phoneSaved.emit();

        this.model = {
          phone_number: '',
          is_primary: false
        };

        this.phoneForm.resetForm({
          is_primary: false,
          phone_number: ''
        });
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }
}
