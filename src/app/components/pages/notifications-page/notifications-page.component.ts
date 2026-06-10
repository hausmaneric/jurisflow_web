import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { JurisflowApiService } from '../../../services/jurisflow-api.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss'
})
export class NotificationsPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(JurisflowApiService);

  notifications: any[] = [];
  selectedNotification: any = null;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';
  searchTerm = '';
  statusFilter = '';

  readonly channelOptions = [
    { value: 'email', label: 'E-mail' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'sms', label: 'SMS' },
    { value: 'push', label: 'Push' },
    { value: 'system', label: 'Sistema' }
  ];

  readonly statusOptions = [
    { value: 'pending', label: 'Pendente' },
    { value: 'scheduled', label: 'Agendada' },
    { value: 'sent', label: 'Enviada' },
    { value: 'read', label: 'Lida' },
    { value: 'failed', label: 'Falha' },
    { value: 'cancelled', label: 'Cancelada' }
  ];

  form = this.fb.group({
    user_id: [''],
    title: ['', Validators.required],
    body: ['', Validators.required],
    channel: ['email', Validators.required],
    scheduled_at: [''],
    sent_at: [''],
    read_at: [''],
    attempts: [0],
    status: ['pending', Validators.required]
  });

  async ngOnInit(): Promise<void> {
    await this.loadNotifications();
  }

  get filteredNotifications(): any[] {
    const search = this.searchTerm.trim().toLowerCase();
    return this.notifications.filter((item) => {
      const matchesStatus = !this.statusFilter || item.status === this.statusFilter;
      const text = `${item.title ?? ''} ${item.body ?? ''} ${item.channel ?? ''} ${item.status ?? ''}`.toLowerCase();
      return matchesStatus && (!search || text.includes(search));
    });
  }

  async loadNotifications(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await firstValueFrom(this.api.list<any>('notifications', { limit: 200 }));
      this.notifications = response?.data ?? [];
      if (!this.selectedNotification && this.notifications.length) {
        this.selectNotification(this.notifications[0]);
      }
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel carregar as notificacoes.';
    } finally {
      this.loading = false;
    }
  }

  selectNotification(item: any): void {
    this.selectedNotification = item;
    this.form.patchValue({
      user_id: item.user_id ?? '',
      title: item.title ?? '',
      body: item.body ?? '',
      channel: item.channel ?? 'email',
      scheduled_at: this.toInputDateTime(item.scheduled_at),
      sent_at: this.toInputDateTime(item.sent_at),
      read_at: this.toInputDateTime(item.read_at),
      attempts: Number(item.attempts ?? 0),
      status: item.status ?? 'pending'
    });
  }

  newNotification(): void {
    this.selectedNotification = null;
    this.successMessage = '';
    this.errorMessage = '';
    this.form.reset({
      user_id: '',
      title: '',
      body: '',
      channel: 'email',
      scheduled_at: '',
      sent_at: '',
      read_at: '',
      attempts: 0,
      status: 'pending'
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';
    const payload = this.cleanPayload(this.form.getRawValue());
    try {
      if (this.selectedNotification?.id) {
        await firstValueFrom(this.api.update('notifications', this.selectedNotification.id, payload));
        this.successMessage = 'Notificacao atualizada com sucesso.';
      } else {
        await firstValueFrom(this.api.create('notifications', payload));
        this.successMessage = 'Notificacao cadastrada com sucesso.';
      }
      await this.loadNotifications();
      this.newNotification();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel salvar a notificacao.';
    } finally {
      this.saving = false;
    }
  }

  statusLabel(status: string): string {
    return this.statusOptions.find((item) => item.value === status)?.label ?? status ?? '-';
  }

  channelLabel(channel: string): string {
    return this.channelOptions.find((item) => item.value === channel)?.label ?? channel ?? '-';
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private toInputDateTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private cleanPayload(payload: any): Record<string, any> {
    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) => {
        if (['scheduled_at', 'sent_at', 'read_at'].includes(key)) {
          return [key, value ? new Date(String(value)).toISOString() : null];
        }
        if (key === 'attempts') {
          return [key, Number(value ?? 0)];
        }
        return [key, value === '' ? null : value];
      })
    );
  }
}
