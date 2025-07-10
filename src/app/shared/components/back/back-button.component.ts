import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <button
      pButton
      type="button"
      [label]="label"
      icon="pi pi-arrow-left"
      class="p-button-text pr-2"
      (click)="goBack()"
    ></button>
  `
})
export class BackButtonComponent {
  @Input() label: string = '';
  @Input() path?: string;

  constructor(
    private router: Router,
    private location: Location
  ) {}

  goBack() {
    if (this.path) {
      this.router.navigate([this.path]);
    } else {
      this.location.back();
    }
  }
}
