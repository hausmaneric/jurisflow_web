import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs';
import { JurisflowDataService } from '../../services/jurisflow-data.service';
import { LoginService } from '../../services/login.service';

type QuickAction = {
  label: string;
  description: string;
  route: string;
};

@Component({
  selector: 'app-main-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterOutlet],
  templateUrl: './main-shell.component.html',
  styleUrl: './main-shell.component.scss'
})
export class MainShellComponent {
  currentRoute = '';
  quickActionsOpen = false;
  mobileMenuOpen = false;
  profileMenuOpen = false;
  searchTerm = '';

  readonly quickActions: QuickAction[] = [
    { label: 'Novo cliente', description: 'Cadastrar um novo cliente no escritorio.', route: '/plataforma/clientes/novo' },
    { label: 'Novo processo', description: 'Abrir um novo processo com vinculo ao cliente.', route: '/plataforma/processos/novo' },
    { label: 'Novo item da agenda', description: 'Criar audiencia, reuniao, prazo ou tarefa.', route: '/plataforma/agenda/novo' },
    { label: 'Novo documento', description: 'Adicionar ou gerar um documento para o caso.', route: '/plataforma/documentos/novo' },
    { label: 'Nova comunicacao', description: 'Registrar ou enviar uma nova comunicacao.', route: '/plataforma/comunicacoes/nova' }
  ];

  constructor(
    public data: JurisflowDataService,
    private router: Router,
    private loginService: LoginService
  ) {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.currentRoute = this.router.url;
      this.quickActionsOpen = false;
      this.mobileMenuOpen = false;
      this.profileMenuOpen = false;
    });
  }

  ngOnInit(): void {
    this.currentRoute = this.router.url;
    void this.data.loadRemoteContext();
  }

  isActive(route: string): boolean {
    return this.currentRoute === route || this.currentRoute.startsWith(`${route}/`);
  }

  toggleQuickActions(): void {
    this.quickActionsOpen = !this.quickActionsOpen;
    this.profileMenuOpen = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.quickActionsOpen = false;
    this.profileMenuOpen = false;
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
    this.quickActionsOpen = false;
  }

  goTo(route: string): void {
    this.quickActionsOpen = false;
    void this.router.navigateByUrl(route);
  }

  runSearch(): void {
    const term = this.searchTerm.trim();
    if (!term) {
      return;
    }

    void this.router.navigate(['/plataforma/clientes'], {
      queryParams: { busca: term }
    });
  }

  openPlansAndLimits(): void {
    void this.router.navigate(['/plataforma/configuracoes'], { queryParams: { section: 'geral' } });
  }

  openNotifications(): void {
    void this.router.navigate(['/plataforma/notificacoes']);
  }

  openMessages(): void {
    void this.router.navigate(['/plataforma/comunicacoes']);
  }

  openProfile(): void {
    this.profileMenuOpen = false;
    void this.router.navigate(['/plataforma/configuracoes'], { queryParams: { section: 'seguranca' } });
  }

  retryApiConnection(): void {
    void this.data.loadRemoteContext(true);
  }

  async logout(): Promise<void> {
    const refreshToken = this.loginService.getRefreshToken();
    if (refreshToken) {
      try {
        await firstValueFrom(this.loginService.logout(refreshToken));
      } catch {
        // The local session must still be cleared if the API is unavailable.
      }
    }
    this.loginService.clearToken();
    void this.router.navigate(['/login']);
  }

  @HostListener('document:keydown.escape')
  closeOverlays(): void {
    this.mobileMenuOpen = false;
    this.quickActionsOpen = false;
    this.profileMenuOpen = false;
  }
}
