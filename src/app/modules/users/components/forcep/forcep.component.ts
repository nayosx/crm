import { Component, ViewEncapsulation, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ForcePasswordRequest } from '@shared/interfaces/user.interface';

@Component({
  selector: 'app-forcep-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule
  ],
  templateUrl: './forcep.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ForcepComponent {
  @Input() username:string = 'No name';
  @Output() save = new EventEmitter<ForcePasswordRequest>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  submit(): void {
    if (this.form.valid) {
      this.save.emit(this.form.value);
    }
  }
}
