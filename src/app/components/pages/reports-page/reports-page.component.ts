import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { firstValueFrom } from 'rxjs';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';
import { JurisflowDataService } from '../../../services/jurisflow-data.service';

interface BiRow {
  label: string;
  total: number;
}

interface BiPayload {
  cases_by_area?: BiRow[];
  cases_by_status?: BiRow[];
  agenda_by_type?: BiRow[];
  productivity?: BiRow[];
  top_clients_by_cases?: BiRow[];
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, RouterModule],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.scss'
})
export class ReportsPageComponent implements OnInit {
  activeTab = 'Visao geral';
  rangeFilter = 'ultimos_30_dias';
  ownerFilter = 'todos';
  biLoading = false;
  biError = '';
  biData: BiPayload | null = null;

  constructor(
    public data: JurisflowDataService,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.data.loadRemoteContext(true);
    await this.loadBi();
  }

  get tabs(): string[] {
    return ['Visao geral', 'BI juridico', 'Produtividade', 'Financeiro', 'Processos', 'Clientes', 'Agenda'];
  }

  get rangeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'mes_atual', label: 'Este mes' },
      { value: 'ultimos_30_dias', label: 'Ultimos 30 dias' },
      { value: 'ano_atual', label: 'Ano atual' },
      { value: 'todos', label: 'Todo o periodo' }
    ];
  }

  get ownerOptions(): string[] {
    const owners = new Set<string>();
    for (const task of this.data.tasks) {
      if (task.responsavel) {
        owners.add(task.responsavel);
      }
    }
    for (const communication of this.data.communications) {
      if (communication.ownerName) {
        owners.add(communication.ownerName);
      }
    }
    return Array.from(owners).sort((a, b) => a.localeCompare(b));
  }

  get rangeLabel(): string {
    return this.rangeOptions.find((option) => option.value === this.rangeFilter)?.label ?? 'Periodo atual';
  }

  get activeProcessesCount(): number {
    return this.data.processes.filter((item) => item.status !== 'Arquivado').length;
  }

  get archivedProcessesCount(): number {
    return this.data.processes.filter((item) => item.status === 'Arquivado').length;
  }

  get topClientRows(): Array<{ name: string; value: string }> {
    const biTop = this.biData?.top_clients_by_cases ?? [];
    if (biTop.length) {
      return biTop.map((client, index) => ({
        name: `${index + 1}. ${client.label}`,
        value: `${client.total} processo(s)`
      }));
    }

    return this.data.clients.slice(0, 5).map((client, index) => ({
      name: `${index + 1}. ${client.nome}`,
      value: 'Sem BI consolidado'
    }));
  }

  get areaTotal(): number {
    const rows = this.biData?.cases_by_area ?? [];
    if (rows.length) {
      return rows.reduce((sum, slice) => sum + slice.total, 0);
    }
    return this.data.donutSeries.reduce((sum, slice) => sum + slice.y, 0);
  }

  get completedTasksCount(): number {
    return this.data.tasks.filter((task) => task.status.toLowerCase().includes('conclu')).length;
  }

  get hearingsCount(): number {
    return this.data.upcomingHearings.length + this.data.todayAgenda.filter((item) => item.title.toLowerCase().includes('audi')).length;
  }

  get newClientsCount(): number {
    return this.data.clients.filter((client) => this.matchesRange(client.cadastro)).length;
  }

  get productivityRows(): Array<{ name: string; count: number; width: string }> {
    const biRows = this.biData?.productivity ?? [];
    if (biRows.length) {
      const max = Math.max(...biRows.map((row) => row.total), 1);
      return biRows.map((row) => ({
        name: row.label,
        count: row.total,
        width: `${Math.max(22, (row.total / max) * 100)}%`
      }));
    }

    const counts = new Map<string, number>();
    for (const task of this.data.tasks) {
      const name = task.responsavel || 'Equipe';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    const rows = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count);

    const max = Math.max(...rows.map((row) => row.count), 1);
    return rows.map((row) => ({
      ...row,
      width: `${Math.max(22, (row.count / max) * 100)}%`
    }));
  }

  get processStatusRows(): Array<{ label: string; count: number; color: string }> {
    const biRows = this.biData?.cases_by_status ?? [];
    if (biRows.length) {
      return biRows.map((row, index) => ({
        label: row.label,
        count: row.total,
        color: ['dot', 'dot green', 'dot gold', 'dot purple', 'dot blue'][index % 5]
      }));
    }

    return [
      { label: 'Ativos', count: this.activeProcessesCount, color: 'dot' },
      { label: 'Arquivados', count: this.archivedProcessesCount, color: 'dot green' },
      { label: 'Clientes', count: this.data.clients.length, color: 'dot gold' },
      { label: 'Itens da agenda', count: this.data.tasks.length + this.data.todayAgenda.length + this.data.upcomingHearings.length, color: 'dot purple' }
    ];
  }

  get biAreaRows(): BiRow[] {
    return this.biData?.cases_by_area ?? [];
  }

  get biAgendaRows(): BiRow[] {
    return this.biData?.agenda_by_type ?? [];
  }

  get availableReports(): Array<{ title: string; description: string; route: string }> {
    return [
      { title: 'Relatorio de processos', description: 'Visao por status, area e responsavel.', route: '/plataforma/processos' },
      { title: 'Relatorio financeiro', description: 'Receitas, despesas, faturamento e recebimentos.', route: '/plataforma/financeiro' },
      { title: 'Relatorio de produtividade', description: 'Desempenho da equipe e itens concluidos da agenda.', route: '/plataforma/agenda' },
      { title: 'Relatorio de clientes', description: 'Novos clientes, ativos e historico de atendimentos.', route: '/plataforma/clientes' },
      { title: 'BI juridico', description: 'Paineis executivos com distribuicao, produtividade e clientes de maior volume.', route: '/plataforma/relatorios' }
    ];
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  openRoute(route: string): void {
    void this.router.navigateByUrl(route);
  }

  exportReport(): void {
    const payload = {
      generated_at: new Date().toISOString(),
      active_tab: this.activeTab,
      filters: {
        range: this.rangeLabel,
        owner: this.ownerFilter
      },
      overview: {
        active_processes: this.activeProcessesCount,
        archived_processes: this.archivedProcessesCount,
        hearings: this.hearingsCount,
        completed_items: this.completedTasksCount,
        new_clients: this.newClientsCount
      },
      bi: this.biData,
      top_clients: this.topClientRows,
      productivity: this.productivityRows.map((row) => ({ name: row.name, count: row.count })),
      process_status: this.processStatusRows.map((row) => ({ label: row.label, count: row.count }))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `jurisflow-relatorio-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  openSuggestedModule(): void {
    const routeMap: Record<string, string> = {
      'Visao geral': '/plataforma/dashboard',
      'BI juridico': '/plataforma/relatorios',
      'Produtividade': '/plataforma/agenda',
      'Financeiro': '/plataforma/financeiro',
      'Processos': '/plataforma/processos',
      'Clientes': '/plataforma/clientes',
      'Agenda': '/plataforma/agenda'
    };
    this.openRoute(routeMap[this.activeTab] ?? '/plataforma/relatorios');
  }

  private matchesRange(value: string): boolean {
    if (this.rangeFilter === 'todos') {
      return true;
    }

    const parsed = this.parseBrazilianDate(value);
    if (!parsed) {
      return false;
    }

    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (this.rangeFilter === 'mes_atual') {
      return parsed.getMonth() === today.getMonth() && parsed.getFullYear() === today.getFullYear();
    }

    if (this.rangeFilter === 'ano_atual') {
      return parsed.getFullYear() === today.getFullYear();
    }

    const threshold = new Date(startToday);
    threshold.setDate(startToday.getDate() - 30);
    return parsed >= threshold;
  }

  private parseBrazilianDate(value: string): Date | null {
    const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) {
      return null;
    }

    const [, day, month, year] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private async loadBi(): Promise<void> {
    this.biLoading = true;
    this.biError = '';

    try {
      const response = await firstValueFrom(this.api.getPath<BiPayload>('reports/bi'));
      this.biData = response.data ?? null;
    } catch (error) {
      this.biError = error instanceof Error ? error.message : 'Nao foi possivel carregar o BI juridico.';
    } finally {
      this.biLoading = false;
    }
  }
}
