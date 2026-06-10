import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

@Component({
  selector: 'app-user-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule, DropDownListModule, TextBoxModule],
  templateUrl: './user-form-page.component.html',
  styleUrl: './user-form-page.component.scss'
})
export class UserFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  userId = '';
  loading = false;
  saving = false;
  errorMessage = '';
  roles: Array<{ id: string; name: string }> = [];

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', Validators.required],
    password: [''],
    role_id: [''],
    active: [true]
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  get isEdit(): boolean {
    return this.userId.trim().length > 0;
  }

  async ngOnInit(): Promise<void> {
    this.userId = this.route.snapshot.paramMap.get('id') ?? '';
    await this.loadRoles();
    if (this.isEdit) {
      await this.loadUser();
    } else {
      this.form.get('password')?.addValidators(Validators.required);
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const payload = { ...this.form.getRawValue() } as Record<string, unknown>;
    if (this.isEdit && !payload['password']) {
      delete payload['password'];
    }

    try {
      if (this.isEdit) {
        await firstValueFrom(this.api.update('users', this.userId, payload));
      } else {
        await firstValueFrom(this.api.create('users', payload));
      }
      await this.router.navigate(['/plataforma/usuarios']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao salvar usuario.';
    } finally {
      this.saving = false;
    }
  }

  private async loadRoles(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.list<any>('roles', { limit: 100 }));
      this.roles = (response?.data ?? []).map((role) => ({ id: role.id, name: role.name ?? role.code ?? role.id }));
    } catch {
      this.roles = [];
    }
  }

  private async loadUser(): Promise<void> {
    this.loading = true;
    try {
      const response = await firstValueFrom(this.api.get<any>('users', this.userId));
      const user = response?.data ?? {};
      this.form.patchValue({
        name: user.name ?? '',
        email: user.email ?? '',
        role_id: user.role_id ?? '',
        active: user.active !== false
      });
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar o usuario.';
    } finally {
      this.loading = false;
    }
  }
}
