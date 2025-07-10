import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { ClientFormComponent } from "../client-form/client-form.component";
import { ClientFacade } from '@shared/services/client.facade';
import { Client } from '@shared/interfaces/client.interface';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { BackButtonComponent } from '@shared/components/back/back-button.component';
import { timer } from 'rxjs';

@Component({
  selector: 'app-client-add',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    DialogModule,
    ClientFormComponent,
    CardModule,
    BackButtonComponent
  ],
  templateUrl: './client-add.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ClientAddComponent {
  loading = false;
  successDialogVisible = false;

  constructor(
    private clientFacade: ClientFacade,
    private router: Router
  ) {}

  onSubmit(data: Partial<Client>) {
    this.loading = true;
    data.email = 'none@mail.com';
    data.document_id = '00000000-0';

    this.clientFacade.createClient(data).subscribe({
      next: (client) => {
        this.loading = false;
        this.successDialogVisible = true;

        timer(2000).subscribe(() => {
          this.successDialogVisible = false;
          this.router.navigate(['/clients', client.id, 'edit']);
        });
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }
}
