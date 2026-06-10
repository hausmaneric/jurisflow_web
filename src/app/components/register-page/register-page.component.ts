import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { TextBoxModule, UploaderModule } from '@syncfusion/ej2-angular-inputs';
import { JurisflowDataService } from '../../services/jurisflow-data.service';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule, TextBoxModule, DropDownListModule, UploaderModule],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss'
})
export class RegisterPageComponent {
  step = 1;
  accountForm;
  officeForm;
  loading = false;
  errorMessage = '';

  readonly states = ['SP', 'RJ', 'MG', 'PR', 'SC', 'BA', 'DF'];

  readonly plans = [
    { name: 'Starter', price: 'R$ 79,90 /mes', highlights: ['Ate 2 usuarios', 'Clientes ilimitados', 'Agenda e atendimentos', 'Documentos e procuracoes'] },
    { name: 'Pro', price: 'R$ 149,90 /mes', highlights: ['Usuarios ilimitados', 'Clientes ilimitados', 'Processos e agenda', 'Relatorios avancados'] },
    { name: 'Enterprise', price: 'R$ 299,90 /mes', highlights: ['Tudo do plano Pro', 'Automacao e integracoes', 'WhatsApp Business', 'API e webhooks'], selected: true }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loginService: LoginService,
    private dataService: JurisflowDataService
  ) {
    this.accountForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    });

    this.officeForm = this.fb.group({
      officeName: ['', Validators.required],
      cnpj: ['', Validators.required],
      oab: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: [''],
      number: [''],
      complement: [''],
      city: [''],
      state: ['SP'],
      cep: ['']
    });
  }

  next(): void {
    this.errorMessage = '';
    if (this.step === 1 && !this.validateAccount()) {
      return;
    }
    if (this.step === 2 && this.officeForm.invalid) {
      this.officeForm.markAllAsTouched();
      this.errorMessage = 'Preencha os dados obrigatorios do escritorio.';
      return;
    }

    this.step = Math.min(3, this.step + 1);
  }

  previous(): void {
    this.step = Math.max(1, this.step - 1);
  }

  cancel(): void {
    void this.router.navigate(['/login']);
  }

  async finish(): Promise<void> {
    if (!this.validateAccount() || this.officeForm.invalid || this.loading) {
      this.officeForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const companyCode = this.slugify(this.officeForm.value.officeName ?? '');
    const password = this.accountForm.value.password ?? '';

    try {
      const signup = await firstValueFrom(
        this.loginService.publicSignup({
          company_code: companyCode,
          company_name: this.officeForm.value.officeName ?? '',
          company_document: this.onlyDigits(this.officeForm.value.cnpj ?? ''),
          company_email: this.officeForm.value.email ?? '',
          company_phone: this.onlyDigits(this.officeForm.value.phone ?? ''),
          billing_email: this.officeForm.value.email ?? '',
          admin_name: this.accountForm.value.name ?? '',
          admin_email: this.accountForm.value.email ?? '',
          admin_phone: this.onlyDigits(this.accountForm.value.phone ?? ''),
          admin_password: password,
          timezone: 'America/Sao_Paulo',
          locale: 'pt-BR'
        })
      );

      if (!signup?.status || !signup?.data?.company_code) {
        throw new Error(signup?.message || 'Nao foi possivel criar a conta.');
      }

      const login = await firstValueFrom(
        this.loginService.tenantLogin({
          companyCode: signup.data.company_code,
          email: signup.data.admin_email || (this.accountForm.value.email ?? ''),
          password
        })
      );

      if (!login?.status || !login?.data?.access_token) {
        throw new Error(login?.message || 'Conta criada, mas nao foi possivel entrar automaticamente.');
      }

      this.loginService.saveLocalToken({
        token: login.data.access_token,
        refreshToken: login.data.refresh_token,
        accountCode: login.data.user.company_code ?? signup.data.company_code,
        user: login.data.user
      });

      await this.dataService.loadRemoteContext(true);
      await this.router.navigate(['/plataforma/dashboard']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao finalizar cadastro.';
    } finally {
      this.loading = false;
    }
  }

  private validateAccount(): boolean {
    this.accountForm.markAllAsTouched();
    const password = this.accountForm.value.password ?? '';
    const confirmPassword = this.accountForm.value.confirmPassword ?? '';
    if (this.accountForm.invalid) {
      this.errorMessage = 'Preencha os dados obrigatorios da conta.';
      return false;
    }
    if (password !== confirmPassword) {
      this.errorMessage = 'As senhas informadas nao conferem.';
      return false;
    }
    if (!/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      this.errorMessage = 'A senha precisa ter letra maiuscula, numero e caractere especial.';
      return false;
    }
    return true;
  }

  private slugify(value: string): string {
    const slug = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return slug || `jurisflow-${Date.now()}`;
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }
}
