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
  selector: 'app-client-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule, DropDownListModule, TextBoxModule],
  templateUrl: './client-form-page.component.html',
  styleUrl: './client-form-page.component.scss'
})
export class ClientFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly statusOptions = ['lead', 'active', 'inactive', 'archived'];
  readonly personTypeOptions = [
    { label: 'Pessoa fisica', value: 'person' },
    { label: 'Pessoa juridica', value: 'company' }
  ];
  readonly civilStatusOptions = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viuvo(a)', 'Uniao estavel', 'Nao informado'];
  readonly originOptions = ['Indicacao', 'Site', 'WhatsApp', 'Instagram', 'Google', 'Evento', 'Cliente antigo', 'Outro'];

  loading = false;
  saving = false;
  errorMessage = '';
  clientId = '';

  form = this.fb.group({
    type: ['person'],
    name: ['', Validators.required],
    document: [''],
    rg_ie: [''],
    email: [''],
    phone: [''],
    civil_status: ['Nao informado'],
    profession: [''],
    birth_date: [''],
    responsible_user_id: [''],
    origin: ['Site'],
    status: ['active', Validators.required],
    notes: ['']
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  get isEdit(): boolean {
    return this.clientId.trim().length > 0;
  }

  async ngOnInit(): Promise<void> {
    this.clientId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.isEdit) {
      return;
    }

    this.loading = true;
    try {
      const response = await firstValueFrom(this.api.get<any>('clients', this.clientId));
      if (response?.data) {
        this.form.patchValue({
          type: response.data.type ?? 'person',
          name: response.data.name ?? '',
          document: response.data.document ?? '',
          rg_ie: response.data.rg_ie ?? '',
          email: response.data.email ?? '',
          phone: response.data.phone ?? '',
          civil_status: response.data.civil_status ?? 'Nao informado',
          profession: response.data.profession ?? '',
          birth_date: this.toInputDate(response.data.birth_date),
          responsible_user_id: response.data.responsible_user_id ?? '',
          origin: response.data.origin ?? 'Site',
          status: response.data.status ?? 'active',
          notes: response.data.notes ?? ''
        });
      }
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar o cliente.';
    } finally {
      this.loading = false;
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const payload = { ...this.form.getRawValue() };

    try {
      if (this.isEdit) {
        await firstValueFrom(this.api.update('clients', this.clientId, payload));
      } else {
        const response = await firstValueFrom(this.api.create<{ id: string }>('clients', payload));
        this.clientId = response?.data?.id ?? '';
      }
      await this.router.navigate(['/plataforma/clientes']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao salvar cliente.';
    } finally {
      this.saving = false;
    }
  }

  private toInputDate(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }
}
