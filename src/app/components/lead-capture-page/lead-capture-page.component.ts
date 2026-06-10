import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { firstValueFrom } from 'rxjs';
import { PublicCompanyProfile } from '../../models/login';
import { JurisflowApiService } from '../../services/jurisflow-api.service';

@Component({
  selector: 'app-lead-capture-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule],
  templateUrl: './lead-capture-page.component.html',
  styleUrl: './lead-capture-page.component.scss'
})
export class LeadCapturePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  loading = true;
  saving = false;
  success = false;
  errorMessage = '';
  companyCode = '';
  company: PublicCompanyProfile | null = null;

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', Validators.email],
    phone: ['', Validators.required],
    document: [''],
    notes: ['']
  });

  constructor(
    private route: ActivatedRoute,
    private api: JurisflowApiService
  ) {}

  get officeName(): string {
    return this.company?.name || 'JurisFlow';
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
      this.company = response.data ?? null;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar os dados do escritorio.';
    } finally {
      this.loading = false;
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(
        this.api.capturePublicLead({
          company_code: this.companyCode,
          name: this.form.controls.name.value?.trim() ?? '',
          email: this.form.controls.email.value?.trim() ?? '',
          phone: this.form.controls.phone.value?.trim() ?? '',
          document: this.form.controls.document.value?.trim() ?? '',
          notes: this.form.controls.notes.value?.trim() ?? '',
          origin: 'landing_publica',
          status: 'lead'
        })
      );

      if (!response?.status) {
        throw new Error(response?.message || 'Nao foi possivel enviar seu contato.');
      }

      this.success = true;
      this.form.reset({
        name: '',
        email: '',
        phone: '',
        document: '',
        notes: ''
      });
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel enviar seu contato.';
    } finally {
      this.saving = false;
    }
  }
}
