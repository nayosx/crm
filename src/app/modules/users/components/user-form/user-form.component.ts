import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User, Role } from '@shared/interfaces/user.interface';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-user-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DropdownModule,
    InputTextModule,
    ButtonModule
  ],
  templateUrl: './user-form.component.html'
})
export class UserFormComponent implements OnChanges {
  @Input() initialData: User | null = null;
  @Input() roles: Role[] | null = [];
  @Output() submitForm = new EventEmitter<Partial<User>>();

  form: FormGroup;
  isCreating = true;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      name: ['', Validators.required],
      phone: [''],
      role_id: [null, Validators.required],
      password: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData']) {
      this.isCreating = !this.initialData;

      if (this.initialData) {
        this.form.patchValue(this.initialData);
        this.form.get('password')?.clearValidators();
        this.form.get('password')?.updateValueAndValidity();
      } else {
        this.form.get('password')?.setValidators(Validators.required);
        this.form.get('password')?.updateValueAndValidity();
        this.form.reset();
      }
    }
  }

  onSubmit(): void {
    if (this.form.valid) {
      const formValue = { ...this.form.value };
      if (!this.isCreating) {
        delete formValue.password;
      }
      this.submitForm.emit(formValue);
    }
  }
}
