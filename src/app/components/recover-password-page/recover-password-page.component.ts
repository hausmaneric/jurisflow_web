import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-recover-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule, TextBoxModule],
  templateUrl: './recover-password-page.component.html',
  styleUrl: './recover-password-page.component.scss'
})
export class RecoverPasswordPageComponent {
  private readonly fb = new FormBuilder();

  loading = false;
  errorMessage = '';
  successMessage = '';
  generatedToken = '';

  readonly form = this.fb.group({
    companyCode: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]]
  });

  constructor(
    private readonly loginService: LoginService,
    private readonly router: Router
  ) {}

  async submit(): Promise<void> {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.generatedToken = '';

    try {
      const response = await firstValueFrom(
        this.loginService.requestPasswordReset({
          companyCode: this.form.value.companyCode ?? '',
          email: this.form.value.email ?? ''
        })
      );

      if (!response?.status || !response?.data?.reset_token) {
        throw new Error(response?.message || 'Nao foi possivel iniciar a recuperacao de senha.');
      }

      this.generatedToken = response.data.reset_token;
      this.successMessage = 'Solicitacao registrada com sucesso. Voce ja pode definir uma nova senha.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao iniciar a recuperacao de senha.';
    } finally {
      this.loading = false;
    }
  }

  continueToReset(): void {
    if (!this.generatedToken) {
      return;
    }

    void this.router.navigate(['/redefinir-senha'], {
      queryParams: {
        token: this.generatedToken,
        company: this.form.value.companyCode ?? '',
        email: this.form.value.email ?? ''
      }
    });
  }
}
