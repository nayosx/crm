import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ClientListComponent } from '@shared/components/client-list/client-list.component';

@Component({
  selector: 'app-client-page',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ClientListComponent
  ],
  templateUrl: './client-page.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ClientPageComponent {

  constructor(private router: Router) {}

  onCreate() {
    this.router.navigate(['/clients/create']);
  }

  onEdit(id: number) {
    this.router.navigate(['/clients', id, 'edit']);
  }

}
