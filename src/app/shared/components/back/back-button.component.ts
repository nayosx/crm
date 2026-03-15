import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { NavigationHistoryService, NavigationRouteTarget } from '@shared/services/navigation/navigation-history.service';

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
  @Input() fallbackRoute?: NavigationRouteTarget;

  constructor(
    private router: Router,
    private location: Location,
    private navigationHistoryService: NavigationHistoryService
  ) {}

  goBack() {
    if (this.path) {
      this.router.navigate([this.path]);
      return;
    }

    const backTarget = this.navigationHistoryService.resolveBackTarget(this.fallbackRoute);

    if (Array.isArray(backTarget)) {
      this.router.navigate(backTarget);
      return;
    }

    if (typeof backTarget === 'string' && backTarget.length > 0) {
      this.router.navigateByUrl(backTarget);
      return;
    }

    this.location.back();
  }
}
