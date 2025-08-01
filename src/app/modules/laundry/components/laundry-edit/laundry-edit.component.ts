import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LaundryServiceResp, LaundryServiceLog } from '@shared/interfaces/laundry-service.interface';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { LaundryFormComponent } from '../laundry-form/laundry-form.component';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { LaundryNoteListComponent } from '../laundry-note-list/laundry-note-list.component';
import { LaundryNoteComponent } from '../laundry-note/laundry-note.component';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-laundry-edit',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    DialogModule,
    LaundryFormComponent,
    LaundryNoteListComponent,
    LaundryNoteComponent,
    BackButtonComponent,
    ButtonModule,
  ],
  templateUrl: './laundry-edit.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class LaundryEditComponent implements OnInit {
  initialData?: LaundryServiceResp;
  loading = true;

  notesDialogVisible = false;
  latestNote: LaundryServiceLog | null = null;

  constructor(
    private route: ActivatedRoute,
    private laundryService: LaundryService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.laundryService.getById(+id).subscribe({
        next: data => {
          this.initialData = data;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.router.navigate(['/laundry']);
        }
      });
    }
  }

  onFormSubmit(data: Partial<LaundryServiceResp>): void {
    const isRedirect = data.isRedirect || false;

    delete data.isRedirect;
    
    if (!this.initialData) return;
    this.laundryService.update(this.initialData.id, data).subscribe({
      next: () => {
        if(isRedirect) {
          this.router.navigate(['/laundry']);
        }
      },
      error: () => {}
    });
  }

  onNoteCreated(log: LaundryServiceLog) {
    this.latestNote = log;
    this.notesDialogVisible = false;
  }

  onCancelNotes() {
    this.notesDialogVisible = false;
  }

  // Opcional: reacción al eliminar una nota
  onNoteDeleted(logId: number) {
    // por ejemplo, mostrar notificación o actualizar contador
  }
}
