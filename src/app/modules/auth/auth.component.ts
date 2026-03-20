import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { LoaderDialogComponent } from '@shared/components/loader-dialog/loader-dialog.component';
import { AuthFacade } from '@shared/services/auth/auth.facade';
import { ROUTE_PATH } from '@core/routes-path';
import { Router } from '@angular/router';
import { KEYSTORE } from '@core/keystore';
import { environment } from '@env/environment';


@Component({
  selector: 'app-auth',
  imports: [
    ButtonModule,
    CheckboxModule,
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
  rememberUser = false;

  @ViewChild('loaderDialog') loaderDialog!: LoaderDialogComponent;

  constructor(private authFacade: AuthFacade, private router: Router) {}
  
  ngOnInit(): void {
    const tempUser = localStorage.getItem(KEYSTORE.tempUser);
    if (tempUser) {
      try {
        const { email } = JSON.parse(tempUser);
        this.email = email ?? '';
        this.rememberUser = !!email;
      } catch {
        localStorage.removeItem(KEYSTORE.tempUser);
      }
    }
  }

  submitLogin(form: NgForm) {
    if (form.invalid) {
      return;
    }

    this.loaderDialog.open('Iniciando sesión...');

    this.authFacade.login(this.email, this.password).subscribe({
      next: () => {
        if (this.rememberUser) {
          localStorage.setItem(KEYSTORE.tempUser, JSON.stringify({ email: this.email }));
        } else {
          localStorage.removeItem(KEYSTORE.tempUser);
        }
        this.loaderDialog.close();
        this.router.navigate([ROUTE_PATH.HOME]);
      },
      error: (err) => {
        console.error('Error al iniciar sesión', err);
        this.loaderDialog.close();
      }
    });
  }

  getVersion():string {
    return environment.version
  }


}
