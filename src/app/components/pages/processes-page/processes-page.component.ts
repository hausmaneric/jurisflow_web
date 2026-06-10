import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { TaskRow } from '../../../models/jurisflow.models';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';
import { JurisflowDataService } from '../../../services/jurisflow-data.service';

@Component({
  selector: 'app-processes-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, ConfirmDialogComponent],
  templateUrl: './processes-page.component.html',
  styleUrl: './processes-page.component.scss'
})
export class ProcessesPageComponent implements OnInit {
  searchTerm = '';
  pendingRemoval: any | null = null;

  constructor(
    public data: JurisflowDataService,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.data.loadRemoteContext();
  }

  get filteredProcesses(): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.data.processes.filter((process) => {
      const haystack = [
        process.processo,
        process.cliente,
        process.area,
        process.vara,
        process.fase,
        process.status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return !term || haystack.includes(term);
    });
  }

  get totalProcesses(): number {
    return this.filteredProcesses.length;
  }

  get activeProcesses(): number {
    return this.filteredProcesses.filter((process) => process.status === 'Em andamento').length;
  }

  get archivedProcesses(): number {
    return this.filteredProcesses.filter((process) => process.status === 'Arquivado').length;
  }

  get suspendedProcesses(): number {
    return this.filteredProcesses.filter((process) => process.status === 'Suspenso').length;
  }

  get featuredProcess(): any | null {
    return this.filteredProcesses[0] ?? this.data.processes[0] ?? null;
  }

  get featuredTasks(): any[] {
    const featured = this.featuredProcess;
    if (!featured) {
      return [];
    }

    return this.data.tasks
      .filter((task) => String(task.processo ?? '').includes(String(featured.processo ?? '')))
      .slice(0, 4);
  }

  openCreate(): void {
    void this.router.navigate(['/plataforma/processos/novo']);
  }

  openDetails(process: any): void {
    const id = process?.id ?? process?.uuid ?? '';
    if (!id) {
      return;
    }

    void this.router.navigate(['/plataforma/processos', id]);
  }

  openEdit(process: any): void {
    const id = process?.id ?? process?.uuid ?? '';
    if (!id) {
      return;
    }

    void this.router.navigate(['/plataforma/processos', id, 'editar']);
  }

  openTask(task: TaskRow): void {
    const id = task?.agendaItemId ?? task?.id ?? '';
    if (!id) {
      return;
    }

    void this.router.navigate(['/plataforma/agenda', id], {
      queryParams: { kind: 'task' }
    });
  }

  requestRemove(process: any): void {
    if (!process?.id) {
      return;
    }
    this.pendingRemoval = process;
  }

  cancelRemove(): void {
    this.pendingRemoval = null;
  }

  async confirmRemove(): Promise<void> {
    const process = this.pendingRemoval;
    const id = process?.id ?? '';
    if (!id) {
      return;
    }

    this.pendingRemoval = null;
    await firstValueFrom(this.api.delete('cases', id));
    await this.data.loadRemoteContext(true);
  }
}
