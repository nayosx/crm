import { Component, inject, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@shared/services/auth/auth.service';
import { ButtonModule } from 'primeng/button';
import { PanelMenuModule } from 'primeng/panelmenu';
import { SidebarModule } from 'primeng/sidebar';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    ButtonModule,
    PanelMenuModule,
    SidebarModule
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
      routerLink: ['/home']
    },
    {
      label: 'Clientes',
      icon: 'pi pi-users',
      routerLink: ['/clients']
    },
    {
      label: 'Transacciones',
      icon: 'pi pi-dollar',
      routerLink: ['/transactions']
    },
    {
      label: 'Usuarios',
      icon: 'pi pi-users',
      routerLink: ['/users']
    },
    {
      label: 'Configuración',
      icon: 'pi pi-cog',
      routerLink: ['/settings']
    }
  ];

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  logout() {
    this.authService.simpleLogout();
  }
}
