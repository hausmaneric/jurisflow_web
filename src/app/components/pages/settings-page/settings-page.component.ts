import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

type PreferenceItem = {
  id: string;
  label: string;
  description: string;
};

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss'
})
export class SettingsPageComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);

  @ViewChildren('settingsSection') private readonly sections!: QueryList<ElementRef<HTMLElement>>;

  readonly preferences: PreferenceItem[] = [
    { id: 'geral', label: 'Geral', description: 'Dados do escritorio, idioma, moeda e identidade visual.' },
    { id: 'agenda', label: 'Agenda', description: 'Padroes para itens da agenda, prazos e notificacoes.' },
    { id: 'comunicacao', label: 'Comunicacao', description: 'Assinatura padrao, canais e politicas de envio.' },
    { id: 'seguranca', label: 'Seguranca', description: 'Sessao, autenticacao e politicas de acesso.' },
    { id: 'integracoes', label: 'Integracoes', description: 'Conexoes com servicos e atalhos operacionais.' },
    { id: 'usuarios', label: 'Usuarios e permissoes', description: 'Gestao de acessos, perfis e modelos.' }
  ];

  loading = false;
  saving = false;
  message = '';
  searchTerm = '';
  selectedPreference = 'geral';

  form = this.fb.group({
    company_name: [''],
    company_document: [''],
    company_email: [''],
    company_phone: [''],
    billing_email: [''],
    logo_url: [''],
    timezone: ['America/Sao_Paulo'],
    locale: ['pt-BR'],
    currency: ['BRL'],
    date_format: ['DD/MM/AAAA'],
    hour_format: ['24 horas'],
    storage_limit_mb: [1024],
    primary_color: ['#0D1B2A'],
    secondary_color: ['#F59E0B'],
    accent_color: ['#10B981'],
    reminder_email_enabled: [true],
    allow_message_attachments: [true],
    show_tips: [false],
    dark_mode: [false],
    default_task_priority: ['Media'],
    default_task_status: ['Pendente'],
    notify_task_by_email: [true],
    communication_signature: ['Atenciosamente,\nEquipe JurisFlow'],
    communication_channels_email: [true],
    communication_channels_sms: [false],
    communication_channels_whatsapp: [true],
    communication_channels_correspondence: [false],
    password_policy: ['Senha forte (minimo 8 caracteres)'],
    session_timeout: ['8 horas'],
    login_attempts: ['5 tentativas'],
    two_factor_enabled: [true]
  });

  constructor(
    private api: JurisflowApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((params) => {
      const section = params.get('section');
      if (section && this.preferences.some((item) => item.id === section)) {
        this.selectedPreference = section;
        queueMicrotask(() => this.scrollToSection(section));
      }
    });

    this.loading = true;
    try {
      const response = await firstValueFrom(this.api.getCompanySettings<any>());
      const settings = response?.data ?? {};
      const storedSettings = settings.settings ?? {};

      this.form.patchValue({
        company_name: settings.name ?? settings.company_name ?? '',
        company_document: settings.document ?? '',
        company_email: settings.email ?? '',
        company_phone: settings.phone ?? '',
        billing_email: settings.billing_email ?? settings.email ?? '',
        logo_url: settings.logo_url ?? '',
        timezone: settings.timezone ?? 'America/Sao_Paulo',
        locale: settings.locale ?? 'pt-BR',
        currency: storedSettings.currency ?? 'BRL',
        date_format: storedSettings.date_format ?? 'DD/MM/AAAA',
        hour_format: storedSettings.hour_format ?? '24 horas',
        storage_limit_mb: settings.storage_limit_mb ?? 1024,
        primary_color: storedSettings.primary_color ?? '#0D1B2A',
        secondary_color: storedSettings.secondary_color ?? '#F59E0B',
        accent_color: storedSettings.accent_color ?? '#10B981',
        reminder_email_enabled: storedSettings.reminder_email_enabled ?? true,
        allow_message_attachments: storedSettings.allow_message_attachments ?? true,
        show_tips: storedSettings.show_tips ?? false,
        dark_mode: storedSettings.dark_mode ?? false,
        default_task_priority: storedSettings.default_task_priority ?? 'Media',
        default_task_status: storedSettings.default_task_status ?? 'Pendente',
        notify_task_by_email: storedSettings.notify_task_by_email ?? true,
        communication_signature: storedSettings.communication_signature ?? 'Atenciosamente,\nEquipe JurisFlow',
        communication_channels_email: storedSettings.communication_channels_email ?? true,
        communication_channels_sms: storedSettings.communication_channels_sms ?? false,
        communication_channels_whatsapp: storedSettings.communication_channels_whatsapp ?? true,
        communication_channels_correspondence: storedSettings.communication_channels_correspondence ?? false,
        password_policy: storedSettings.password_policy ?? 'Senha forte (minimo 8 caracteres)',
        session_timeout: storedSettings.session_timeout ?? '8 horas',
        login_attempts: storedSettings.login_attempts ?? '5 tentativas',
        two_factor_enabled: storedSettings.two_factor_enabled ?? true
      });
    } catch {
      this.message = 'Nao foi possivel carregar as configuracoes do escritorio.';
    } finally {
      this.loading = false;
    }
  }

  ngAfterViewInit(): void {
    this.sections.changes.subscribe(() => this.syncSelectionWithSearch());
  }

  get filteredPreferences(): PreferenceItem[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.preferences;
    }

    return this.preferences.filter((item) =>
      `${item.label} ${item.description}`.toLowerCase().includes(term)
    );
  }

  sectionVisible(id: string): boolean {
    if (!this.searchTerm.trim()) {
      return true;
    }

    return this.filteredPreferences.some((item) => item.id === id);
  }

  setSearchTerm(value: string): void {
    this.searchTerm = value;
    this.syncSelectionWithSearch();
  }

  async save(): Promise<void> {
    if (this.saving) {
      return;
    }

    this.saving = true;
    this.message = '';

    try {
      const raw = this.form.getRawValue();
      await firstValueFrom(
        this.api.updateCompanySettings({
          name: raw.company_name,
          document: raw.company_document,
          email: raw.company_email,
          phone: raw.company_phone,
          billing_email: raw.billing_email,
          logo_url: raw.logo_url,
          timezone: raw.timezone,
          locale: raw.locale,
          storage_limit_mb: raw.storage_limit_mb,
          settings: {
            currency: raw.currency,
            date_format: raw.date_format,
            hour_format: raw.hour_format,
            primary_color: raw.primary_color,
            secondary_color: raw.secondary_color,
            accent_color: raw.accent_color,
            reminder_email_enabled: raw.reminder_email_enabled,
            allow_message_attachments: raw.allow_message_attachments,
            show_tips: raw.show_tips,
            dark_mode: raw.dark_mode,
            default_task_priority: raw.default_task_priority,
            default_task_status: raw.default_task_status,
            notify_task_by_email: raw.notify_task_by_email,
            communication_signature: raw.communication_signature,
            communication_channels_email: raw.communication_channels_email,
            communication_channels_sms: raw.communication_channels_sms,
            communication_channels_whatsapp: raw.communication_channels_whatsapp,
            communication_channels_correspondence: raw.communication_channels_correspondence,
            password_policy: raw.password_policy,
            session_timeout: raw.session_timeout,
            login_attempts: raw.login_attempts,
            two_factor_enabled: raw.two_factor_enabled
          }
        })
      );
      this.message = 'Configuracoes salvas com sucesso.';
    } catch {
      this.message = 'Falha ao salvar configuracoes.';
    } finally {
      this.saving = false;
    }
  }

  selectPreference(preferenceId: string): void {
    this.selectedPreference = preferenceId;
    this.scrollToSection(preferenceId);
  }

  scrollToSection(preferenceId: string): void {
    const target = this.sections?.find((section) => section.nativeElement.dataset['section'] === preferenceId);
    if (!target) {
      return;
    }

    target.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openUsers(): void {
    void this.router.navigate(['/plataforma/usuarios']);
  }

  openRoles(): void {
    void this.router.navigate(['/plataforma/perfis']);
  }

  openDocuments(): void {
    void this.router.navigate(['/plataforma/documentos']);
  }

  openDocumentTemplates(): void {
    void this.router.navigate(['/plataforma/modelos-documento']);
  }

  openCommunications(): void {
    void this.router.navigate(['/plataforma/comunicacoes']);
  }

  openMessageTemplates(): void {
    void this.router.navigate(['/plataforma/modelos-comunicacao']);
  }

  openFinancial(): void {
    void this.router.navigate(['/plataforma/financeiro']);
  }

  openAgenda(): void {
    void this.router.navigate(['/plataforma/agenda']);
  }

  openGoogleCalendarSetup(): void {
    void this.router.navigate(['/plataforma/agenda'], {
      queryParams: { integration: 'google-calendar' }
    });
  }

  openOutlookCalendarSetup(): void {
    void this.router.navigate(['/plataforma/agenda'], {
      queryParams: { integration: 'outlook-calendar' }
    });
  }

  openIntegrationsHub(): void {
    void this.router.navigate(['/plataforma/configuracoes'], {
      queryParams: { section: 'integracoes' }
    });
  }

  private syncSelectionWithSearch(): void {
    const firstVisible = this.filteredPreferences[0];
    if (!firstVisible) {
      return;
    }

    if (!this.filteredPreferences.some((item) => item.id === this.selectedPreference)) {
      this.selectedPreference = firstVisible.id;
    }
  }
}
