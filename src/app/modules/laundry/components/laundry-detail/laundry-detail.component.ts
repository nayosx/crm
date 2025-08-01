import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LaundryService } from '@shared/services/laundry/laundry.service';
import { LaundryServiceDetail, LaundryServiceLog, LaundryServiceStatus } from '@shared/interfaces/laundry-service.interface';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { formatDate } from '@angular/common';
import { ClientDetailComponent } from "@modules/client/components/client-detail/client-detail.component";
import { ClientFullResponse } from '@shared/interfaces/client.interface';
import { LaundryStatusColorMap } from '@shared/utils/color.util';
import { BackButtonComponent } from "@shared/components/back/back-button.component";
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { LaundryNoteListComponent } from '../laundry-note-list/laundry-note-list.component';
import { LaundryNoteComponent } from '../laundry-note/laundry-note.component';
import { ToBackLaundry } from '@modules/laundry/commons/route';

@Component({
  selector: 'app-laundry-detail',
    imports: [
    CommonModule,
    CardModule,
    TagModule,
    ButtonModule,
    ClientDetailComponent,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    LaundryNoteListComponent,
    LaundryNoteComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './laundry-detail.component.html',
  encapsulation: ViewEncapsulation.None
})
export class LaundryDetailComponent implements OnInit {

  @Input() status!:LaundryServiceStatus;
  
  data?: LaundryServiceDetail;
  
  loading = true;
  statusColorMap = LaundryStatusColorMap;
  addressDialogVisible: boolean = false;
  notesDialogVisible = false;
  latestNote: LaundryServiceLog | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private laundryService: LaundryService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;

    this.laundryService.getDetail({ client_id: undefined, status: this.status }).subscribe({
      next: (res) => {
        const found = res.items.find(item => item.id === id);
        this.data = found;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  formatDateTime(datetime: string): string {
    return formatDate(datetime, 'medium', 'en-US');
  }

  getFullClient(client: any, address: any): ClientFullResponse {
    return {
      id: client.id,
      addresses: [address],
      phones: client.phones,
      email: '',
      created_at: '',
      created_by: '',
      document_id: '',
      name: client.name,
      updated_at: '',
      is_deleted: false,
      updated_by: ''
    }
  }


  confirm(event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Estas seguro de completar el pedido?',
      header: 'Confirmación',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Guardar',
      },
      accept: () => {
        this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'You have accepted' });
        this.changeStatus();
      },
      reject: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Rejected',
          detail: 'You have rejected',
          life: 3000,
        });
      },
    });
  }


  nextStatus:LaundryServiceStatus | null = null;

  getNextStatus():void {
    switch(this.status){
      case 'PENDING':
        this.nextStatus = 'STARTED';
        break;
      case 'STARTED': 
        this.nextStatus = 'IN_PROGRESS';
        break;
      case 'IN_PROGRESS':
        this.nextStatus = 'READY_FOR_DELIVERY';
        break;
      case 'READY_FOR_DELIVERY':
        this.nextStatus = 'DELIVERED';
        break;
    }
  }

  pathToBack:string = '';

  changeStatus():void {
    this.getNextStatus();

    this.pathToBack = ToBackLaundry(this.status);

    if(this.nextStatus) {
      if(this.data){
        this.laundryService.updateStatus(this.data?.id, this.nextStatus).subscribe({
          next: response => {
            this.router.navigate([this.pathToBack]);
          },
          error: (httpErr:HttpErrorResponse) => {}
        });
      }
    }
  }

  onNoteCreated(log: LaundryServiceLog) {
    this.latestNote = log;
    this.notesDialogVisible = false;
  }

  onCancelNotes() {
    this.notesDialogVisible = false;
  }

  onNoteDeleted(logId: number) {
    // por ejemplo, mostrar notificación o actualizar contador
  }


}