import { Component, inject, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@shared/services/auth/auth.service';
import { ButtonModule } from 'primeng/button';
import { PanelMenuModule } from 'primeng/panelmenu';
import { DrawerModule } from 'primeng/drawer';
import { MenuItem } from 'primeng/api';

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
export class MainLayoutComponent {
  authService = inject(AuthService);

  sidebarVisible = false;

  menuItems: MenuItem[] = [
    {
      label: 'Inicio',
      icon: 'pi pi-home',
      routerLink: ['/home'],
      command: () => this.sidebarVisible = false
    },
    {
      label: 'Clientes',
      icon: 'pi pi-users',
      routerLink: ['/clients'],
      command: () => this.sidebarVisible = false
    },
    {
      label: 'Transacciones',
      icon: 'pi pi-dollar',
      routerLink: ['/transactions'],
      command: () => this.sidebarVisible = false
    },
    {
      label: 'Usuarios',
      icon: 'pi pi-users',
      routerLink: ['/users'],
      command: () => this.sidebarVisible = false
    },
    {
      label: 'Lavandería',
      icon: '',
      items: [
        {
          label: 'Servicios',
          icon: 'pi pi-home',
          routerLink: ['/laundry'],
          command: () => this.sidebarVisible = false
        },
        {
          label: 'Scheduler',
          icon: 'pi pi-calendar',
          routerLink: ['/laundry/scheduler'],
          command: () => this.sidebarVisible = false
        },
        {
          label: 'Work in Progress',
          icon: 'pi pi-briefcase',
          routerLink: ['/laundry/work-in-progress'],
          command: () => this.sidebarVisible = false
        },
        {
          label: 'Delivery',
          icon: 'pi pi-truck',
          routerLink: ['/laundry/delivery'],
          command: () => this.sidebarVisible = false
        },
        
      ]
    }
  ];


  toggleSidebar() {
    console.log('Toggling sidebar visibility');
    this.sidebarVisible = !this.sidebarVisible;
  }

  logout() {
    this.authService.simpleLogout();
  }
}
