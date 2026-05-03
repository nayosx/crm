import { Component, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/user/user.service';

@Component({
  selector: 'app-user-list',
  imports: [],
  templateUrl: './user-list.component.html',
  encapsulation: ViewEncapsulation.None
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  userServ = inject(UserService);


  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.userServ.getUserslite().subscribe({
      next: (users: User[]) => {
        this.users = users;
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

}
