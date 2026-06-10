import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { firstValueFrom } from 'rxjs';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

@Component({
  selector: 'app-financial-entry-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule],
  templateUrl: './financial-entry-form-page.component.html',
  styleUrl: './financial-entry-form-page.component.scss'
})
export class FinancialEntryFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly typeOptions = [
    { value: 'income', label: 'Receita' },
    { value: 'expense', label: 'Despesa' }
  ];

  readonly statusOptions = [
    { value: 'pending', label: 'Pendente' },
    { value: 'received', label: 'Recebido' },
    { value: 'paid', label: 'Pago' },
    { value: 'overdue', label: 'Atrasado' }
  ];

  readonly categoryOptions = [
    'Honorarios',
    'Consultoria',
    'Custas processuais',
    'Despesas administrativas',
    'Marketing',
    'Impostos',
    'Servicos',
    'Outros'
  ];

  entryId = '';
  loading = false;
  saving = false;
  errorMessage = '';
  clients: Array<{ id: string; name: string }> = [];
  cases: Array<{ id: string; title: string; caseNumber: string }> = [];

  form = this.fb.group({
    entry_date: ['', Validators.required],
    description: ['', Validators.required],
    entry_type: ['income', Validators.required],
    category: ['Honorarios', Validators.required],
    account_label: ['Conta principal'],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    status: ['pending', Validators.required],
    client_id: [''],
    case_id: [''],
    notes: ['']
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  get isEdit(): boolean {
    return this.entryId.trim().length > 0;
  }

  get currentTypeLabel(): string {
    return this.form.value.entry_type === 'expense' ? 'Despesa' : 'Receita';
  }

  get previewAmount(): string {
    const amount = Number(this.form.value.amount ?? 0);
    const signed = this.form.value.entry_type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(signed);
  }

  async ngOnInit(): Promise<void> {
    this.entryId = this.route.snapshot.paramMap.get('id') ?? '';
    await this.loadSelectors();
    if (this.isEdit) {
      await this.loadEntry();
    } else {
      this.form.patchValue({ entry_date: new Date().toISOString().slice(0, 10) });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const payload = {
      ...this.form.getRawValue(),
      amount: Number(this.form.value.amount ?? 0)
    };

    try {
      if (this.isEdit) {
        await firstValueFrom(this.api.update('financial-entries', this.entryId, payload));
      } else {
        await firstValueFrom(this.api.create('financial-entries', payload));
      }
      await this.router.navigate(['/plataforma/financeiro']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao salvar o lancamento financeiro.';
    } finally {
      this.saving = false;
    }
  }

  private async loadSelectors(): Promise<void> {
    try {
      const [clientsResponse, casesResponse] = await Promise.all([
        firstValueFrom(this.api.list<any>('clients', { limit: 200 })),
        firstValueFrom(this.api.list<any>('cases', { limit: 200 }))
      ]);

      this.clients = (clientsResponse.data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name ?? 'Cliente'
      }));

      this.cases = (casesResponse.data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title ?? 'Processo',
        caseNumber: row.case_number ?? ''
      }));
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar os dados auxiliares do financeiro.';
    }
  }

  private async loadEntry(): Promise<void> {
    this.loading = true;
    try {
      const response = await firstValueFrom(this.api.get<any>('financial-entries', this.entryId));
      const data = response?.data ?? {};
      this.form.patchValue({
        entry_date: this.toInputDate(data.entry_date),
        description: data.description ?? '',
        entry_type: data.entry_type ?? 'income',
        category: data.category ?? 'Honorarios',
        account_label: data.account_label ?? 'Conta principal',
        amount: Number(data.amount ?? 0),
        status: data.status ?? 'pending',
        client_id: data.client_id ?? '',
        case_id: data.case_id ?? '',
        notes: data.notes ?? ''
      });
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar o lancamento.';
    } finally {
      this.loading = false;
    }
  }

  private toInputDate(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }
}
