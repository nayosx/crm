import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

export type BottomNavigationAction = {
  id: string;
  label: string;
  icon: string;
  severity?: 'success' | 'info' | 'warn' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast';
  disabled?: boolean;
  loading?: boolean;
  mobileMode?: 'primary' | 'more' | 'hidden';
  mobileIconOnly?: boolean;
  desktopHidden?: boolean;
};

@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule],
  templateUrl: './bottom-navigation.component.html',
  styleUrl: './bottom-navigation.component.scss'
})
export class BottomNavigationComponent {
  @Input() actions: BottomNavigationAction[] = [];
  @Input() moreLabel = 'Más opciones';
  @Input() moreIcon = 'pi pi-ellipsis-h';
  @Input() dialogHeader = 'Más opciones';
  @Input() mobileUseOverflow = true;

  @Output() actionSelected = new EventEmitter<string>();

  showMoreDialog = false;

  desktopActions(): BottomNavigationAction[] {
    return this.actions.filter((action) => !action.desktopHidden);
  }

  mobilePrimaryActions(): BottomNavigationAction[] {
    return this.actions.filter((action) => action.mobileMode === 'primary');
  }

  mobileDirectActions(): BottomNavigationAction[] {
    return this.actions.filter((action) => action.mobileMode !== 'hidden');
  }

  mobileOverflowActions(): BottomNavigationAction[] {
    return this.actions.filter((action) => action.mobileMode === 'more');
  }

  hasMobileOverflowActions(): boolean {
    return this.mobileOverflowActions().length > 0;
  }

  handleAction(actionId: string, closeDialog = false): void {
    if (closeDialog) {
      this.showMoreDialog = false;
    }

    this.actionSelected.emit(actionId);
  }
}
