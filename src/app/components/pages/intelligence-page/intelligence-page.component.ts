import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

type StatusCard = {
  label: string;
  value: number;
  helper: string;
  icon: string;
  tone: string;
};

@Component({
  selector: 'app-intelligence-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './intelligence-page.component.html',
  styleUrl: './intelligence-page.component.scss'
})
export class IntelligencePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  loading = false;
  saving = false;
  message = '';

  notes: any[] = [];
  transcriptions: any[] = [];
  aiSummaries: any[] = [];
  syncLogs: any[] = [];
  webhooks: any[] = [];
  apiTokens: any[] = [];
  automationRules: any[] = [];
  manualTranscripts: Record<string, string> = {};
  transcriptionSegments: Record<string, any[]> = {};
  runtimeEnvironment: any = null;

  noteForm = this.fb.group({
    title: ['', Validators.required],
    content: ['', Validators.required],
    type: ['atendimento'],
    visibility: ['internal']
  });

  transcriptionForm = this.fb.group({
    title: ['', Validators.required],
    source: ['meeting'],
    transcription_type: ['meeting'],
    consent_confirmed: [true],
    confidentiality: ['internal']
  });

  webhookForm = this.fb.group({
    name: ['Webhook principal', Validators.required],
    target_url: ['', Validators.required],
    events: ['client.created,case.updated,document.signed']
  });

  constructor(private api: JurisflowApiService) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  get cards(): StatusCard[] {
    return [
      { label: 'Anotações', value: this.notes.length, helper: 'Atendimentos e observações', icon: 'pi pi-book', tone: 'blue' },
      { label: 'Transcrições', value: this.transcriptions.length, helper: 'Audiências, reuniões e chamadas', icon: 'pi pi-microphone', tone: 'gold' },
      { label: 'Resumos locais', value: this.aiSummaries.length, helper: 'Pontos-chave e próximos passos', icon: 'pi pi-sparkles', tone: 'green' },
      { label: 'Sincronizações', value: this.syncLogs.length, helper: 'DataJud e tribunais', icon: 'pi pi-refresh', tone: 'purple' }
    ];
  }

  async load(): Promise<void> {
    this.loading = true;
    this.message = '';

    try {
      const [notes, transcriptions, aiSummaries, syncLogs, webhooks, apiTokens, automationRules, environment] = await Promise.all([
        firstValueFrom(this.api.list<any>('notes', { limit: 8 })),
        firstValueFrom(this.api.list<any>('transcriptions', { limit: 8 })),
        firstValueFrom(this.api.list<any>('transcription-summaries', { limit: 8 })),
        firstValueFrom(this.api.list<any>('case-sync-logs', { limit: 8 })),
        firstValueFrom(this.api.list<any>('webhooks', { limit: 5 })),
        firstValueFrom(this.api.list<any>('api-tokens', { limit: 5 })),
        firstValueFrom(this.api.list<any>('automation-rules', { limit: 5 })),
        firstValueFrom(this.api.getPath<any>('environment'))
      ]);

      this.notes = notes.data ?? [];
      this.transcriptions = transcriptions.data ?? [];
      this.aiSummaries = aiSummaries.data ?? [];
      this.syncLogs = syncLogs.data ?? [];
      this.webhooks = webhooks.data ?? [];
      this.apiTokens = apiTokens.data ?? [];
      this.automationRules = automationRules.data ?? [];
      this.runtimeEnvironment = environment.data ?? null;
      await this.loadVisibleSegments();
    } catch {
      this.message = 'Não foi possível carregar todos os dados avançados. Verifique permissões e conexão com a API.';
    } finally {
      this.loading = false;
    }
  }

  async createNote(): Promise<void> {
    if (this.noteForm.invalid || this.saving) {
      this.noteForm.markAllAsTouched();
      return;
    }

    await this.saveAction(async () => {
      await firstValueFrom(this.api.create('notes', this.noteForm.getRawValue()));
      this.noteForm.patchValue({ title: '', content: '' });
      this.message = 'Anotação criada com sucesso.';
    });
  }

  async createTranscription(): Promise<void> {
    if (this.transcriptionForm.invalid || this.saving) {
      this.transcriptionForm.markAllAsTouched();
      return;
    }

    await this.saveAction(async () => {
      await firstValueFrom(this.api.create('transcriptions', this.transcriptionForm.getRawValue()));
      this.transcriptionForm.patchValue({ title: '' });
      this.message = 'Transcrição preparada com sucesso.';
    });
  }

  async startRecording(transcription: any): Promise<void> {
    await this.saveAction(async () => {
      await firstValueFrom(this.api.postPath(`transcriptions/${transcription.id}/start-recording`, {}));
      this.message = 'Gravação marcada como iniciada.';
    });
  }

  async uploadAudio(transcription: any, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.saving) {
      return;
    }

    await this.saveAction(async () => {
      const formData = new FormData();
      formData.append('file', file);
      const upload = await firstValueFrom(this.api.uploadPath<any>('documents/upload', formData));
      if (!upload?.status || !upload.data?.file_url) {
        throw new Error(upload?.message || 'Não foi possível enviar o áudio.');
      }
      await firstValueFrom(
        this.api.postPath(`transcriptions/${transcription.id}/upload`, {
          file_url: upload.data.file_url,
          file_type: upload.data.file_type || file.type || 'audio',
          duration_seconds: null
        })
      );
      this.message = 'Áudio enviado para a transcrição.';
    });
    input.value = '';
  }

  async processManual(transcription: any): Promise<void> {
    const text = (this.manualTranscripts[transcription.id] || '').trim();
    if (!text) {
      this.message = 'Cole o texto transcrito antes de processar manualmente.';
      return;
    }
    await this.saveAction(async () => {
      await firstValueFrom(
        this.api.postPath(`transcriptions/${transcription.id}/process`, {
          provider: 'manual',
          text
        })
      );
      this.manualTranscripts[transcription.id] = '';
      this.message = 'Transcrição manual processada em segmentos.';
      await this.loadSegments(transcription.id);
    });
  }

  async processWithWhisperWorker(transcription: any): Promise<void> {
    await this.saveAction(async () => {
      await firstValueFrom(
        this.api.postPath(`transcriptions/${transcription.id}/process`, {
          provider: 'whisper_worker'
        })
      );
      this.message = 'Transcrição processada pelo worker Whisper.';
      await this.loadSegments(transcription.id);
    });
  }

  async finalizeTranscription(transcription: any): Promise<void> {
    await this.saveAction(async () => {
      await firstValueFrom(this.api.postPath(`transcriptions/${transcription.id}/summary`, {}));
      await firstValueFrom(this.api.postPath(`transcriptions/${transcription.id}/generate-tasks`, {}));
      await firstValueFrom(this.api.postPath(`transcriptions/${transcription.id}/finalize`, {}));
      this.message = 'Transcrição resumida localmente, convertida em tarefa e finalizada.';
    });
  }

  async exportTranscriptionNote(transcription: any): Promise<void> {
    await this.saveAction(async () => {
      await firstValueFrom(this.api.postPath(`transcriptions/${transcription.id}/export-note`, {}));
      this.message = 'Anotação gerada com a transcrição estruturada.';
    });
  }

  async exportTranscriptionDocument(transcription: any): Promise<void> {
    await this.saveAction(async () => {
      await firstValueFrom(this.api.postPath(`transcriptions/${transcription.id}/export-document`, {}));
      this.message = 'Documento gerado com a transcrição estruturada.';
    });
  }

  async reviewSegment(transcription: any, segment: any): Promise<void> {
    const reviewedText = String(segment.text || '').trim();
    if (!reviewedText) {
      this.message = 'Informe o texto revisado da fala antes de salvar.';
      return;
    }

    await this.saveAction(async () => {
      await firstValueFrom(
        this.api.postPath(`transcriptions/${transcription.id}/review`, {
          segment_id: segment.id,
          speaker_label: segment.speaker_label || 'Fala sem identificação',
          original_text: segment.original_text || segment.text,
          reviewed_text: reviewedText
        })
      );
      this.message = 'Fala revisada com sucesso.';
      await this.loadSegments(transcription.id);
    });
  }

  formatSegmentTime(value?: number | string): string {
    const seconds = Number(value ?? 0);
    if (!Number.isFinite(seconds)) {
      return '00:00';
    }
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remaining = total % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  }

  async createWebhook(): Promise<void> {
    if (this.webhookForm.invalid || this.saving) {
      this.webhookForm.markAllAsTouched();
      return;
    }

    const raw = this.webhookForm.getRawValue();
    await this.saveAction(async () => {
      await firstValueFrom(
        this.api.create('webhooks', {
          name: raw.name,
          target_url: raw.target_url,
          events: String(raw.events ?? '')
            .split(',')
            .map((event) => event.trim())
            .filter(Boolean),
          active: true
        })
      );
      this.message = 'Webhook criado com sucesso.';
    });
  }

  private async saveAction(action: () => Promise<void>): Promise<void> {
    this.saving = true;
    this.message = '';
    try {
      await action();
      const successMessage = this.message;
      await this.load();
      this.message = successMessage;
    } catch {
      this.message = 'Não foi possível concluir a ação solicitada.';
    } finally {
      this.saving = false;
    }
  }

  private async loadVisibleSegments(): Promise<void> {
    await Promise.all((this.transcriptions ?? []).slice(0, 4).map((item) => this.loadSegments(item.id)));
  }

  private async loadSegments(transcriptionId: string): Promise<void> {
    if (!transcriptionId) {
      return;
    }
    try {
      const response = await firstValueFrom(this.api.getPath<any[]>(`transcriptions/${transcriptionId}/segments`));
      this.transcriptionSegments[transcriptionId] = response.data ?? [];
    } catch {
      this.transcriptionSegments[transcriptionId] = [];
    }
  }
}
