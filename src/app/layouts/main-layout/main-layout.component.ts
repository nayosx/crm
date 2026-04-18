import { Component, inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '@shared/services/auth/auth.service';
import { ButtonModule } from 'primeng/button';
import { PanelMenuModule } from 'primeng/panelmenu';
import { DrawerModule } from 'primeng/drawer';
import { MenuItem } from 'primeng/api';
import { User } from '@shared/interfaces/user.interface';
import { KEYSTORE } from '@core/keystore';
import { NavigationService } from '@shared/services/navigation/navigation.service';
import { NavigationHistoryService } from '@shared/services/navigation/navigation-history.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    ButtonModule,
    PanelMenuModule,
    DrawerModule

  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class MainLayoutComponent implements OnInit, OnDestroy {

  authService = inject(AuthService);
  navigationService = inject(NavigationService);
  navigationHistoryService = inject(NavigationHistoryService);
  router = inject(Router);

  private readonly subscriptions = new Subscription();

  menuItems: MenuItem[] = [];
  sidebarVisible = false;
  hideDesktopSidebar = false;

  ngOnInit(): void {
    this.getUser();
    this.subscriptions.add(
      this.navigationService.ensureNavigationLoaded().subscribe({
        next: () => {
          this.refreshMenuItems();
        },
        error: (error) => {
          console.error('Error loading navigation', error);
        }
      })
    );
    this.refreshMenuItems();
    this.updateSidebarVisibility(this.router.url);

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => {
          this.updateSidebarVisibility(event.urlAfterRedirects);
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }


  toggleSidebar() {
    console.log('Toggling sidebar visibility');
    this.sidebarVisible = !this.sidebarVisible;
  }

  closeSidebar(): void {
    this.sidebarVisible = false;
  }

  logout() {
    this.authService.simpleLogout();
  }

  user:User|null = null;

  getUser():void {
    const data = sessionStorage.getItem(KEYSTORE.user);
    if(data) {
      this.user = JSON.parse(data);
    }
  }

  private updateSidebarVisibility(url: string): void {
    this.hideDesktopSidebar = url.startsWith('/laundry/socket-queues');
  }

  private refreshMenuItems(): void {
    this.menuItems = this.navigationService.getMainMenuItems(() => this.closeSidebar());
  }
}
