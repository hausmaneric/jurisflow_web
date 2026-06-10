import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';
import { JurisflowDataService } from '../../../services/jurisflow-data.service';

type AgendaViewMode = 'calendario' | 'lista' | 'kanban' | 'prazos';
type CalendarDay = {
  date: Date;
  label: number;
  isOutsideMonth: boolean;
  isToday: boolean;
  hasItems: boolean;
};

@Component({
  selector: 'app-agenda-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, ConfirmDialogComponent],
  templateUrl: './agenda-page.component.html',
  styleUrl: './agenda-page.component.scss'
})
export class AgendaPageComponent implements OnInit {
  readonly slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00'];
  readonly viewOptions: AgendaViewMode[] = ['calendario', 'lista', 'kanban', 'prazos'];

  moduleView: AgendaViewMode = 'calendario';
  calendarView = 'dia';
  typeFilter = 'todos';
  statusFilter = 'todos';
  priorityFilter = 'todos';
  ownerFilter = 'todos';
  currentMonth = this.startOfMonth(new Date());
  selectedDate = this.startOfDay(new Date());
  pendingRemoval: any | null = null;

  contextClientId = '';
  contextCaseId = '';

  constructor(
    public data: JurisflowDataService,
    private router: Router,
    private route: ActivatedRoute,
    private api: JurisflowApiService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.data.loadRemoteContext();
    this.route.queryParamMap.subscribe((params) => {
      this.contextClientId = params.get('client') ?? '';
      this.contextCaseId = params.get('case') ?? '';
    });
  }

  get contextLabel(): string {
    if (this.contextCaseId && this.contextClientId) {
      return 'Agenda filtrada pelo cliente e pelo processo do contexto atual.';
    }
    if (this.contextCaseId) {
      return 'Agenda filtrada pelo processo do contexto atual.';
    }
    if (this.contextClientId) {
      return 'Agenda filtrada pelo cliente do contexto atual.';
    }
    return '';
  }

  get unifiedItems(): any[] {
    return this.data.agendaItems
      .map((item) => ({
        id: item.id,
        sourceId: item.sourceId,
        source: item.itemKind,
        clientId: item.clientId,
        caseId: item.caseId,
        clientName: item.clientName,
        title: item.title,
        type: item.type,
        status: item.status,
        priority: item.priority,
        owner: item.owner,
        process: item.process,
        dueDate: item.dueDate,
        timeLabel: item.timeLabel,
        location: item.location,
        color: item.color
      }))
      .filter((item) => {
        const matchesType =
          this.typeFilter === 'todos' ||
          String(item.type).toLowerCase().includes(this.typeFilter) ||
          (this.typeFilter === 'tarefa' && item.source === 'task');
        const matchesStatus = this.statusFilter === 'todos' || String(item.status).toLowerCase() === this.statusFilter;
        const matchesPriority = this.priorityFilter === 'todos' || String(item.priority).toLowerCase() === this.priorityFilter;
        const matchesOwner = this.ownerFilter === 'todos' || String(item.owner) === this.ownerFilter;
        const matchesClient = !this.contextClientId || String(item.clientId ?? '') === this.contextClientId;
        const matchesCase = !this.contextCaseId || String(item.caseId ?? '') === this.contextCaseId;
        return matchesType && matchesStatus && matchesPriority && matchesOwner && matchesClient && matchesCase;
      });
  }

  get agendaEvents(): any[] {
    return this.unifiedItems.filter((item) => item.source === 'appointment' && item.timeLabel);
  }

  get selectedDayItems(): any[] {
    return this.unifiedItems.filter((item) => this.sameDay(this.itemDate(item), this.selectedDate));
  }

  get selectedDayEvents(): any[] {
    return this.agendaEvents.filter((item) => this.sameDay(this.itemDate(item), this.selectedDate));
  }

  get upcomingItems(): any[] {
    const today = this.startOfDay(new Date());
    return this.unifiedItems
      .slice()
      .sort((left, right) => this.dateTime(left).getTime() - this.dateTime(right).getTime())
      .filter((item) => this.dateTime(item) >= today)
      .slice(0, 5);
  }

