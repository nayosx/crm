import { Component, ViewEncapsulation, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EditorModule } from 'primeng/editor';
import { ButtonModule } from 'primeng/button';
import {
  LaundryServiceLog,
  LaundryServiceLogPayload,
  LaundryServiceStatus
} from '@shared/interfaces/laundry-service.interface';
import { LaundryNotesService } from '@shared/services/laundry/laundry-notes.service';


@Component({
  selector: 'app-laundry-note',
  imports: [CommonModule, ReactiveFormsModule, EditorModule, ButtonModule],
  templateUrl: './laundry-note.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LaundryNoteComponent implements OnChanges {
  @Input() serviceId: number | null = null
  @Input() status!: LaundryServiceStatus
  @Output() noteCreated = new EventEmitter<LaundryServiceLog>()
  @Output() cancel = new EventEmitter<void>()
  form: FormGroup

  constructor(
    private fb: FormBuilder,
    private notesService: LaundryNotesService
  ) {
    this.form = this.fb.group({
      note: ['', Validators.required]
    })
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['serviceId'] && !changes['serviceId'].firstChange) {
      this.form.reset()
    }
  }

  submit() {
    if (!this.serviceId || this.form.invalid) {
      return
    }
    const payload: LaundryServiceLogPayload = {
      detail: this.form.value.note,
      status: this.status
    }
    this.notesService.createNote(this.serviceId, payload)
      .subscribe(created => {
        this.noteCreated.emit(created)
        this.form.reset()
      })
  }

  onCancel() {
    this.cancel.emit()
    this.form.reset()
  }
}