import { computed, Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { AppNavigationItem, NavigationService } from '@shared/services/navigation/navigation.service';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    MenuModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  encapsulation: ViewEncapsulation.None,
  providers: [ConfirmationService]
})
export class HomeComponent {
  private readonly navigationService = inject(NavigationService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private longPressTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private longPressTriggered = false;

  readonly shortcuts = this.navigationService.shortcuts;
  readonly hasAvailableShortcuts = computed(() => this.navigationService.availableShortcuts().length > 0);
  readonly availableShortcutMenuItems = computed<MenuItem[]>(() =>
    this.navigationService.availableShortcuts().map((item) => ({
      label: item.label,
      icon: item.icon,
      command: () => this.addShortcut(item.id)
    }))
  );
  readonly pendingDeleteShortcutId = signal<string | null>(null);

  shortcutDialogVisible = false;

  openShortcutDialog(): void {
    this.shortcutDialogVisible = true;
  }

  addShortcut(id: string): void {
    this.navigationService.addShortcut(id);
    this.shortcutDialogVisible = false;
  }

  showDeleteAction(shortcutId: string): boolean {
    return !this.isCompactViewport() || this.pendingDeleteShortcutId() === shortcutId;
  }

  confirmRemoveShortcut(shortcut: AppNavigationItem): void {
    this.confirmationService.confirm({
      header: 'Eliminar acceso directo',
      message: `¿Estas seguro de quitar "${shortcut.label}" de tus accesos directos? Luego lo puedes agregar nuevamente si asi lo quieres.`,
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true
      },
      acceptButtonProps: {
        label: 'Si, eliminar',
        severity: 'danger'
      },
      accept: () => {
        this.navigationService.removeShortcut(shortcut.id);
        this.pendingDeleteShortcutId.set(null);
      },
      reject: () => {
        this.hideDeleteAction(shortcut.id);
      }
    });
  }

  navigateFromCard(shortcut: AppNavigationItem): void {
    if (this.longPressTriggered) {
      this.longPressTriggered = false;
      return;
    }

    if (!this.isCompactViewport() || !shortcut.routerLink) {
      return;
    }

    this.router.navigate(shortcut.routerLink);
  }

  startLongPress(shortcutId: string): void {
    if (!this.isCompactViewport()) {
      return;
    }

    this.clearLongPress();
    this.longPressTimeoutId = setTimeout(() => {
      this.longPressTriggered = true;
      this.pendingDeleteShortcutId.set(shortcutId);
    }, 650);
  }

  cancelLongPress(): void {
    this.clearLongPress();
  }

  hideDeleteAction(shortcutId: string): void {
    if (this.pendingDeleteShortcutId() === shortcutId) {
      this.pendingDeleteShortcutId.set(null);
    }
  }

  private clearLongPress(): void {
    if (this.longPressTimeoutId) {
      clearTimeout(this.longPressTimeoutId);
      this.longPressTimeoutId = null;
    }
  }

  private isCompactViewport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 1023px)').matches;
  }
}
