import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ClientRow } from '../../../models/jurisflow.models';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';
import { JurisflowDataService } from '../../../services/jurisflow-data.service';
import { LoginService } from '../../../services/login.service';

type ClientViewMode = 'lista' | 'kanban';

@Component({
  selector: 'app-clients-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, DropDownListModule, TextBoxModule, ConfirmDialogComponent],
  templateUrl: './clients-page.component.html',
  styleUrl: './clients-page.component.scss'
})
export class ClientsPageComponent implements OnInit {
  readonly typeOptions = ['Todos', 'Pessoa Fisica', 'Pessoa Juridica'];
  readonly funnelStages = [
    { key: 'lead', label: 'Lead', helper: 'Primeiro contato e triagem' },
    { key: 'proposta', label: 'Proposta', helper: 'Negociacao e envio comercial' },
    { key: 'active', label: 'Contratado', helper: 'Cliente ativo no escritorio' },
    { key: 'archived', label: 'Finalizado', helper: 'Casos encerrados ou sem avanco' }
  ];

  viewMode: ClientViewMode = 'lista';
  searchTerm = '';
  pendingRemoval: ClientRow | null = null;

  constructor(
    public data: JurisflowDataService,
    private router: Router,
    private route: ActivatedRoute,
    private api: JurisflowApiService,
    private loginService: LoginService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.data.loadRemoteContext();
    this.route.queryParamMap.subscribe((params) => {
      this.searchTerm = params.get('busca') ?? '';
    });
  }

  get clients(): ClientRow[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.data.clients;
    }

    return this.data.clients.filter((client) =>
      [client.nome, client.contato, client.email, client.phone, client.notes, client.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }

  get leadCaptureUrl(): string {
    const companyCode = this.loginService.getAccountCode();
    return companyCode ? `${window.location.origin}/escritorio/${companyCode}/contato` : '';
  }

  clientsByStage(stageKey: string): ClientRow[] {
    return this.clients.filter((client) => this.stageFor(client) === stageKey);
  }

  updateSearch(term: string): void {
    this.searchTerm = term;
  }

  countByStage(stageKey: string): number {
    return this.clientsByStage(stageKey).length;
  }

  stageFor(client: ClientRow): string {
    const status = String(client.statusKey ?? client.status ?? '').toLowerCase();
    if (status.includes('proposta') || status.includes('proposal')) {
      return 'proposta';
    }
    if (status.includes('lead')) {
      return 'lead';
    }
    if (status.includes('archive') || status.includes('final') || status.includes('inactive') || status.includes('inativo')) {
      return 'archived';
    }
    return 'active';
  }

  async moveStage(client: ClientRow, stage: string): Promise<void> {
    const id = client.id ?? '';
    if (!id) {
      return;
    }

    await firstValueFrom(this.api.update('clients', id, { status: stage }));
    await this.data.loadRemoteContext(true);
  }

  openCreate(): void {
    void this.router.navigate(['/plataforma/clientes/novo']);
  }

  openDetails(client: ClientRow): void {
    const id = client?.id ?? '';
    if (!id) {
      return;
    }
    void this.router.navigate(['/plataforma/clientes', id]);
  }

  openEdit(client: ClientRow): void {
    const id = client?.id ?? '';
    if (!id) {
      return;
    }
    void this.router.navigate(['/plataforma/clientes', id, 'editar']);
  }

  requestRemove(client: ClientRow): void {
    if (!client?.id) {
      return;
    }
    this.pendingRemoval = client;
  }

  cancelRemove(): void {
    this.pendingRemoval = null;
  }

  async confirmRemove(): Promise<void> {
    const client = this.pendingRemoval;
    const id = client?.id ?? '';
    if (!id) {
      return;
    }

    this.pendingRemoval = null;
    await firstValueFrom(this.api.delete('clients', id));
    await this.data.loadRemoteContext(true);
  }

  openLeadCapturePage(): void {
    if (!this.leadCaptureUrl) {
      return;
    }
    window.open(this.leadCaptureUrl, '_blank', 'noopener');
  }
}