  get monthLabel(): string {
    return this.currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  get selectedDateLabel(): string {
    return this.selectedDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  get calendarDays(): CalendarDay[] {
    const firstDay = this.startOfMonth(this.currentMonth);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date,
        label: date.getDate(),
        isOutsideMonth: date.getMonth() !== this.currentMonth.getMonth(),
        isToday: this.sameDay(date, new Date()),
        hasItems: this.unifiedItems.some((item) => this.sameDay(this.itemDate(item), date))
      };
    });
  }

  get taskItems(): any[] {
    return this.unifiedItems.filter((item) => item.source === 'task');
  }

  get pendingTasks(): any[] {
    return this.taskItems.filter((task) => String(task.status).toLowerCase() === 'pendente');
  }

  get inProgressTasks(): any[] {
    return this.taskItems.filter((task) => String(task.status).toLowerCase() === 'em andamento');
  }

  get completedTasks(): any[] {
    return this.taskItems.filter((task) => String(task.status).toLowerCase().includes('conclu'));
  }

  get overdueTasks(): any[] {
    return this.taskItems.filter((task) => String(task.status).toLowerCase() === 'atrasada');
  }

  get deadlineItems(): any[] {
    return this.taskItems
      .filter((task) => String(task.priority).toLowerCase() === 'alta' || String(task.status).toLowerCase() === 'atrasada')
      .slice()
      .sort((left, right) => String(left.dueDate).localeCompare(String(right.dueDate)));
  }

  get owners(): string[] {
    return Array.from(new Set(this.taskItems.map((task) => task.owner).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  eventsForSlot(slot: string): any[] {
    return this.selectedDayEvents.filter((event) => event.timeLabel === slot);
  }

  setModuleView(mode: AgendaViewMode): void {
    this.moduleView = mode;
  }

  setCalendarView(mode: string): void {
    this.calendarView = mode;
  }

  selectDay(day: CalendarDay): void {
    this.selectedDate = this.startOfDay(day.date);
    if (day.isOutsideMonth) {
      this.currentMonth = this.startOfMonth(day.date);
    }
  }

  previousMonth(): void {
    this.currentMonth = this.addMonths(this.currentMonth, -1);
  }

  nextMonth(): void {
    this.currentMonth = this.addMonths(this.currentMonth, 1);
  }

  goToday(): void {
    const today = new Date();
    this.selectedDate = this.startOfDay(today);
    this.currentMonth = this.startOfMonth(today);
  }

  async clearContext(): Promise<void> {
    this.contextClientId = '';
    this.contextCaseId = '';
    await this.router.navigate(['/plataforma/agenda']);
  }

  openCreateAppointment(): void {
    void this.router.navigate(['/plataforma/agenda/novo'], {
      queryParams: {
        client: this.contextClientId || null,
        case: this.contextCaseId || null
      },
      queryParamsHandling: 'merge'
    });
  }

  openCreateTask(): void {
    void this.router.navigate(['/plataforma/agenda/novo'], {
      queryParams: {
        kind: 'task',
        client: this.contextClientId || null,
        case: this.contextCaseId || null
      }
    });
  }

  openItemDetails(item: any): void {
    if (!item?.id) {
      return;
    }

    void this.router.navigate(['/plataforma/agenda', item.id], {
      queryParams: item.source === 'task' ? { kind: 'task' } : undefined
    });
  }

  openItemEdit(item: any): void {
    if (!item?.id) {
      return;
    }

    void this.router.navigate(['/plataforma/agenda', item.id, 'editar'], {
      queryParams: item.source === 'task' ? { kind: 'task' } : undefined
    });
  }

  requestRemoveItem(item: any): void {
    if (!item?.id) {
      return;
    }
    this.pendingRemoval = item;
  }

  cancelRemove(): void {
    this.pendingRemoval = null;
  }

  async confirmRemove(): Promise<void> {
    const item = this.pendingRemoval;
    const id = item?.id ?? '';
    if (!id) {
      return;
    }

    this.pendingRemoval = null;
    await firstValueFrom(this.api.delete('agenda-items', id));
    await this.data.loadRemoteContext(true);
  }

  private itemDate(item: any): Date | null {
    return this.parseBrazilianDate(item?.dueDate) ?? this.parseTimeFallback(item?.timeLabel);
  }

  private dateTime(item: any): Date {
    return this.itemDate(item) ?? new Date(8640000000000000);
  }

  private parseBrazilianDate(value?: string): Date | null {
    const match = String(value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) {
      return null;
    }

    const [, day, month, year] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : this.startOfDay(parsed);
  }

  private parseTimeFallback(value?: string): Date | null {
    if (!value || value === '--:--') {
      return null;
    }
    return this.startOfDay(new Date());
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private startOfMonth(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }

  private sameDay(left: Date | null, right: Date | null): boolean {
    if (!left || !right) {
      return false;
    }
    return this.startOfDay(left).getTime() === this.startOfDay(right).getTime();
  }

  private addMonths(value: Date, amount: number): Date {
    return new Date(value.getFullYear(), value.getMonth() + amount, 1);
  }
}
