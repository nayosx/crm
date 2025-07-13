import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserRoleFacade } from '@shared/services/user/user-role.facade';
import { User, Role } from '@shared/interfaces/user.interface';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { UserFormComponent } from './components/user-form/user-form.component';
import { RolFormComponent } from './components/rol-form/rol-form.component';

@Component({
  selector: 'app-users',
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    DialogModule,
    UserFormComponent,
    RolFormComponent
  ],
  templateUrl: './users.component.html'
})
export class UsersComponent {
  private facade = inject(UserRoleFacade);

  users$ = this.facade.users$;
  roles$ = this.facade.roles$;
  loading$ = this.facade.loading$;

  displayUserDialog = false;
  displayRoleDialog = false;

  selectedUser: User | null = null;
  selectedRole: Role | null = null;

  constructor() {
    this.facade.loadAll();
    this.facade.roles$.subscribe(roles => this.rolesSubjectCache = roles ?? []);
  }

  openCreateUser(): void {
    this.selectedUser = null;
    this.displayUserDialog = true;
  }

  openEditUser(user: User): void {
    this.selectedUser = user;
    this.displayUserDialog = true;
  }

  saveUser(data: Partial<User>): void {
    if (this.selectedUser) {
      this.facade.updateUser(this.selectedUser.id, data);
    } else {
      this.facade.createUser(data);
    }
    this.displayUserDialog = false;
  }

  deleteUser(user: User): void {
    this.facade.deleteUser(user.id);
  }

  openCreateRole(): void {
    this.selectedRole = null;
    this.displayRoleDialog = true;
  }

  openEditRole(role: Role): void {
    this.selectedRole = role;
    this.displayRoleDialog = true;
  }

  saveRole(data: Partial<Role>): void {
    if (this.selectedRole) {
      this.facade.updateRole(this.selectedRole.id, data);
    } else {
      this.facade.createRole(data);
    }
    this.displayRoleDialog = false;
  }

  rolesSubjectCache: Role[] = [];

  getRoleName(roleId: number): string {
    const roles = this.rolesSubjectCache;
    return roles.find(r => r.id === roleId)?.name ?? '';
  }
}
