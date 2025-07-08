import { Component, Input, Output, EventEmitter, ViewEncapsulation, SimpleChanges, OnChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Client } from '@shared/interfaces/client.interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule
  ],
  templateUrl: './client-form.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ClientFormComponent implements OnChanges {
  @Input() client?: Client;
  @Input() loading = false;
  @Input() disabled = false;

  @Output() submitForm = new EventEmitter<Partial<Client>>();

  private router = inject(Router);

  model: Partial<Client> = {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['client'] && this.client) {
      this.model = {
        name: this.client.name,
        email: this.client.email,
        document_id: this.client.document_id
      };
    }
  }

  onSubmit() {
    if (!this.model.name) return;
    this.submitForm.emit(this.model);
  }

  onCancel() {
    this.model = {};
    this.submitForm.emit({});
    this.router.navigate(['/clients']);
  }
}
