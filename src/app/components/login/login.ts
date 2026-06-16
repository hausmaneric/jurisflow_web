import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { JurisflowDataService } from '../../services/jurisflow-data.service';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule],
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
          companyCode: (this.loginForm.value.companyCode ?? '').trim().toLowerCase(),
          email: (this.loginForm.value.email ?? '').trim().toLowerCase(),
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
      this.errorMessage = this.extractErrorMessage(error);
    }
  }

  private extractErrorMessage(error: unknown): string {
    const apiError = error as { error?: { message?: string; detail?: string }; message?: string };
    const message = apiError?.error?.message || apiError?.message || 'Falha ao autenticar com a API.';
    const detail = apiError?.error?.detail;

    if (String(detail ?? '').includes('relation "users" does not exist')) {
      return 'O banco da API ainda não foi preparado. Rode a migração/setup no Railway e tente novamente.';
    }

    return message;
  }
}
