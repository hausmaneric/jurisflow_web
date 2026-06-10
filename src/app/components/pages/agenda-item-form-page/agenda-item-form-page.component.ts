import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

type AgendaItemKind = 'appointment' | 'task';

@Component({
  selector: 'app-agenda-item-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule, DropDownListModule, TextBoxModule],
  templateUrl: './agenda-item-form-page.component.html',
  styleUrl: './agenda-item-form-page.component.scss'
})
export class AgendaItemFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  itemId = '';
  loading = false;
  saving = false;
  errorMessage = '';
  itemKind: AgendaItemKind = 'appointment';

  clients: Array<{ id: string; name: string }> = [];
  cases: Array<{ id: string; title: string }> = [];
  users: Array<{ id: string; name: string }> = [];

  readonly kindOptions = [
    { id: 'appointment', text: 'Compromisso' },
    { id: 'task', text: 'Tarefa' }
  ];
  readonly typeOptions = ['atendimento', 'audiencia', 'prazo', 'reuniao', 'diligencia', 'follow-up'];
  readonly modeOptions = ['online', 'presencial'];
  readonly appointmentStatusOptions = ['scheduled', 'confirmed', 'done', 'canceled', 'rescheduled'];
  readonly priorityOptions = ['low', 'medium', 'high', 'urgent'];
  readonly taskStatusOptions = ['open', 'pending', 'in_progress', 'done', 'canceled'];

  form = this.fb.group({
    client_id: [''],
    case_id: [''],
    assigned_user_id: [''],
    title: ['', Validators.required],
    type: ['atendimento'],
    mode: ['presencial'],
    start_at: [''],
    end_at: [''],
    location: [''],
    notes: [''],
    priority: ['medium'],
    due_at: [''],
    status: ['scheduled', Validators.required]
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  get isEdit(): boolean {
    return this.itemId.trim().length > 0;
  }

  get isTask(): boolean {
    return this.itemKind === 'task';
  }

  get pageTitle(): string {
    return this.isEdit ? 'Item da agenda' : 'Novo item da agenda';
  }

  get pageDescription(): string {
    return this.isTask
      ? 'Cadastre tarefas, prazos e acompanhamentos sem sair do mesmo modulo operacional.'
      : 'Cadastre audiencia, atendimento, prazo ou reuniao sem sair do fluxo principal da Agenda.';
  }

  async ngOnInit(): Promise<void> {
    this.itemId = this.route.snapshot.paramMap.get('id') ?? '';
    this.itemKind = this.resolveInitialKind();
    this.applyKindDefaults();
    await this.loadOptions();
    if (this.isEdit) {
      await this.loadAgendaItem();
    } else {
      this.applyInitialQueryParams();
    }
  }

  changeKind(kind: AgendaItemKind): void {
    if (this.saving || this.loading || this.itemKind === kind) {
      return;
    }
    this.itemKind = kind;
    this.applyKindDefaults();
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const payload = this.buildPayload();

    try {
      if (this.isEdit) {
        await firstValueFrom(this.api.update('agenda-items', this.prefixedItemId(), payload));
      } else {
        await firstValueFrom(this.api.create('agenda-items', payload));
      }
      await this.router.navigate(['/plataforma/agenda']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Falha ao salvar item da agenda.';
    } finally {
      this.saving = false;
    }
  }

  private async loadOptions(): Promise<void> {
    try {
      const [clients, cases, users] = await Promise.all([
        firstValueFrom(this.api.list<any>('clients', { limit: 200 })),
        firstValueFrom(this.api.list<any>('cases', { limit: 200 })),
        firstValueFrom(this.api.list<any>('users', { limit: 200 }))
      ]);
      this.clients = (clients.data ?? []).map((item) => ({ id: item.id, name: item.name }));
      this.cases = (cases.data ?? []).map((item) => ({ id: item.id, title: item.title ?? item.case_number ?? item.id }));
      this.users = (users.data ?? []).map((item) => ({ id: item.id, name: item.name }));
    } catch {
      this.clients = [];
      this.cases = [];
      this.users = [];
    }
  }

  private async loadAgendaItem(): Promise<void> {
    this.loading = true;
    try {
      const response = await firstValueFrom(this.api.get<any>('agenda-items', this.prefixedItemId()));
      if (response?.data) {
        const kind = response.data.item_kind === 'task' ? 'task' : 'appointment';
        this.itemKind = kind;
        this.form.patchValue({
          client_id: response.data.client_id ?? '',
          case_id: response.data.case_id ?? '',
          assigned_user_id: response.data.assigned_user_id ?? response.data.owner_user_id ?? '',
          title: response.data.title ?? '',
          type: response.data.item_type ?? response.data.type ?? 'atendimento',
          mode: response.data.mode ?? 'presencial',
          start_at: this.toInputDate(response.data.start_at),
          end_at: this.toInputDate(response.data.end_at),
          location: response.data.location ?? '',
          notes: response.data.notes ?? response.data.description ?? '',
          priority: response.data.priority ?? 'medium',
          due_at: this.toInputDate(response.data.due_at ?? response.data.start_at),
          status: response.data.status ?? (kind === 'task' ? 'open' : 'scheduled')
        });
        this.applyKindDefaults(false);
      }
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar o item da agenda.';
    } finally {
      this.loading = false;
    }
  }

  private resolveInitialKind(): AgendaItemKind {
    const routeKind = (this.route.snapshot.data['itemKind'] as string | undefined)?.toLowerCase();
    const queryKind = (this.route.snapshot.queryParamMap.get('kind') ?? '').toLowerCase();
    const recordId = this.itemId.toLowerCase();

    if (routeKind === 'task' || queryKind === 'task' || recordId.startsWith('task:')) {
      return 'task';
    }
    return 'appointment';
  }

  private applyInitialQueryParams(): void {
    const clientId = this.route.snapshot.queryParamMap.get('client') ?? '';
    const caseId = this.route.snapshot.queryParamMap.get('case') ?? '';
    const kind = (this.route.snapshot.queryParamMap.get('kind') ?? '').toLowerCase();

    if (kind === 'task' || kind === 'appointment') {
      this.itemKind = kind as AgendaItemKind;
      this.applyKindDefaults();
    }

    this.form.patchValue({
      client_id: clientId,
      case_id: caseId
    });
  }

  private prefixedItemId(): string {
    if (!this.itemId) {
      return '';
    }
    if (this.itemId.includes(':')) {
      return this.itemId;
    }
    return `${this.itemKind}:${this.itemId}`;
  }

  private buildPayload(): Record<string, unknown> {
    const raw = this.form.getRawValue();
    if (this.isTask) {
      return {
        item_kind: 'task',
        client_id: raw.client_id || null,
        case_id: raw.case_id || null,
        assigned_user_id: raw.assigned_user_id || null,
        title: raw.title,
        description: raw.notes || '',
        priority: raw.priority,
        due_at: raw.due_at ? new Date(raw.due_at).toISOString() : null,
        status: raw.status
      };
    }

    return {
      item_kind: 'appointment',
      client_id: raw.client_id || null,
      case_id: raw.case_id || null,
      title: raw.title,
      type: raw.type,
      mode: raw.mode,
      start_at: raw.start_at ? new Date(raw.start_at).toISOString() : null,
      end_at: raw.end_at ? new Date(raw.end_at).toISOString() : null,
      location: raw.location || '',
      notes: raw.notes || '',
      status: raw.status
    };
  }

  private applyKindDefaults(preserveTitle = true): void {
    if (this.isTask) {
      this.form.patchValue({
        status: this.form.value.status && this.taskStatusOptions.includes(String(this.form.value.status)) ? this.form.value.status : 'open',
        priority: this.form.value.priority ?? 'medium',
        type: 'tarefa'
      }, { emitEvent: false });
      if (!preserveTitle) {
        return;
      }
    } else {
      this.form.patchValue({
        status: this.form.value.status && this.appointmentStatusOptions.includes(String(this.form.value.status)) ? this.form.value.status : 'scheduled',
        mode: this.form.value.mode ?? 'presencial',
        type: this.typeOptions.includes(String(this.form.value.type)) ? this.form.value.type : 'atendimento'
      }, { emitEvent: false });
    }
  }

  private toInputDate(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  }
}
