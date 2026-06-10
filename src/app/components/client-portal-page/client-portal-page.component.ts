import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { firstValueFrom } from 'rxjs';
import { PublicCompanyProfile } from '../../models/login';
import { JurisflowApiService } from '../../services/jurisflow-api.service';

interface PortalSessionData {
  company?: { name?: string; code?: string };
  client?: any;
  cases?: any[];
  documents?: any[];
  messages?: any[];
  agenda_items?: any[];
  summary?: {
    executive_summary?: string;
    active_cases?: number;
    documents_available?: number;
    messages_count?: number;
    agenda_count?: number;
    next_item?: any;
    latest_message?: any;
  };
}

@Component({
  selector: 'app-client-portal-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule],
  templateUrl: './client-portal-page.component.html',
  styleUrl: './client-portal-page.component.scss'
})
export class ClientPortalPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  companyCode = '';
  loading = true;
  authenticating = false;
  errorMessage = '';
  portalData: PortalSessionData | null = null;
  company: PublicCompanyProfile | null = null;

  form = this.fb.group({
    email: [''],
    document: [''],
    phone: ['']
  });

  constructor(
    private route: ActivatedRoute,
    private api: JurisflowApiService
  ) {}

  get companyName(): string {
    return this.portalData?.company?.name || this.company?.name || 'Portal do cliente';
  }

  async ngOnInit(): Promise<void> {
    this.companyCode = this.route.snapshot.paramMap.get('companyCode') ?? '';
    if (!this.companyCode) {
      this.errorMessage = 'Codigo do escritorio nao informado.';
      this.loading = false;
      return;
    }

    try {
      const response = await firstValueFrom(this.api.publicCompanyProfile(this.companyCode));
      if (!response?.status || !response?.data) {
        throw new Error(response?.message || 'Escritorio nao encontrado.');
      }
      this.company = response.data;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar os dados do escritorio.';
    } finally {
      this.loading = false;
    }
  }

  async accessPortal(): Promise<void> {
    if (this.authenticating || !this.companyCode) {
      return;
    }

    this.authenticating = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(
        this.api.createPublicClientPortalSession<PortalSessionData>({
          company_code: this.companyCode,
          email: this.form.controls.email.value?.trim() ?? '',
          document: this.form.controls.document.value?.trim() ?? '',
          phone: this.form.controls.phone.value?.trim() ?? ''
        })
      );
      if (!response?.status || !response?.data?.client) {
        throw new Error(response?.message || 'Nao encontramos um cliente com os dados informados.');
      }
      this.portalData = response.data ?? null;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel acessar o portal.';
    } finally {
      this.authenticating = false;
    }
  }
}
