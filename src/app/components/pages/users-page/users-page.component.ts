import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, ConfirmDialogComponent],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss'
})
export class UsersPageComponent implements OnInit {
  loading = false;
  errorMessage = '';
  users: any[] = [];
  searchTerm = '';
  statusFilter: 'todos' | 'ativos' | 'inativos' = 'todos';
  roleFilter = '';
  pendingRemoval: any | null = null;

  constructor(
    private api: JurisflowApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get filteredUsers(): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.users.filter((user) => {
      const matchesStatus =
        this.statusFilter === 'todos' ||
        (this.statusFilter === 'ativos' && user?.active !== false) ||
        (this.statusFilter === 'inativos' && user?.active === false);

      const matchesRole = !this.roleFilter || String(user?.role_id ?? '') === this.roleFilter;

      const haystack = [user?.name, user?.email, user?.role_name, user?.role_id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !term || haystack.includes(term);
      return matchesStatus && matchesSearch && matchesRole;
    });
  }

  get activeCount(): number {
    return this.users.filter((user) => user?.active !== false).length;
  }

  get inactiveCount(): number {
    return this.users.filter((user) => user?.active === false).length;
  }

  get roleFilterLabel(): string {
    if (!this.roleFilter) {
      return '';
    }
    const roleName = this.users.find((user) => String(user?.role_id ?? '') === this.roleFilter)?.role_name;
    return roleName ? `Perfil filtrado: ${roleName}` : 'Perfil filtrado';
  }

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((params) => {
      this.roleFilter = params.get('role') ?? '';
      this.searchTerm = params.get('busca') ?? this.searchTerm;
    });
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await firstValueFrom(this.api.list<any>('users', { limit: 200 }));
      this.users = response?.data ?? [];
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar os usuarios.';
    } finally {
      this.loading = false;
    }
  }

  openCreate(): void {
    void this.router.navigate(['/plataforma/usuarios/novo']);
  }

  openEdit(user: any): void {
    if (!user?.id) return;
    void this.router.navigate(['/plataforma/usuarios', user.id, 'editar']);
  }

  openRole(user: any): void {
    const roleId = user?.role_id;
    if (!roleId) {
      return;
    }

    void this.router.navigate(['/plataforma/perfis'], {
      queryParams: { role: roleId }
    });
  }

  async clearRoleFilter(): Promise<void> {
    this.roleFilter = '';
    await this.router.navigate(['/plataforma/usuarios']);
  }

  requestRemove(user: any): void {
    if (!user?.id) {
      return;
    }
    this.pendingRemoval = user;
  }

  cancelRemove(): void {
    this.pendingRemoval = null;
  }

  async confirmRemove(): Promise<void> {
    const user = this.pendingRemoval;
    if (!user?.id) {
      return;
    }
    this.pendingRemoval = null;
    await firstValueFrom(this.api.delete('users', user.id));
    await this.load();
  }

  statusLabel(user: any): string {
    return user?.active === false ? 'Inativo' : 'Ativo';
  }

  setStatusFilter(filter: 'todos' | 'ativos' | 'inativos'): void {
    this.statusFilter = filter;
  }
}
