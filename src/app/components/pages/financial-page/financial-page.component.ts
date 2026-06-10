import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';
import { JurisflowDataService } from '../../../services/jurisflow-data.service';

interface FinancialSummaryPayload {
  totals?: {
    total_entries?: number;
    income_entries?: number;
    expense_entries?: number;
    pending_entries?: number;
    overdue_entries?: number;
    total_income?: number;
    total_expense?: number;
    balance?: number;
  };
  health_score?: number;
  risk_level?: string;
  by_category?: Array<{ label: string; total_entries: number; total_amount: number }>;
  by_account?: Array<{ label: string; total_entries: number; balance: number }>;
}

@Component({
  selector: 'app-financial-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, RouterModule, ConfirmDialogComponent],
  templateUrl: './financial-page.component.html',
  styleUrl: './financial-page.component.scss'
})
export class FinancialPageComponent implements OnInit {
  searchTerm = '';
  typeFilter = 'todos';
  statusFilter = 'todos';
  categoryFilter = 'todas';
  periodFilter = 'todos';
  loading = false;
  deletingId = '';
  errorMessage = '';
  summary: FinancialSummaryPayload | null = null;
  selectedEntryIndex = 0;
  pendingRemoval: { id?: string; descricao: string } | null = null;

  constructor(
    public data: JurisflowDataService,
    private router: Router,
    private route: ActivatedRoute,
    private api: JurisflowApiService
  ) {}

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((params) => {
      this.searchTerm = params.get('busca') ?? '';
    });
    await this.reloadFinancialData();
  }

  get incomeEntries() {
    return this.filteredBaseEntries.filter((entry) => !entry.valor.startsWith('-'));
  }

  get expenseEntries() {
    return this.filteredBaseEntries.filter((entry) => entry.valor.startsWith('-'));
  }

  get filteredBaseEntries() {
    return this.data.financialEntries.filter((entry) => this.matchesPeriod(entry.data));
  }

  get totalIncomeValue(): number {
    return this.incomeEntries.reduce((sum, entry) => sum + this.parseCurrency(entry.valor), 0);
  }

  get totalExpenseValue(): number {
    return Math.abs(this.expenseEntries.reduce((sum, entry) => sum + this.parseCurrency(entry.valor), 0));
  }

  get balanceValue(): number {
    return this.totalIncomeValue - this.totalExpenseValue;
  }

  get totalIncome(): string {
    if (this.summary?.totals?.total_income !== undefined) {
      return this.formatCurrency(Number(this.summary.totals.total_income || 0));
    }
    return this.formatCurrency(this.totalIncomeValue);
  }

  get totalExpense(): string {
    if (this.summary?.totals?.total_expense !== undefined) {
      return this.formatCurrency(Number(this.summary.totals.total_expense || 0));
    }
    return this.formatCurrency(this.totalExpenseValue);
  }

  get balance(): string {
    if (this.summary?.totals?.balance !== undefined) {
      return this.formatCurrency(Number(this.summary.totals.balance || 0));
    }
    return this.formatCurrency(this.balanceValue);
  }

  get filteredEntries() {
    const term = this.searchTerm.trim().toLowerCase();
    return this.filteredBaseEntries.filter((entry) => {
      const matchesType = this.typeFilter === 'todos' || entry.tipo.toLowerCase() === this.typeFilter;
      const matchesStatus = this.statusFilter === 'todos' || entry.status.toLowerCase() === this.statusFilter;
      const matchesCategory = this.categoryFilter === 'todas' || entry.categoria === this.categoryFilter;
      const matchesSearch =
        !term ||
        [entry.descricao, entry.categoria, entry.clienteProcesso, entry.conta, entry.notes]
          .join(' ')
          .toLowerCase()
          .includes(term);

      return matchesType && matchesStatus && matchesCategory && matchesSearch;
    });
  }

  get selectedEntry() {
    return this.filteredEntries[this.selectedEntryIndex] ?? this.filteredEntries[0] ?? null;
  }

  get removalMessage(): string {
    const description = this.pendingRemoval?.descricao || 'selecionado';
    return `Deseja remover o lancamento "${description}"? Esta acao nao pode ser desfeita.`;
  }

  get categories(): string[] {
    return Array.from(new Set(this.data.financialEntries.map((entry) => entry.categoria))).sort((a, b) => a.localeCompare(b));
  }

  get pendingEntries() {
    return this.filteredBaseEntries.filter((entry) => {
      const status = entry.status.toLowerCase();
      return status !== 'pago' && status !== 'recebido';
    });
  }

  get pendingEntriesCount(): number {
    if (this.summary?.totals?.pending_entries !== undefined) {
      return Number(this.summary.totals.pending_entries || 0);
    }
    return this.pendingEntries.length;
  }

  get pendingAmountValue(): number {
    return this.pendingEntries.reduce((sum, entry) => sum + Math.abs(this.parseCurrency(entry.valor)), 0);
  }

  get pendingAmount(): string {
    return this.formatCurrency(this.pendingAmountValue);
  }

  get marginPercentage(): number {
    if (!this.totalIncomeValue) {
      return 0;
    }
    return Math.round((this.balanceValue / this.totalIncomeValue) * 100);
  }

  get healthScore(): number {
    if (this.summary?.health_score !== undefined) {
      return Number(this.summary.health_score || 0);
    }
    let score = 92;
    if (this.pendingEntriesCount >= 4) score -= 18;
    else if (this.pendingEntriesCount >= 2) score -= 10;
    if (this.balanceValue < 0) score -= 25;
    else if (this.marginPercentage < 20) score -= 10;
    if (this.totalExpenseValue > this.totalIncomeValue * 0.85) score -= 12;
    return Math.max(25, Math.min(99, score));
  }

  get riskLevel(): string {
    if (this.summary?.risk_level) return this.summary.risk_level;
    if (this.balanceValue < 0 || this.pendingEntriesCount >= 4) return 'alto';
    if (this.marginPercentage < 20 || this.pendingEntriesCount >= 2) return 'medio';
    return 'baixo';
  }

  get executiveSummary(): string {
    return `O financeiro atual soma ${this.totalIncome} em receitas, ${this.totalExpense} em despesas e saldo de ${this.balance}. Existem ${this.pendingEntriesCount} pendencia(s) em aberto no recorte carregado.`;
  }

  get financialAlerts(): string[] {
    const alerts: string[] = [];
    if (this.balanceValue < 0) {
      alerts.push('O saldo atual esta negativo e exige atencao imediata.');
    }
    if (this.pendingEntriesCount > 0) {
      alerts.push(`Existem ${this.pendingEntriesCount} lancamento(s) pendente(s), somando ${this.pendingAmount}.`);
    }
    const highestExpense = this.categoryBreakdown.find((entry) => entry.raw < 0);
    if (highestExpense) {
      alerts.push(`A categoria ${highestExpense.categoria} concentra a maior pressao de saida no momento.`);
    }
    if (!alerts.length) {
      alerts.push('Nenhum alerta financeiro critico identificado no recorte atual.');
    }
    return alerts;
  }

  get financialRecommendations(): string[] {
    const recommendations: string[] = [];
    if (this.pendingEntriesCount > 0) {
      recommendations.push('Priorizar cobranca ou baixa dos titulos pendentes para reduzir pressao de caixa.');
    }
    if (this.marginPercentage < 20) {
      recommendations.push('Revisar despesas operacionais e categorias de maior impacto para recuperar margem.');
    }
    if (this.balanceValue > 0 && this.pendingEntriesCount === 0) {
      recommendations.push('Aproveitar o saldo saudavel para reforcar reserva operacional ou investimentos do escritorio.');
    }
    if (!recommendations.length) {
      recommendations.push('Manter o acompanhamento financeiro diario e revisar o fechamento no fim do periodo.');
    }
    return recommendations;
  }

  get topAccounts(): Array<{ conta: string; total: string; raw: number }> {
    const source = this.summary?.by_account?.length
      ? this.summary.by_account.map((entry) => ({
          conta: entry.label,
          raw: Number(entry.balance || 0),
          total: this.formatCurrency(Number(entry.balance || 0))
        }))
      : null;

    if (source) {
      return source.slice(0, 4);
    }

    const totals = new Map<string, number>();
    for (const entry of this.filteredEntries) {
      totals.set(entry.conta, (totals.get(entry.conta) ?? 0) + this.parseCurrency(entry.valor));
    }

    return Array.from(totals.entries())
      .map(([conta, raw]) => ({ conta, raw, total: this.formatCurrency(raw) }))
      .sort((left, right) => Math.abs(right.raw) - Math.abs(left.raw))
      .slice(0, 4);
  }

  get categoryBreakdown(): Array<{ categoria: string; total: string; raw: number; count: number }> {
    if (this.summary?.by_category?.length) {
      return this.summary.by_category.map((entry) => ({
        categoria: entry.label,
        raw: Number(entry.total_amount || 0),
        count: Number(entry.total_entries || 0),
        total: this.formatCurrency(Number(entry.total_amount || 0))
      }));
    }

    const totals = new Map<string, { raw: number; count: number }>();
    for (const entry of this.filteredEntries) {
      const current = totals.get(entry.categoria) ?? { raw: 0, count: 0 };
      current.raw += this.parseCurrency(entry.valor);
      current.count += 1;
      totals.set(entry.categoria, current);
    }

    return Array.from(totals.entries())
      .map(([categoria, data]) => ({
        categoria,
        raw: data.raw,
        count: data.count,
        total: this.formatCurrency(data.raw)
      }))
      .sort((left, right) => Math.abs(right.raw) - Math.abs(left.raw));
  }

  get incomeBarHeight(): string {
    const max = Math.max(this.totalIncomeValue, this.totalExpenseValue, 1);
    return `${Math.max(18, (this.totalIncomeValue / max) * 100)}%`;
  }

  get expenseBarHeight(): string {
    const max = Math.max(this.totalIncomeValue, this.totalExpenseValue, 1);
    return `${Math.max(18, (this.totalExpenseValue / max) * 100)}%`;
  }

  get balanceBarHeight(): string {
    const max = Math.max(this.totalIncomeValue, this.totalExpenseValue, Math.abs(this.balanceValue), 1);
    return `${Math.max(18, (Math.abs(this.balanceValue) / max) * 100)}%`;
  }

  selectEntry(index: number): void {
    this.selectedEntryIndex = index;
  }

  openEntryContext(entry: { clientId?: string; caseId?: string; clienteProcesso: string }): void {
    if (entry.caseId) {
      void this.router.navigate(['/plataforma/processos', entry.caseId]);
      return;
    }

    if (entry.clientId) {
      void this.router.navigate(['/plataforma/clientes', entry.clientId]);
      return;
    }

    const value = entry.clienteProcesso || '';
    if (/^\d/.test(value)) {
      void this.router.navigate(['/plataforma/processos']);
      return;
    }

    void this.router.navigate(['/plataforma/clientes']);
  }

  openCreate(): void {
    void this.router.navigate(['/plataforma/financeiro/novo']);
  }

  openEdit(entry: { id?: string }): void {
    if (!entry.id) {
      return;
    }
    void this.router.navigate(['/plataforma/financeiro', entry.id, 'editar']);
  }

  requestRemove(entry: { id?: string; descricao: string }): void {
    if (!entry.id || this.deletingId) {
      return;
    }
    this.pendingRemoval = entry;
  }

  cancelRemove(): void {
    this.pendingRemoval = null;
  }

  async confirmRemove(): Promise<void> {
    const entry = this.pendingRemoval;
    if (!entry?.id || this.deletingId) {
      return;
    }

    this.pendingRemoval = null;
    this.deletingId = entry.id;
    this.errorMessage = '';
    try {
      await firstValueFrom(this.api.delete('financial-entries', entry.id));
      await this.reloadFinancialData();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel remover o lancamento.';
    } finally {
      this.deletingId = '';
    }
  }

  async reloadFinancialData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      await this.data.loadRemoteContext(true);
      await this.loadFinancialSummary();
      this.selectedEntryIndex = 0;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel atualizar o financeiro.';
    } finally {
      this.loading = false;
    }
  }

  exportFinancialReport(): void {
    const payload = {
      generated_at: new Date().toISOString(),
      period: this.periodFilter,
      totals: {
        income: this.totalIncome,
        expense: this.totalExpense,
        balance: this.balance,
        pending_amount: this.pendingAmount
      },
      entries: this.filteredEntries
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `jurisflow-financeiro-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  openFinancialModule(): void {
    void this.router.navigate(['/plataforma/financeiro']);
  }

  openCategories(): void {
    void this.router.navigate(['/plataforma/configuracoes']);
  }

  async refreshSummary(): Promise<void> {
    this.loading = true;
    try {
      await this.loadFinancialSummary();
      this.selectedEntryIndex = 0;
    } finally {
      this.loading = false;
    }
  }

  private async loadFinancialSummary(): Promise<void> {
    const params = this.buildSummaryParams();
    const response = await firstValueFrom(this.api.getPath<FinancialSummaryPayload>('reports/financial-summary', params));
    this.summary = response.data ?? null;
  }

  private buildSummaryParams(): Record<string, string> {
    const params: Record<string, string> = {};
    if (this.typeFilter !== 'todos') {
      params['entry_type'] = this.typeFilter === 'receita' ? 'income' : 'expense';
    }
    if (this.statusFilter !== 'todos') {
      params['status'] = this.statusFilter;
    }
    if (this.categoryFilter !== 'todas') {
      params['category'] = this.categoryFilter;
    }

    const today = new Date();
    const formatDate = (value: Date) => value.toISOString().slice(0, 10);
    if (this.periodFilter === 'hoje') {
      params['date_from'] = formatDate(today);
      params['date_to'] = formatDate(today);
    } else if (this.periodFilter === 'mes_atual') {
      params['date_from'] = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
      params['date_to'] = formatDate(today);
    } else if (this.periodFilter === 'ultimos_30_dias') {
      const threshold = new Date(today);
      threshold.setDate(threshold.getDate() - 30);
      params['date_from'] = formatDate(threshold);
      params['date_to'] = formatDate(today);
    }

    return params;
  }

  private matchesPeriod(value: string): boolean {
    if (this.periodFilter === 'todos') {
      return true;
    }

    const parsed = this.parseBrazilianDate(value);
    if (!parsed) {
      return true;
    }

    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (this.periodFilter === 'mes_atual') {
      return parsed.getMonth() === today.getMonth() && parsed.getFullYear() === today.getFullYear();
    }

    if (this.periodFilter === 'ultimos_30_dias') {
      const threshold = new Date(startToday);
      threshold.setDate(threshold.getDate() - 30);
      return parsed >= threshold;
    }

    if (this.periodFilter === 'hoje') {
      return parsed.toDateString() === startToday.toDateString();
    }

    return true;
  }

  private parseBrazilianDate(value: string): Date | null {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) {
      return null;
    }

    const [, day, month, year] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseCurrency(value: string): number {
    return Number(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
}
