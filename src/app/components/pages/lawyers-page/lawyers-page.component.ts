import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

@Component({
  selector: 'app-lawyers-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './lawyers-page.component.html',
  styleUrl: './lawyers-page.component.scss'
})
export class LawyersPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  loading = false;
  saving = false;
  message = '';
  selectedLawyerId = '';

  lawyers: any[] = [];
  certificates: any[] = [];

  lawyerForm = this.fb.group({
    name: ['', Validators.required],
    email: [''],
    phone: [''],
    oab_number: ['', Validators.required],
    oab_state: ['', Validators.required],
    specialties: [''],
    active: [true]
  });

  certificateForm = this.fb.group({
    certificate_name: ['Certificado A1', Validators.required],
    certificate_file_url: [''],
    certificate_type: ['A1'],
    certificate_access_mode: ['file_a1'],
    certificate_provider: [''],
    device_identifier: [''],
    local_agent_id: [''],
    cloud_certificate_ref: [''],
    issuer: [''],
    valid_from: [''],
    valid_until: [''],
    consent_accepted: [true],
    consent_text: ['Autorizo o uso do certificado para rotinas juridicas e sincronizacoes auditadas do escritorio.']
  });

  constructor(private api: JurisflowApiService) {}

  async ngOnInit(): Promise<void> {
    this.configureCertificateMode();
    await this.load();
  }

  get certificateAccessMode(): string {
    return this.certificateForm.controls.certificate_access_mode.value ?? 'file_a1';
  }

  get selectedLawyer(): any | null {
    return this.lawyers.find((item) => item.id === this.selectedLawyerId) ?? null;
  }

  async load(): Promise<void> {
    this.loading = true;
    this.message = '';
    try {
      const response = await firstValueFrom(this.api.list<any>('lawyers', { limit: 200 }));
      this.lawyers = response.data ?? [];
      if (!this.selectedLawyerId && this.lawyers.length) {
        this.selectedLawyerId = this.lawyers[0].id;
      }
      await this.loadCertificates();
    } catch {
      this.message = 'Nao foi possivel carregar os advogados.';
    } finally {
      this.loading = false;
    }
  }

  async selectLawyer(id: string): Promise<void> {
    this.selectedLawyerId = id;
    await this.loadCertificates();
  }

  async saveLawyer(): Promise<void> {
    if (this.lawyerForm.invalid || this.saving) {
      this.lawyerForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.message = '';
    try {
      const raw = this.lawyerForm.getRawValue();
      await firstValueFrom(
        this.api.create('lawyers', {
          ...raw,
          specialties: String(raw.specialties ?? '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        })
      );
      this.lawyerForm.reset({ active: true, specialties: '' });
      this.message = 'Advogado cadastrado com sucesso.';
      await this.load();
    } catch {
      this.message = 'Falha ao salvar advogado.';
    } finally {
      this.saving = false;
    }
  }

  async saveCertificate(): Promise<void> {
    this.applyCertificateValidators();
    if (!this.selectedLawyerId || this.certificateForm.invalid || this.saving) {
      this.certificateForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.message = '';
    try {
      await firstValueFrom(
        this.api.create('lawyer-certificates', {
          ...this.normalizedCertificatePayload(),
          lawyer_id: this.selectedLawyerId,
          status: 'active'
        })
      );
      await firstValueFrom(this.api.postPath(`lawyers/${this.selectedLawyerId}/certificates/validate`, {}));
      this.message = 'Certificado cadastrado e validado com sucesso.';
      await this.loadCertificates();
    } catch {
      this.message = 'Falha ao salvar certificado.';
    } finally {
      this.saving = false;
    }
  }

  private configureCertificateMode(): void {
    this.applyCertificateValidators();
    this.certificateForm.controls.certificate_access_mode.valueChanges.subscribe((mode) => {
      if (mode === 'file_a1') {
        this.certificateForm.patchValue({ certificate_type: 'A1' }, { emitEvent: false });
      }
      if (mode === 'token_a3_local' || mode === 'cloud_provider') {
        this.certificateForm.patchValue({ certificate_type: 'A3' }, { emitEvent: false });
      }
      this.applyCertificateValidators();
    });
  }

  private applyCertificateValidators(): void {
    const fileControl = this.certificateForm.controls.certificate_file_url;
    const cloudRefControl = this.certificateForm.controls.cloud_certificate_ref;
    const providerControl = this.certificateForm.controls.certificate_provider;

    fileControl.clearValidators();
    cloudRefControl.clearValidators();
    providerControl.clearValidators();

    if (this.certificateAccessMode === 'file_a1') {
      fileControl.setValidators([Validators.required]);
    }
    if (this.certificateAccessMode === 'cloud_provider') {
      cloudRefControl.setValidators([Validators.required]);
      providerControl.setValidators([Validators.required]);
    }

    fileControl.updateValueAndValidity({ emitEvent: false });
    cloudRefControl.updateValueAndValidity({ emitEvent: false });
    providerControl.updateValueAndValidity({ emitEvent: false });
  }

  private normalizedCertificatePayload(): any {
    const raw = this.certificateForm.getRawValue();
    const mode = raw.certificate_access_mode || 'file_a1';
    return {
      ...raw,
      certificate_file_url: mode === 'file_a1' ? raw.certificate_file_url : '',
      certificate_provider: raw.certificate_provider || (mode === 'token_a3_local' ? 'local_agent' : ''),
      metadata: {
        access_mode_label: this.accessModeLabel(mode),
        requires_private_key_upload: mode === 'file_a1',
        notes:
          mode === 'token_a3_local'
            ? 'Certificado A3/token fisico: a chave privada permanece no dispositivo do advogado.'
            : undefined
      }
    };
  }

  accessModeLabel(mode: string | null | undefined): string {
    switch (mode) {
      case 'file_a1':
        return 'A1 por arquivo seguro';
      case 'token_a3_local':
        return 'A3 em token USB/smartcard';
      case 'cloud_provider':
        return 'Certificado em nuvem/provedor';
      default:
        return 'Modo de certificado';
    }
  }

  private async loadCertificates(): Promise<void> {
    if (!this.selectedLawyerId) {
      this.certificates = [];
      return;
    }

    try {
      const response = await firstValueFrom(this.api.list<any>('lawyer-certificates', { lawyer_id: this.selectedLawyerId }));
      this.certificates = response.data ?? [];
    } catch {
      this.certificates = [];
    }
  }
}
