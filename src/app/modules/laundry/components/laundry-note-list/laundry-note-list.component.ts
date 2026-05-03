import { Component, ViewEncapsulation, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LaundryNotesService } from '@shared/services/laundry/laundry-notes.service';
import { LaundryServiceLog } from '@shared/interfaces/laundry-service.interface';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { LaundryStatusColorMap } from '@shared/utils/color.util';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-laundry-note-list',
  imports: [CommonModule, ButtonModule, TagModule, DialogModule],
  templateUrl: './laundry-note-list.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LaundryNoteListComponent implements OnInit, OnChanges {
  @Input() serviceId: number | null = null;
  @Input() newNote: LaundryServiceLog | null = null;
  @Output() noteDeleted = new EventEmitter<number>();
  notes: LaundryServiceLog[] = [];
  loading = false;
  statusColorMap = LaundryStatusColorMap;

  constructor(private notesService: LaundryNotesService) { }

  ngOnInit() {
    if (this.serviceId) {
      this.loadNotes();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['serviceId'] && !changes['serviceId'].firstChange) {
      this.loadNotes();
    }
    if (changes['newNote'] && this.newNote && this.newNote.laundry_service_id === this.serviceId) {
      this.notes = [this.newNote, ...this.notes];
    }
  }

  loadNotes() {
    if (!this.serviceId) {
      this.notes = [];
      return;
    }
    this.loading = true;
    this.notesService.getNotes(this.serviceId).subscribe({
      next: data => {
        this.notes = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  isErrorOnDelete:boolean = false;
  deleteLog(logId: number) {
    this.isErrorOnDelete = false;
    this.notesService.deleteNote(logId).subscribe(() => {
      this.notes = this.notes.filter(n => n.id !== logId);
      this.noteDeleted.emit(logId);
    }, () => {
      this.isErrorOnDelete = true;
    });
  }

  doCloseErrDialog():void {
    this.isErrorOnDelete = false;
  }

  trackById(index: number, item: LaundryServiceLog): number {
    return item.id;
  }


}