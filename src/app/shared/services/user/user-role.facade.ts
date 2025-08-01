import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { UserService } from '@shared/services/user/user.service';
import { RolService } from '@shared/services/user/rol.service';
import { User, Role, ForcePasswordRequest } from '@shared/interfaces/user.interface';

@Injectable({
    providedIn: 'root'
})
export class UserRoleFacade {
    private userService = inject(UserService);
    private roleService = inject(RolService);

    private usersSubject = new BehaviorSubject<User[]>([]);
    private rolesSubject = new BehaviorSubject<Role[]>([]);
    private loadingSubject = new BehaviorSubject<boolean>(false);

    users$ = this.usersSubject.asObservable();
    roles$ = this.rolesSubject.asObservable();
    loading$ = this.loadingSubject.asObservable();

    loadAll(): void {
        this.loadingSubject.next(true);
        forkJoin({
            users: this.userService.getUsers(),
            roles: this.roleService.getRoles()
        }).subscribe({
            next: (result) => {
                this.usersSubject.next(result.users);
                this.rolesSubject.next(result.roles);
                this.loadingSubject.next(false);
            },
            error: () => {
                this.loadingSubject.next(false);
            }
        });
    }

    createUser(data: Partial<User>): void {
        this.loadingSubject.next(true);
        this.userService.createUser(data).subscribe({
            next: () => this.loadAll(),
            error: () => {
                this.loadingSubject.next(false);
            }
        });
    }

    updateUser(id: number, data: Partial<User>): void {
        this.loadingSubject.next(true);
        this.userService.updateUser(id, data).subscribe({
            next: () => this.loadAll(),
            error: () => {
                this.loadingSubject.next(false);
            }
        });
    }

    deleteUser(id: number): void {
        this.loadingSubject.next(true);
        this.userService.deleteUser(id).subscribe({
            next: () => this.loadAll(),
            error: () => {
                this.loadingSubject.next(false);
            }
        });
    }

    createRole(data: Partial<Role>): void {
        this.loadingSubject.next(true);
        this.roleService.createRole(data).subscribe({
            next: () => this.loadAll(),
            error: () => {
                this.loadingSubject.next(false);
            }
        });
    }

    updateRole(id: number, data: Partial<Role>): void {
        this.loadingSubject.next(true);
        this.roleService.updateRole(id, data).subscribe({
            next: () => this.loadAll(),
            error: () => {
                this.loadingSubject.next(false);
            }
        });
    }

    deleteRole(id: number): void {
        this.loadingSubject.next(true);
        this.roleService.deleteRole(id).subscribe({
            next: () => this.loadAll(),
            error: () => {
                this.loadingSubject.next(false);
            }
        });
    }

    forcep(id:number, value:ForcePasswordRequest):void {
        this.loadingSubject.next(true);
        this.userService.updatePasswordByAdmin(id, value).subscribe({
            next: () => this.loadAll(),
            error: () => {
                this.loadingSubject.next(false);
            }
        });
    }

}
