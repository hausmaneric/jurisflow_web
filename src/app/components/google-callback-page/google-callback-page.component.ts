import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { JurisflowDataService } from '../../services/jurisflow-data.service';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-google-callback-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './google-callback-page.component.html',
  styleUrl: './google-callback-page.component.scss'
})
export class GoogleCallbackPageComponent implements OnInit {
  loading = true;
  message = 'Finalizando login com Google...';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private dataService: JurisflowDataService
  ) {}

  async ngOnInit(): Promise<void> {
    const queryParams = this.route.snapshot.queryParamMap;
    const fragmentParams = new URLSearchParams(this.route.snapshot.fragment ?? '');
    const value = (key: string): string | null => fragmentParams.get(key) ?? queryParams.get(key);
    const error = value('error');
    const accessToken = value('access_token');
    const refreshToken = value('refresh_token');
    const companyCode = value('company_code') ?? '';

    if (error) {
      this.fail(value('message') || 'Não foi possível entrar com Google.');
      return;
    }

    if (!accessToken || !refreshToken || !companyCode) {
      this.fail('Retorno do Google incompleto. Tente novamente.');
      return;
    }

    try {
      const me = await firstValueFrom(this.loginService.me(accessToken));
      const user = me?.data ?? {
        id: me?.data?.id ?? '',
        name: value('name') ?? '',
        email: value('email') ?? '',
        company_code: companyCode
      };

      this.loginService.saveLocalToken({
        token: accessToken,
        refreshToken,
        accountCode: companyCode,
        user
      });

      await this.dataService.loadRemoteContext(true);
      await this.router.navigate(['/plataforma/dashboard'], { replaceUrl: true });
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Sessão Google recebida, mas não foi possível carregar o usuário.');
    }
  }

  private fail(message: string): void {
    this.loading = false;
    this.message = 'Login com Google não concluído';
    this.errorMessage = message;
    this.loginService.clearToken();
  }
}
