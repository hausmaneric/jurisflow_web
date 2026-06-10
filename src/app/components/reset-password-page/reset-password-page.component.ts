import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule, TextBoxModule],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss'
})
export class ResetPasswordPageComponent {
  private readonly fb = new FormBuilder();

  loading = false;
  successMessage = '';
  errorMessage = '';
  token = '';
  companyCode = '';
  email = '';

  readonly form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly loginService: LoginService
  ) {
    this.route.queryParamMap.subscribe((params) => {
      this.token = params.get('token') ?? '';
      this.companyCode = params.get('company') ?? '';
      this.email = params.get('email') ?? '';
    });
  }

  get tokenAvailable(): boolean {
    return this.token.trim().length > 0;
  }

  async submit(): Promise<void> {
    if (!this.tokenAvailable) {
      this.errorMessage = 'Token de redefinicao nao encontrado. Gere uma nova recuperacao.';
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    if ((this.form.value.newPassword ?? '') !== (this.form.value.confirmPassword ?? '')) {
      this.errorMessage = 'A confirmacao de senha precisa ser igual a nova senha.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const response = await firstValueFrom(
        this.loginService.resetPassword({
          resetToken: this.token,
          newPassword: this.form.value.newPassword ?? ''
        })
      );

      if (!response?.status) {
        throw new Error(response?.message || 'Nao foi possivel redefinir a senha.');
      }

      this.successMessage = 'Senha redefinida com sucesso. Voce ja pode voltar ao login.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao redefinir a senha.';
    } finally {
      this.loading = false;
    }
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
