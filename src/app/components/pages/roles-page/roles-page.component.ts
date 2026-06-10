import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './roles-page.component.html',
  styleUrl: './roles-page.component.scss'
})
export class RolesPageComponent implements OnInit {
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  roles: any[] = [];
  permissions: any[] = [];
  rolePermissions: any[] = [];
  selectedRoleId = '';

  constructor(
    private api: JurisflowApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((params) => {
      const roleId = params.get('role') ?? '';
      if (roleId) {
        this.selectedRoleId = roleId;
      }
    });
    await this.load();
  }

  get selectedRole(): any | null {
    return this.roles.find((role) => role.id === this.selectedRoleId) ?? null;
  }

  get groupedPermissions(): Array<{ module: string; items: any[] }> {
    const buckets = new Map<string, any[]>();
    for (const permission of this.permissions) {
      const moduleName = permission?.module_name || 'geral';
      const current = buckets.get(moduleName) ?? [];
      current.push(permission);
      buckets.set(moduleName, current);
    }

    return Array.from(buckets.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([module, items]) => ({
        module,
        items: items.sort((left, right) =>
          String(left?.name || left?.code || '').localeCompare(String(right?.name || right?.code || ''))
        )
      }));
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const [rolesResponse, permissionsResponse, rolePermissionsResponse] = await Promise.all([
        firstValueFrom(this.api.list<any>('roles', { limit: 100 })),
        firstValueFrom(this.api.list<any>('permissions', { limit: 300 })),
        firstValueFrom(this.api.list<any>('role-permissions', { limit: 500 })),
      ]);
      this.roles = rolesResponse?.data ?? [];
      this.permissions = permissionsResponse?.data ?? [];
      this.rolePermissions = rolePermissionsResponse?.data ?? [];
      if ((!this.selectedRoleId || !this.roles.some((role) => role.id === this.selectedRoleId)) && this.roles.length) {
        this.selectedRoleId = this.roles[0].id;
      }
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar perfis e permissoes.';
    } finally {
      this.loading = false;
    }
  }

  selectRole(roleId: string): void {
    this.selectedRoleId = roleId;
    this.successMessage = '';
    void this.router.navigate(['/plataforma/perfis'], {
      queryParams: { role: roleId }
    });
  }

  openUsersForRole(): void {
    if (!this.selectedRoleId) {
      return;
    }
    void this.router.navigate(['/plataforma/usuarios'], {
      queryParams: { role: this.selectedRoleId }
    });
  }

  isGranted(permissionId: string): boolean {
    return this.rolePermissions.some(
      (item) => item?.role_id === this.selectedRoleId && item?.permission_id === permissionId
    );
  }

  permissionRecord(permissionId: string): any | null {
    return (
      this.rolePermissions.find(
        (item) => item?.role_id === this.selectedRoleId && item?.permission_id === permissionId
      ) ?? null
    );
  }

  async togglePermission(permissionId: string, checked: boolean): Promise<void> {
    if (!this.selectedRoleId || this.saving) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      const existing = this.permissionRecord(permissionId);
      if (checked && !existing) {
        await firstValueFrom(
          this.api.create('role-permissions', {
            role_id: this.selectedRoleId,
            permission_id: permissionId
          })
        );
      }

      if (!checked && existing?.id) {
        await firstValueFrom(this.api.delete('role-permissions', existing.id));
      }

      const refreshed = await firstValueFrom(this.api.list<any>('role-permissions', { limit: 500 }));
      this.rolePermissions = refreshed?.data ?? [];
      this.successMessage = 'Permissoes do perfil atualizadas com sucesso.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel atualizar as permissoes.';
    } finally {
      this.saving = false;
    }
  }

  countForRole(roleId: string): number {
    return this.rolePermissions.filter((item) => item?.role_id === roleId).length;
  }
}
