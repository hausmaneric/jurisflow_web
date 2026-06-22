import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ActivityFeedItem,
  AgendaItemRow,
  CalendarEvent,
  ClientRow,
  CommunicationRow,
  DocumentRow,
  FinancialEntryRow,
  MetricCard,
  NavItem,
  ProcessRow,
  TaskRow
} from '../models/jurisflow.models';
import { NxResult } from '../models/login';
import { apiURL } from '../resources';
import { LoginService } from './login.service';

@Injectable({ providedIn: 'root' })
export class JurisflowDataService {
  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', route: '/plataforma/dashboard' },
    { label: 'Clientes', icon: 'pi pi-users', route: '/plataforma/clientes' },
    { label: 'Processos', icon: 'pi pi-folder-open', route: '/plataforma/processos' },
    { label: 'Advogados', icon: 'pi pi-id-card', route: '/plataforma/advogados' },
    { label: 'Agenda', icon: 'pi pi-calendar', route: '/plataforma/agenda', badge: '0' },
    { label: 'Documentos', icon: 'pi pi-file', route: '/plataforma/documentos' },
    { label: 'Comunicacoes', icon: 'pi pi-comments', route: '/plataforma/comunicacoes' },
    { label: 'Financeiro', icon: 'pi pi-dollar', route: '/plataforma/financeiro' },
    { label: 'Inteligencia', icon: 'pi pi-sparkles', route: '/plataforma/inteligencia' },
    { label: 'Notificacoes', icon: 'pi pi-bell', route: '/plataforma/notificacoes' },
    { label: 'Relatorios', icon: 'pi pi-chart-bar', route: '/plataforma/relatorios' },
    { label: 'Configuracoes', icon: 'pi pi-cog', route: '/plataforma/configuracoes' }
  ];

  dashboardMetrics: MetricCard[] = [
    { title: 'Clientes ativos', value: '0', helper: 'Base sincronizada com a API', color: 'blue', icon: 'pi pi-users' },
    { title: 'Processos ativos', value: '0', helper: 'Processos em andamento', color: 'green', icon: 'pi pi-folder-open' },
    { title: 'Itens da agenda', value: '0', helper: 'Compromissos e tarefas integrados', color: 'purple', icon: 'pi pi-calendar' },
    { title: 'Pendencias da agenda', value: '0', helper: 'Prazos e execucoes abertas', color: 'gold', icon: 'pi pi-check-square' },
    { title: 'Documentos', value: '0', helper: 'Acervo documental ativo', color: 'blue', icon: 'pi pi-wallet' }
  ];

  upcomingHearings: CalendarEvent[] = [];
  todayAgenda: CalendarEvent[] = [];
  agendaItems: AgendaItemRow[] = [];

  clients: ClientRow[] = [];
  processes: ProcessRow[] = [];
  tasks: TaskRow[] = [];
  documents: DocumentRow[] = [];
  communications: CommunicationRow[] = [];
  financialEntries: FinancialEntryRow[] = [];

  reportsMetrics: MetricCard[] = [
    { title: 'Processos ativos', value: '0', helper: 'Dados sincronizados', color: 'blue', icon: 'pi pi-briefcase' },
    { title: 'Audiencias', value: '0', helper: 'Agenda consolidada', color: 'green', icon: 'pi pi-users' },
    { title: 'Tarefas concluidas', value: '0', helper: 'Execucao acompanhada', color: 'purple', icon: 'pi pi-check-square' },
    { title: 'Faturamento', value: 'R$ 0,00', helper: 'Resumo financeiro atual', color: 'gold', icon: 'pi pi-wallet' },
    { title: 'Recebimentos', value: 'R$ 0,00', helper: 'Entradas registradas', color: 'red', icon: 'pi pi-money-bill' },
    { title: 'Novos clientes', value: '0', helper: 'Cadastros ativos', color: 'blue', icon: 'pi pi-user-plus' }
  ];

  user = {
    name: 'Administrador JurisFlow',
    role: 'Administrador',
    office: 'JurisFlow',
    plan: 'Plano Enterprise',
    avatar: 'JF'
  };

  apiConnectionError = '';
  private remoteLoaded = false;

  constructor(
    private http: HttpClient,
    private loginService: LoginService
  ) {}

  get chartSeries(): Array<{ x: string; y: number }> {
    if (!this.agendaItems.length) {
      return [
        { x: 'D-6', y: 0 },
        { x: 'D-5', y: 0 },
        { x: 'D-4', y: 0 },
        { x: 'D-3', y: 0 },
        { x: 'D-2', y: 0 },
        { x: 'D-1', y: 0 },
        { x: 'Hoje', y: 0 }
      ];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));

      const total = this.agendaItems.filter((item) => this.sameDate(item.dueDate, date)).length;
      const label = index === 6
        ? 'Hoje'
        : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      return { x: label, y: total };
    });
  }

  get donutSeries(): Array<{ x: string; y: number }> {
    const grouped = new Map<string, number>();

    for (const process of this.processes) {
      const key = process.area?.trim() || 'Outros';
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }

    if (!grouped.size) {
      return [{ x: 'Sem dados', y: 0 }];
    }

    return Array.from(grouped.entries())
      .map(([x, y]) => ({ x, y }))
      .sort((a, b) => b.y - a.y);
  }

  get activityFeed(): ActivityFeedItem[] {
    const items: ActivityFeedItem[] = [];

    for (const client of this.clients.slice(0, 2)) {
      items.push({
        icon: 'pi pi-user-plus',
        title: 'Cliente ativo na base',
        subtitle: client.nome,
        when: client.cadastro
      });
    }

    for (const process of this.processes.slice(0, 2)) {
      items.push({
        icon: 'pi pi-folder-open',
        title: 'Processo monitorado',
        subtitle: process.processo,
        when: process.status
      });
    }

    for (const document of this.documents.slice(0, 2)) {
      items.push({
        icon: 'pi pi-file',
        title: 'Documento registrado',
        subtitle: document.nome,
        when: document.adicionado
      });
    }

    for (const communication of this.communications.slice(0, 2)) {
      items.push({
        icon: 'pi pi-send',
        title: 'Comunicacao enviada',
        subtitle: communication.assunto,
        when: communication.dataHora
      });
    }

    return items.slice(0, 8);
  }

  async loadRemoteContext(force = false): Promise<void> {
    if (
      (!this.loginService.isAuthenticated() && !this.loginService.hasRefreshSession()) ||
      (this.remoteLoaded && !force)
    ) {
      return;
    }

    this.apiConnectionError = '';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.loginService.getToken()}`
    });

    const [me, summary, clients, cases, agendaItems, documents, messages, financialEntries, subscriptions] = await Promise.all([
      this.request<any>('me', headers),
      this.request<Record<string, number>>('reports/summary', headers),
      this.request<any[]>('clients', headers),
      this.request<any[]>('cases', headers),
      this.request<any[]>('agenda-items', headers),
      this.request<any[]>('documents', headers),
      this.request<any[]>('messages', headers),
      this.request<any[]>('financial-entries', headers),
      this.request<any[]>('company-subscriptions', headers)
    ]);

    if (!me && !summary && !clients && !cases && !agendaItems) {
      this.apiConnectionError = 'Não foi possível carregar os dados da API. Verifique sua conexão ou entre novamente.';
      return;
    }

    if (me) {
      this.user = {
        name: me.name ?? this.user.name,
        role: me.role_name ?? this.user.role,
        office: me.company_name ?? this.user.office,
        plan: this.user.plan,
        avatar: this.initials(me.name ?? this.user.name)
      };
    }

    if (subscriptions?.length) {
      const activeSubscription = subscriptions.find((item) => item.status === 'active') ?? subscriptions[0];
      const planName = activeSubscription.plan_name ?? activeSubscription.name ?? activeSubscription.billing_data?.plan_code;
      if (planName) {
        this.user = {
          ...this.user,
          plan: `Plano ${String(planName).charAt(0).toUpperCase()}${String(planName).slice(1)}`
        };
      }
    }

    if (summary) {
      const totalAgenda = Number(summary['appointments_upcoming'] ?? 0) + Number(summary['tasks_open'] ?? 0);
      this.dashboardMetrics = [
        { title: 'Clientes ativos', value: String(summary['clients'] ?? 0), helper: 'Base sincronizada com a API', color: 'blue', icon: 'pi pi-users' },
        { title: 'Processos ativos', value: String(summary['cases_open'] ?? 0), helper: 'Processos em andamento', color: 'green', icon: 'pi pi-folder-open' },
        { title: 'Itens da agenda', value: String(totalAgenda), helper: 'Compromissos e tarefas integrados', color: 'purple', icon: 'pi pi-calendar' },
        { title: 'Pendencias da agenda', value: String(summary['tasks_open'] ?? 0), helper: 'Prazos e execucoes abertas', color: 'gold', icon: 'pi pi-check-square' },
        { title: 'Documentos', value: String(summary['documents'] ?? 0), helper: 'Acervo documental ativo', color: 'blue', icon: 'pi pi-wallet' }
      ];
    }

    if (clients) {
      this.clients = clients.map((row) => ({
        id: row.id,
        nome: row.name ?? row.full_name ?? row.trade_name ?? 'Cliente',
        tipo: row.client_type ?? row.person_type ?? row.kind ?? 'Cliente',
        contato: row.email ?? row.phone ?? row.document ?? '-',
        responsavel: row.assigned_user_name ?? row.owner_name ?? row.contact_name ?? 'Equipe Juridica',
        status: this.normalizeStatus(row.status, row.active),
        cadastro: this.formatDate(row.created_at),
        statusKey: String(row.status ?? '').toLowerCase() || 'active',
        email: row.email ?? '',
        phone: row.phone ?? '',
        notes: row.notes ?? ''
      }));
    }

    if (cases) {
      this.processes = cases.map((row) => ({
        id: row.id,
        processo: row.case_number ?? row.number ?? row.external_id ?? `PROC-${row.id}`,
        cliente: row.client_name ?? row.title ?? 'Cliente vinculado',
        area: row.area ?? row.legal_area ?? row.case_type ?? 'Juridico',
        vara: row.court ?? row.venue ?? row.jurisdiction ?? '-',
        fase: row.phase ?? row.stage ?? 'Execucao',
        status: this.normalizeCaseStatus(row.status)
      }));
    }

    if (agendaItems) {
      this.agendaItems = agendaItems.map((row, index) => {
        const itemKind = row.item_kind === 'task' ? 'task' : 'appointment';
        const status = itemKind === 'task'
          ? this.normalizeTaskStatus(row.status)
          : this.normalizeAgendaStatus(row.status, row.item_type ?? row.type);

        return {
          id: row.id ?? `${itemKind}:${row.source_id ?? index}`,
          sourceId: row.source_id ?? row.id,
          itemKind,
          clientId: row.client_id ?? '',
          caseId: row.case_id ?? '',
          clientName: row.client_name ?? '',
          title: row.title ?? row.subject ?? 'Item da agenda',
          type: this.normalizeAgendaType(row.item_type ?? row.type, itemKind),
          status,
          priority: row.priority ?? (itemKind === 'task' ? 'Media' : 'Agenda'),
          owner: row.owner_user_name ?? row.assigned_user_name ?? row.client_name ?? row.owner_name ?? 'Equipe Juridica',
          process: row.case_number ?? row.case_id ?? row.client_name ?? '-',
          dueDate: this.formatDate(row.start_at ?? row.due_at),
          timeLabel: this.formatTime(row.start_at ?? row.due_at),
          location: row.location ?? row.mode ?? 'Fluxo interno',
          color: this.agendaColor(row, index),
          description: row.description ?? row.notes ?? ''
        };
      });

      const appointmentItems = this.agendaItems.filter((item) => item.itemKind === 'appointment');
      const taskItems = this.agendaItems.filter((item) => item.itemKind === 'task');

      this.todayAgenda = appointmentItems.slice(0, 4).map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        dateLabel: 'Hoje',
        timeLabel: item.timeLabel,
        location: item.location,
        client: item.owner,
        color: item.color
      }));

      this.upcomingHearings = appointmentItems.slice(0, 3).map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        dateLabel: this.formatDayMonthLabel(item.dueDate),
        timeLabel: item.timeLabel,
        location: item.location,
        client: item.owner,
        color: item.color
      }));

      this.tasks = taskItems.map((item) => ({
        id: item.sourceId ?? item.id,
        agendaItemId: item.id,
        tarefa: item.title,
        processo: item.process,
        responsavel: item.owner,
        prazo: item.dueDate,
        prioridade: item.priority,
        status: item.status
      }));

      this.navItems[4] = { ...this.navItems[4], badge: String(this.agendaItems.length) };
    }

    if (documents) {
      this.documents = documents.map((row) => ({
        id: row.id,
        nome: row.title ?? row.name ?? row.original_name ?? 'Documento',
        tipo: row.document_type ?? row.file_type ?? row.mime_type ?? row.file_extension ?? 'DOC',
        processoCliente: row.case_number ?? row.client_name ?? '-',
        pasta: row.folder_name ?? row.category ?? 'Geral',
        adicionado: this.formatDateTime(row.created_at),
        fileUrl: row.file_url ?? '',
        status: row.status ?? '',
        clientId: row.client_id ?? '',
        caseId: row.case_id ?? '',
        resumo: this.summarizeText(row.file_url || row.title || row.name)
      }));
    }

    if (messages) {
      this.communications = messages.map((row) => ({
        id: row.id,
        assunto: row.subject ?? row.title ?? 'Comunicacao',
        processoCliente: row.case_number ?? row.client_name ?? '-',
        canal: row.channel ?? 'E-mail',
        destinatario: row.recipient_name ?? row.recipient ?? row.client_name ?? '-',
        dataHora: this.formatDateTime(row.sent_at ?? row.created_at),
        status: this.normalizeMessageStatus(row.status),
        resumo: this.summarizeText(row.body),
        body: row.body ?? '',
        clientId: row.client_id ?? '',
        caseId: row.case_id ?? '',
        ownerName: row.created_by_name ?? row.recipient_name ?? row.recipient ?? ''
      }));
    }

    if (financialEntries) {
      this.financialEntries = financialEntries.map((row) => {
        const rawAmount = Number(row.amount ?? 0);
        const signedAmount = String(row.entry_type ?? '').toLowerCase() === 'expense'
          ? -Math.abs(rawAmount)
          : Math.abs(rawAmount);

        return {
          id: row.id,
          data: this.formatDate(row.entry_date ?? row.created_at),
          descricao: row.description ?? 'Lancamento financeiro',
          tipo: String(row.entry_type ?? '').toLowerCase() === 'expense' ? 'Despesa' : 'Receita',
          categoria: row.category ?? 'Geral',
          clienteProcesso: row.case_number ?? row.client_name ?? '-',
          conta: row.account_label ?? 'Conta principal',
          valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(signedAmount),
          status: this.normalizeFinancialStatus(row.status),
          clientId: row.client_id ?? '',
          caseId: row.case_id ?? '',
          notes: row.notes ?? ''
        };
      });
    }

    this.reportsMetrics = this.buildReportsMetrics();
    this.remoteLoaded = true;
  }

  private buildReportsMetrics(): MetricCard[] {
    const income = this.financialEntries
      .filter((item) => item.tipo === 'Receita')
      .reduce((sum, item) => sum + this.parseCurrency(item.valor), 0);
    const received = this.financialEntries
      .filter((item) => item.status === 'Recebido' || item.status === 'Pago')
      .reduce((sum, item) => sum + Math.abs(this.parseCurrency(item.valor)), 0);
    const closedTasks = this.tasks.filter((item) => item.status.toLowerCase().includes('conclu')).length;

    return [
      { title: 'Processos ativos', value: String(this.processes.length), helper: 'Dados sincronizados', color: 'blue', icon: 'pi pi-briefcase' },
      { title: 'Audiencias', value: String(this.upcomingHearings.length), helper: 'Agenda consolidada', color: 'green', icon: 'pi pi-users' },
      { title: 'Tarefas concluidas', value: String(closedTasks), helper: 'Execucao acompanhada', color: 'purple', icon: 'pi pi-check-square' },
      { title: 'Faturamento', value: this.formatCurrency(income), helper: 'Resumo financeiro atual', color: 'gold', icon: 'pi pi-wallet' },
      { title: 'Recebimentos', value: this.formatCurrency(received), helper: 'Entradas registradas', color: 'red', icon: 'pi pi-money-bill' },
      { title: 'Novos clientes', value: String(this.clients.length), helper: 'Cadastros ativos', color: 'blue', icon: 'pi pi-user-plus' }
    ];
  }

  private async request<T>(path: string, headers: HttpHeaders): Promise<T | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<NxResult<T>>(`${apiURL}${path}`, { headers })
      );
      return response?.data ?? null;
    } catch {
      return null;
    }
  }

  private normalizeStatus(status?: string, active?: boolean): string {
    if (typeof status === 'string' && status.trim()) {
      return status.toLowerCase() === 'active' ? 'Ativo' : status;
    }
    return active === false ? 'Inativo' : 'Ativo';
  }

  private normalizeCaseStatus(status?: string): string {
    const value = String(status ?? '').toLowerCase();
    if (value === 'open') return 'Em andamento';
    if (value === 'archived') return 'Arquivado';
    if (value === 'closed') return 'Concluido';
    return status ?? 'Em andamento';
  }

  private normalizeTaskStatus(status?: string): string {
    const value = String(status ?? '').toLowerCase();
    if (value === 'open' || value === 'pending') return 'Pendente';
    if (value === 'done' || value === 'completed') return 'Concluida';
    if (value === 'in_progress') return 'Em andamento';
    return status ?? 'Pendente';
  }

  private normalizeAgendaStatus(status?: string, fallbackType?: string): string {
    const value = String(status ?? '').toLowerCase();
    if (value === 'scheduled') return 'Agendado';
    if (value === 'confirmed') return 'Confirmado';
    if (value === 'done' || value === 'completed') return 'Concluido';
    if (value === 'cancelled' || value === 'canceled') return 'Cancelado';
    return status ?? fallbackType ?? 'Agenda';
  }

  private normalizeAgendaType(type?: string, itemKind?: string): string {
    if (itemKind === 'task') {
      return 'Tarefa';
    }

    const value = String(type ?? '').trim();
    if (!value) {
      return 'Compromisso';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private agendaColor(row: any, index: number): string {
    if (row.item_kind === 'task') {
      return this.taskColorForApiStatus(row.status);
    }
    return ['blue', 'green', 'red', 'violet', 'gold'][index % 5];
  }

  private taskColorForApiStatus(status?: string): string {
    const value = String(status ?? '').toLowerCase();
    if (value === 'done' || value === 'completed') return 'green';
    if (value === 'late' || value === 'overdue' || value === 'atrasada') return 'red';
    if (value === 'in_progress') return 'blue';
    return 'gold';
  }

  private normalizeMessageStatus(status?: string): string {
    const value = String(status ?? '').toLowerCase();
    if (value === 'sent') return 'Enviada';
    if (value === 'scheduled') return 'Agendada';
    if (value === 'failed') return 'Falha';
    return status ?? 'Enviada';
  }

  private normalizeFinancialStatus(status?: string): string {
    const value = String(status ?? '').toLowerCase();
    if (value === 'paid') return 'Pago';
    if (value === 'received') return 'Recebido';
    if (value === 'pending') return 'Pendente';
    if (value === 'overdue') return 'Atrasado';
    return status ?? 'Pendente';
  }

  private formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('pt-BR');
  }

  private formatDateTime(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  private formatTime(value?: string): string {
    if (!value) return '--:--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  private formatDayMonthLabel(value?: string): string {
    if (!value || value === '-') return '--';
    const [day, month, year] = value.split('/');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (Number.isNaN(date.getTime())) return value;
    return date
      .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      .replace('.', '')
      .toUpperCase();
  }

  private sameDate(value: string, target: Date): boolean {
    if (!value || value === '-') {
      return false;
    }

    const [day, month, year] = value.split('/');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    date.setHours(0, 0, 0, 0);
    return !Number.isNaN(date.getTime()) && date.getTime() === target.getTime();
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  private parseCurrency(value: string): number {
    const normalized = String(value ?? '')
      .replace(/\s/g, '')
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.');
    return Number(normalized) || 0;
  }

  private initials(value: string): string {
    return value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private summarizeText(value?: string): string {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (!text) {
      return '';
    }
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }
}
