import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { AuthFacade } from '@shared/services/auth/auth.facade';
import { ROUTE_PATH } from '@core/routes-path';
import { Router } from '@angular/router';
import { KEYSTORE } from '@core/keystore';


@Component({
  selector: 'app-auth',
  imports: [
    ButtonModule,
    FormsModule,
    LoaderDialogComponent,
    InputTextModule,
],
  templateUrl: './auth.component.html',
  encapsulation: ViewEncapsulation.None
})
export class AuthComponent implements OnInit {
  email = '';
  password = '';

  @ViewChild('loaderDialog') loaderDialog!: LoaderDialogComponent;

  constructor(private authFacade: AuthFacade, private router: Router) {}
  
  ngOnInit(): void {
    const tempUser = localStorage.getItem(KEYSTORE.tempUser);
    if (tempUser) {
      const { email } = JSON.parse(tempUser);
      this.email = email;
    }
  }

  submitLogin(form: NgForm) {
    if (form.invalid) {
      return;
    }

    this.loaderDialog.open('Iniciando sesión...');

    this.authFacade.login(this.email, this.password).subscribe({
      next: () => {
        localStorage.setItem(KEYSTORE.tempUser, JSON.stringify({ email: this.email }));
        this.loaderDialog.close();
        this.router.navigate([ROUTE_PATH.HOME]);
      },
      error: (err) => {
        console.error('Error al iniciar sesión', err);
        this.loaderDialog.close();
      }
    });
  }
}