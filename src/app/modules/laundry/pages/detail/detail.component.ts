import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LaundryServiceDetail, LaundryServiceStatus } from '@shared/interfaces/laundry-service.interface';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { LaundryStatusColorMap } from '@shared/utils/color.util';
import { BackButtonComponent } from "@shared/components/back/back-button.component";
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LaundryDetailComponent } from '@modules/laundry/components/laundry-detail/laundry-detail.component';
import { ToBackLaundry } from '@modules/laundry/commons/route';


@Component({
  selector: 'app-laundry-detail-page',
  imports: [
    CommonModule,
    CardModule,
    TagModule,
    ButtonModule,
    BackButtonComponent,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    LaundryDetailComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './detail.component.html',
  encapsulation: ViewEncapsulation.None
})
export class DetailComponent implements OnInit {
  data?: LaundryServiceDetail;
  loading = true;
  statusColorMap = LaundryStatusColorMap;
  addressDialogVisible: boolean = false;
  status:LaundryServiceStatus|null = null;

  pathToBack:string = 'laundry';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.status = this.route.snapshot.queryParamMap.get('status') as LaundryServiceStatus;

    this.pathToBack = ToBackLaundry(this.status);

    if(!this.status) {
      this.router.navigate([this.pathToBack]);
    }
  }


}