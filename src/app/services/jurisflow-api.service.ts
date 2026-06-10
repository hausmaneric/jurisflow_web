import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NxResult, PublicClientPortalSessionPayload, PublicCompanyProfile, PublicLeadCapturePayload } from '../models/login';
import { apiURL } from '../resources';
import { LoginService } from './login.service';

export type JurisflowResource =
  | 'company-subscriptions'
  | 'clients'
  | 'client-contacts'
  | 'client-addresses'
  | 'lawyers'
  | 'lawyer-certificates'
  | 'cases'
  | 'case-parties'
  | 'court-connectors'
  | 'case-sync-logs'
  | 'case-movements'
  | 'case-documents-synced'
  | 'automation-rules'
  | 'ai-summaries'
  | 'agenda-items'
  | 'appointments'
  | 'documents'
  | 'document-categories'
  | 'document-versions'
  | 'document-attachments'
  | 'document-signature-requests'
  | 'document-templates'
  | 'generated-documents'
  | 'message-templates'
  | 'messages'
  | 'financial-entries'
  | 'message-attachments'
  | 'tasks'
  | 'task-checklist-items'
  | 'notifications'
  | 'webhooks'
  | 'webhook-deliveries'
  | 'api-tokens'
  | 'notes'
  | 'transcriptions'
  | 'transcription-files'
  | 'transcription-segments'
  | 'transcription-reviews'
  | 'transcription-summaries'
  | 'transcription-tasks'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'role-permissions'
  | 'audit';

@Injectable({ providedIn: 'root' })
export class JurisflowApiService {
  constructor(
    private http: HttpClient,
    private loginService: LoginService
  ) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.loginService.getToken()}`
    });
  }

  list<T>(resource: JurisflowResource, params?: Record<string, string | number | boolean>): Observable<NxResult<T[]>> {
    return this.http.get<NxResult<T[]>>(`${apiURL}${resource}`, {
      headers: this.headers(),
      params: this.cleanParams(params)
    });
  }

  get<T>(resource: JurisflowResource, id: string): Observable<NxResult<T>> {
    return this.http.get<NxResult<T>>(`${apiURL}${resource}/${id}`, {
      headers: this.headers()
    });
  }

  create<T>(resource: JurisflowResource, payload: Record<string, unknown>): Observable<NxResult<T>> {
    return this.http.post<NxResult<T>>(`${apiURL}${resource}`, payload, {
      headers: this.headers()
    });
  }

  update<T>(resource: JurisflowResource, id: string, payload: Record<string, unknown>): Observable<NxResult<T>> {
    return this.http.put<NxResult<T>>(`${apiURL}${resource}/${id}`, payload, {
      headers: this.headers()
    });
  }

  delete<T>(resource: JurisflowResource, id: string): Observable<NxResult<T>> {
    return this.http.delete<NxResult<T>>(`${apiURL}${resource}/${id}`, {
      headers: this.headers()
    });
  }

  getCompanySettings<T>(): Observable<NxResult<T>> {
    return this.http.get<NxResult<T>>(`${apiURL}company-settings`, {
      headers: this.headers()
    });
  }

  getPath<T>(path: string, params?: Record<string, string | number | boolean>): Observable<NxResult<T>> {
    return this.http.get<NxResult<T>>(`${apiURL}${path}`, {
      headers: this.headers(),
      params: this.cleanParams(params)
    });
  }

  updateCompanySettings<T>(payload: Record<string, unknown>): Observable<NxResult<T>> {
    return this.http.put<NxResult<T>>(`${apiURL}company-settings`, payload, {
      headers: this.headers()
    });
  }

  postPath<T>(path: string, payload: Record<string, unknown>): Observable<NxResult<T>> {
    return this.http.post<NxResult<T>>(`${apiURL}${path}`, payload, {
      headers: this.headers()
    });
  }

  putPath<T>(path: string, payload: Record<string, unknown>): Observable<NxResult<T>> {
    return this.http.put<NxResult<T>>(`${apiURL}${path}`, payload, {
      headers: this.headers()
    });
  }

  uploadPath<T>(path: string, formData: FormData): Observable<NxResult<T>> {
    return this.http.post<NxResult<T>>(`${apiURL}${path}`, formData, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.loginService.getToken()}`
      })
    });
  }

  publicCompanyProfile(companyCode: string): Observable<NxResult<PublicCompanyProfile>> {
    return this.http.get<NxResult<PublicCompanyProfile>>(`${apiURL}public/companies/${companyCode}`);
  }

  capturePublicLead(payload: PublicLeadCapturePayload): Observable<NxResult<{ id: string }>> {
    return this.http.post<NxResult<{ id: string }>>(`${apiURL}public/leads`, payload);
  }

  createPublicClientPortalSession<T>(payload: PublicClientPortalSessionPayload): Observable<NxResult<T>> {
    return this.http.post<NxResult<T>>(`${apiURL}public/client-portal/session`, payload);
  }

  publicGetPath<T>(path: string): Observable<NxResult<T>> {
    return this.http.get<NxResult<T>>(`${apiURL}${path}`);
  }

  publicPostPath<T>(path: string, payload: Record<string, unknown>): Observable<NxResult<T>> {
    return this.http.post<NxResult<T>>(`${apiURL}${path}`, payload);
  }

  private cleanParams(params?: Record<string, string | number | boolean>): Record<string, string> | undefined {
    if (!params) {
      return undefined;
    }

    return Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {});
  }
}
