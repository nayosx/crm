import { computed, Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { NavigationMenuItem } from '@shared/interfaces/menu.interface';
import { NavigationService } from '@shared/services/navigation/navigation.service';

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
export class HomeComponent implements OnInit {
  private readonly navigationService = inject(NavigationService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private longPressTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private longPressTriggered = false;
  private draggedShortcutId: string | null = null;

  readonly shortcuts = this.navigationService.shortcuts;
  readonly hasAvailableShortcuts = computed(() => this.navigationService.availableShortcuts().length > 0);
  readonly availableShortcutMenuItems = computed<MenuItem[]>(() =>
    this.toShortcutTreeMenuItems(this.navigationService.getAvailableShortcutTree())
  );
  readonly pendingDeleteShortcutId = signal<string | null>(null);

  loadingNavigation = false;
  navigationError = '';
  shortcutActionError = '';
  shortcutActionInProgress = false;
  shortcutDialogVisible = false;
  dragOverShortcutId: string | null = null;
  isDraggingShortcut = false;

  ngOnInit(): void {
    this.loadingNavigation = true;
    this.navigationError = '';

    forkJoin([
      this.navigationService.ensureNavigationLoaded(),
      this.navigationService.ensureShortcutsLoaded()
    ])
      .pipe(finalize(() => this.loadingNavigation = false))
      .subscribe({
        error: () => {
          this.navigationError = 'No se pudieron cargar los menus o accesos directos.';
        }
      });
  }

  openShortcutDialog(): void {
    if (this.shortcutActionInProgress) {
      return;
    }

    this.shortcutDialogVisible = true;
  }

  addShortcut(key: string): void {
    if (this.shortcutActionInProgress) {
      return;
    }

    this.shortcutActionInProgress = true;
    this.shortcutActionError = '';

    this.navigationService.addShortcut(key)
      .pipe(finalize(() => this.shortcutActionInProgress = false))
      .subscribe({
        next: () => {
          this.shortcutDialogVisible = false;
        },
        error: () => {
          this.shortcutActionError = 'No se pudo agregar el acceso directo.';
        }
      });
  }

  canDragShortcuts(): boolean {
    return !this.isCompactViewport() && !this.shortcutActionInProgress;
  }

  showDeleteAction(shortcutId: string): boolean {
    return !this.isCompactViewport() || this.pendingDeleteShortcutId() === shortcutId;
  }

  confirmRemoveShortcut(shortcut: NavigationMenuItem): void {
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
        this.shortcutActionInProgress = true;
        this.shortcutActionError = '';

        this.navigationService.removeShortcut(shortcut.key)
          .pipe(finalize(() => this.shortcutActionInProgress = false))
          .subscribe({
            next: () => {
              this.pendingDeleteShortcutId.set(null);
            },
            error: () => {
              this.shortcutActionError = 'No se pudo eliminar el acceso directo.';
            }
          });
      },
      reject: () => {
        this.hideDeleteAction(shortcut.key);
      }
    });
  }

  navigateFromCard(shortcut: NavigationMenuItem): void {
    if (this.longPressTriggered || this.isDraggingShortcut) {
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

  startDrag(event: DragEvent, shortcutId: string): void {
    if (!this.canDragShortcuts()) {
      return;
    }

    this.draggedShortcutId = shortcutId;
    this.isDraggingShortcut = true;
    this.pendingDeleteShortcutId.set(null);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', shortcutId);
    }
  }

  allowDrop(event: DragEvent, shortcutId: string): void {
    if (!this.isDraggingShortcut || this.draggedShortcutId === shortcutId) {
      return;
    }

    event.preventDefault();
    this.dragOverShortcutId = shortcutId;

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  dropShortcut(event: DragEvent, targetShortcutId: string): void {
    if (!this.draggedShortcutId || this.draggedShortcutId === targetShortcutId) {
      this.clearDragState();
      return;
    }

    event.preventDefault();

    const shortcutIds = this.shortcuts().map((shortcut) => shortcut.key);
    const fromIndex = shortcutIds.indexOf(this.draggedShortcutId);
    const toIndex = shortcutIds.indexOf(targetShortcutId);

    this.shortcutActionInProgress = true;
    this.shortcutActionError = '';

    this.navigationService.reorderShortcuts(fromIndex, toIndex)
      .pipe(finalize(() => this.shortcutActionInProgress = false))
      .subscribe({
        next: () => {
          this.clearDragState();
        },
        error: () => {
          this.shortcutActionError = 'No se pudo reordenar los accesos directos.';
          this.clearDragState();
        }
      });
  }

  endDrag(): void {
    setTimeout(() => {
      this.clearDragState();
    });
  }

  private clearLongPress(): void {
    if (this.longPressTimeoutId) {
      clearTimeout(this.longPressTimeoutId);
      this.longPressTimeoutId = null;
    }
  }

  private clearDragState(): void {
    this.draggedShortcutId = null;
    this.dragOverShortcutId = null;
    this.isDraggingShortcut = false;
  }

  private toShortcutTreeMenuItems(items: NavigationMenuItem[]): MenuItem[] {
    return items.map((item) => ({
      label: item.label,
      icon: item.icon ?? undefined,
      command: item.routerLink ? () => this.addShortcut(item.key) : undefined,
      items: item.items?.length ? this.toShortcutTreeMenuItems(item.items) : undefined
    }));
  }

  private isCompactViewport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 1023px)').matches;
  }
}
