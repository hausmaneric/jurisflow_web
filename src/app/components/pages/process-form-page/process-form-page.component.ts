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
  selector: 'app-process-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule, DropDownListModule, TextBoxModule],
  templateUrl: './process-form-page.component.html',
  styleUrl: './process-form-page.component.scss'
})
export class ProcessFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  processId = '';
  loading = false;
  saving = false;
  errorMessage = '';

  clients: Array<{ id: string; name: string }> = [];
  lawyers: Array<{ id: string; name: string }> = [];

  readonly statusOptions = ['open', 'doing', 'closed', 'archived'];

  form = this.fb.group({
    client_id: [''],
    lawyer_id: [''],
    case_number: [''],
    title: ['', Validators.required],
    area: [''],
    court: [''],
    district: [''],
    court_branch: [''],
    phase: [''],
    status: ['open', Validators.required],
    claim_value: [0],
    expected_fees: [0],
    notes: ['']
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  get isEdit(): boolean {
    return this.processId.trim().length > 0;
  }

  async ngOnInit(): Promise<void> {
    this.processId = this.route.snapshot.paramMap.get('id') ?? '';
    await this.loadOptions();
    if (this.isEdit) {
      await this.loadProcess();
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
        await firstValueFrom(this.api.update('cases', this.processId, payload));
      } else {
        await firstValueFrom(this.api.create('cases', payload));
      }
      await this.router.navigate(['/plataforma/processos']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao salvar processo.';
    } finally {
      this.saving = false;
    }
  }

  private async loadOptions(): Promise<void> {
    try {
      const [clients, lawyers] = await Promise.all([
        firstValueFrom(this.api.list<any>('clients', { limit: 200 })),
        firstValueFrom(this.api.list<any>('lawyers', { limit: 200 }))
      ]);
      this.clients = (clients.data ?? []).map((item) => ({ id: item.id, name: item.name }));
      this.lawyers = (lawyers.data ?? []).map((item) => ({ id: item.id, name: item.name }));
    } catch {
      this.clients = [];
      this.lawyers = [];
    }
  }

  private async loadProcess(): Promise<void> {
    this.loading = true;
    try {
      const response = await firstValueFrom(this.api.get<any>('cases', this.processId));
      if (response?.data) {
        this.form.patchValue({
          client_id: response.data.client_id ?? '',
          lawyer_id: response.data.lawyer_id ?? '',
          case_number: response.data.case_number ?? '',
          title: response.data.title ?? '',
          area: response.data.area ?? '',
          court: response.data.court ?? '',
          district: response.data.district ?? '',
          court_branch: response.data.court_branch ?? '',
          phase: response.data.phase ?? '',
          status: response.data.status ?? 'open',
          claim_value: Number(response.data.claim_value ?? 0),
          expected_fees: Number(response.data.expected_fees ?? 0),
          notes: response.data.notes ?? ''
        });
      }
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar o processo.';
    } finally {
      this.loading = false;
    }
  }
}
