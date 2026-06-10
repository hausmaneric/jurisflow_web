import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { JurisflowDataService } from '../../services/jurisflow-data.service';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TextBoxModule, ButtonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  loginForm;
  showPassword = false;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loginService: LoginService,
    private dataService: JurisflowDataService
  ) {
    this.loginForm = this.fb.group({
      companyCode: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    if (this.loginService.isAuthenticated()) {
      void this.router.navigate(['/plataforma/dashboard']);
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.loading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(
        this.loginService.tenantLogin({
          companyCode: this.loginForm.value.companyCode ?? '',
          email: this.loginForm.value.email ?? '',
          password: this.loginForm.value.password ?? ''
        })
      );

      if (!response?.status || !response?.data?.access_token) {
        throw new Error(response?.message || 'Nao foi possivel autenticar.');
      }

      this.loginService.saveLocalToken({
        token: response.data.access_token,
        refreshToken: response.data.refresh_token,
        accountCode: response.data.user.company_code ?? (this.loginForm.value.companyCode ?? ''),
        user: response.data.user
      });

      await this.dataService.loadRemoteContext(true);
      this.loading = false;
      await this.router.navigate(['/plataforma/dashboard']);
    } catch (error) {
      this.loading = false;
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao autenticar com a API.';
    }
  }
}
