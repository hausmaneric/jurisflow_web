import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TaskRow } from '../../../models/jurisflow.models';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';
import { JurisflowDataService } from '../../../services/jurisflow-data.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent implements OnInit {
  dashboardInsights: any = null;

  constructor(
    public data: JurisflowDataService,
    private router: Router,
    private api: JurisflowApiService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.data.loadRemoteContext(true);

    try {
      const response = await firstValueFrom(this.api.getPath<any>('ai/dashboard-insights'));
      this.dashboardInsights = response?.data ?? null;
    } catch {
      this.dashboardInsights = null;
    }
  }

  get completedTasksCount(): number {
    return this.data.tasks.filter((task) => String(task.status).toLowerCase().includes('conclu')).length;
  }

  get openTasksCount(): number {
    return this.data.tasks.filter((task) => !String(task.status).toLowerCase().includes('conclu')).length;
  }

  get createdDocumentsCount(): number {
    return this.data.documents.length;
  }

  get createdProcessesCount(): number {
    return this.data.processes.length;
  }

  get totalProcessArea(): number {
    return this.data.donutSeries.reduce((sum, slice) => sum + slice.y, 0);
  }

  goTo(route: string): void {
    void this.router.navigateByUrl(route);
  }

  openAgendaItem(itemId?: string): void {
    if (!itemId) {
      void this.router.navigate(['/plataforma/agenda']);
      return;
    }

    void this.router.navigate(['/plataforma/agenda', itemId]);
  }

  openTask(task?: TaskRow): void {
    if (!task) {
      void this.router.navigate(['/plataforma/agenda'], { queryParams: { kind: 'task' } });
      return;
    }

    void this.router.navigate(['/plataforma/agenda', task.agendaItemId ?? task.id], {
      queryParams: { kind: 'task' }
    });
  }
}
