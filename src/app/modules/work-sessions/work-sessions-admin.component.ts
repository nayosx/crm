import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { WorkSessionsBaseComponent } from './work-sessions-base.component';

@Component({
  selector: 'app-work-sessions-admin',
  imports: [
    CommonModule,
    FormsModule,
    BackButtonComponent,
    ButtonModule,
    CardModule,
    ChipModule,
    ConfirmDialogModule,
    DatePickerModule,
    DividerModule,
    DropdownModule,
    TextareaModule,
    MessageModule,
    SkeletonModule,
    TableModule,
    TabViewModule,
    TagModule,
    ToastModule,
    ToolbarModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './work-sessions-admin.component.html',
  styleUrl: './work-sessions.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class WorkSessionsAdminComponent extends WorkSessionsBaseComponent implements OnInit, OnDestroy {
  ngOnInit(): void {
    this.initBase({ users: true, history: true, report: true });
  }

  ngOnDestroy(): void {
    this.destroyBase();
  }
}
