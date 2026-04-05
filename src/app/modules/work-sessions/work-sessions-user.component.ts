import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { DatePickerModule } from 'primeng/datepicker';
import { WorkSessionsBaseComponent } from './work-sessions-base.component';

@Component({
  selector: 'app-work-sessions-user',
  imports: [
    CommonModule,
    FormsModule,
    FullCalendarModule,
    BackButtonComponent,
    LoaderDialogComponent,
    ButtonModule,
    CardModule,
    ChipModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule,
    DividerModule,
    MessageModule,
    SkeletonModule,
    TableModule,
    TabViewModule,
    TagModule,
    ToastModule,
    ToolbarModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './work-sessions-user.component.html',
  styleUrl: './work-sessions.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class WorkSessionsUserComponent extends WorkSessionsBaseComponent implements OnInit, OnDestroy {
  @ViewChild(LoaderDialogComponent) loader?: LoaderDialogComponent;

  constructor() {
    super();

    effect(() => {
      const isMutating = this.currentSessionMutating();
      const text = this.sessionMutationText();

      queueMicrotask(() => {
        if (isMutating) {
          this.loader?.open(text);
          return;
        }

        this.loader?.close();
      });
    });
  }

  ngOnInit(): void {
    this.scopedUserId.set(this.currentUser()?.id ?? null);
    this.initBase({ history: true, calendar: true });
  }

  ngOnDestroy(): void {
    this.destroyBase();
  }
}
