import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { FormsModule } from '@angular/forms';
import { JurisflowApiService } from '../../services/jurisflow-api.service';

@Component({
  selector: 'app-signature-public-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, FormsModule],
  templateUrl: './signature-public-page.component.html',
  styleUrl: './signature-public-page.component.scss'
})
export class SignaturePublicPageComponent implements OnInit {
  token = '';
  loading = false;
  signing = false;
  successMessage = '';
  errorMessage = '';
  signerName = '';
  signerDocument = '';
  requestData: any = null;

  constructor(
    private route: ActivatedRoute,
    private api: JurisflowApiService
  ) {}

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.errorMessage = 'Link de assinatura invalido.';
      return;
    }

    await this.loadRequest();
  }

  async sign(): Promise<void> {
    if (!this.token || this.signing || !this.canSign) {
      return;
    }

    this.signing = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await firstValueFrom(
        this.api.publicPostPath<any>(`public/signatures/${this.token}/sign`, {
          signer_name: this.signerName,
          signer_document: this.signerDocument
        })
      );
      this.successMessage = 'Assinatura registrada com sucesso.';
      await this.loadRequest();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel registrar a assinatura.';
    } finally {
      this.signing = false;
    }
  }

  openDocument(): void {
    const fileUrl = this.requestData?.file_url;
    if (!fileUrl) {
      this.errorMessage = 'O documento ainda nao possui arquivo disponivel para visualizacao.';
      return;
    }

    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }

  get canSign(): boolean {
    const status = String(this.requestData?.status || '').toLowerCase();
    return !['signed', 'cancelled'].includes(status);
  }

  statusLabel(value?: string): string {
    const status = String(value || '').toLowerCase();
    if (status === 'pending') return 'Pendente';
    if (status === 'sent') return 'Enviada';
    if (status === 'viewed') return 'Visualizada';
    if (status === 'signed') return 'Assinada';
    if (status === 'cancelled') return 'Cancelada';
    return value || '-';
  }

  formatDateTime(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  private async loadRequest(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await firstValueFrom(this.api.publicGetPath<any>(`public/signatures/${this.token}`));
      this.requestData = response?.data ?? null;
      this.signerName = this.requestData?.signer_name || '';
      this.signerDocument = this.requestData?.signer_document || '';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar a solicitacao de assinatura.';
    } finally {
      this.loading = false;
    }
  }
}
