import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { ClientPortalPageComponent } from './components/client-portal-page/client-portal-page.component';
import { GoogleCallbackPageComponent } from './components/google-callback-page/google-callback-page.component';
import { LeadCapturePageComponent } from './components/lead-capture-page/lead-capture-page.component';
import { Login } from './components/login/login';
import { MainShellComponent } from './components/main/main-shell.component';
import { RecoverPasswordPageComponent } from './components/recover-password-page/recover-password-page.component';
import { RegisterPageComponent } from './components/register-page/register-page.component';
import { ResetPasswordPageComponent } from './components/reset-password-page/reset-password-page.component';
import { SignaturePublicPageComponent } from './components/signature-public-page/signature-public-page.component';
import { AgendaItemDetailPageComponent } from './components/pages/agenda-item-detail-page/agenda-item-detail-page.component';
import { AgendaItemFormPageComponent } from './components/pages/agenda-item-form-page/agenda-item-form-page.component';
import { AgendaPageComponent } from './components/pages/agenda-page/agenda-page.component';
import { ClientDetailPageComponent } from './components/pages/client-detail-page/client-detail-page.component';
import { ClientFormPageComponent } from './components/pages/client-form-page/client-form-page.component';
import { ClientsPageComponent } from './components/pages/clients-page/clients-page.component';
import { CommunicationDetailPageComponent } from './components/pages/communication-detail-page/communication-detail-page.component';
import { CommunicationFormPageComponent } from './components/pages/communication-form-page/communication-form-page.component';
import { CommunicationsPageComponent } from './components/pages/communications-page/communications-page.component';
import { DashboardPageComponent } from './components/pages/dashboard-page/dashboard-page.component';
import { DocumentDetailPageComponent } from './components/pages/document-detail-page/document-detail-page.component';
import { DocumentFormPageComponent } from './components/pages/document-form-page/document-form-page.component';
import { DocumentTemplateFormPageComponent } from './components/pages/document-template-form-page/document-template-form-page.component';
import { DocumentTemplatesPageComponent } from './components/pages/document-templates-page/document-templates-page.component';
import { DocumentsPageComponent } from './components/pages/documents-page/documents-page.component';
import { FinancialEntryFormPageComponent } from './components/pages/financial-entry-form-page/financial-entry-form-page.component';
import { FinancialPageComponent } from './components/pages/financial-page/financial-page.component';
import { IntelligencePageComponent } from './components/pages/intelligence-page/intelligence-page.component';
import { LawyersPageComponent } from './components/pages/lawyers-page/lawyers-page.component';
import { LegacyTaskRedirectPageComponent } from './components/pages/legacy-task-redirect-page/legacy-task-redirect-page.component';
import { MessageTemplateFormPageComponent } from './components/pages/message-template-form-page/message-template-form-page.component';
import { MessageTemplatesPageComponent } from './components/pages/message-templates-page/message-templates-page.component';
import { NotificationsPageComponent } from './components/pages/notifications-page/notifications-page.component';
import { ProcessDetailPageComponent } from './components/pages/process-detail-page/process-detail-page.component';
import { ProcessFormPageComponent } from './components/pages/process-form-page/process-form-page.component';
import { ProcessesPageComponent } from './components/pages/processes-page/processes-page.component';
import { ReportsPageComponent } from './components/pages/reports-page/reports-page.component';
import { RolesPageComponent } from './components/pages/roles-page/roles-page.component';
import { SettingsPageComponent } from './components/pages/settings-page/settings-page.component';
import { UserFormPageComponent } from './components/pages/user-form-page/user-form-page.component';
import { UsersPageComponent } from './components/pages/users-page/users-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'auth/google/callback', component: GoogleCallbackPageComponent },
  { path: 'cadastro', component: RegisterPageComponent },
  { path: 'escritorio/:companyCode/contato', component: LeadCapturePageComponent },
  { path: 'escritorio/:companyCode/portal', component: ClientPortalPageComponent },
  { path: 'assinatura/:token', component: SignaturePublicPageComponent },
  { path: 'recuperar-senha', component: RecoverPasswordPageComponent },
  { path: 'redefinir-senha', component: ResetPasswordPageComponent },
  {
    path: 'plataforma',
    component: MainShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardPageComponent, data: { title: 'Dashboard' } },
      { path: 'clientes', component: ClientsPageComponent, data: { title: 'Clientes' } },
      { path: 'clientes/novo', component: ClientFormPageComponent, data: { title: 'Novo cliente' } },
      { path: 'clientes/:id', component: ClientDetailPageComponent, data: { title: 'Cliente' } },
      { path: 'clientes/:id/editar', component: ClientFormPageComponent, data: { title: 'Editar cliente' } },
      { path: 'processos', component: ProcessesPageComponent, data: { title: 'Processos' } },
      { path: 'processos/novo', component: ProcessFormPageComponent, data: { title: 'Novo processo' } },
      { path: 'processos/:id', component: ProcessDetailPageComponent, data: { title: 'Processo' } },
      { path: 'processos/:id/editar', component: ProcessFormPageComponent, data: { title: 'Editar processo' } },
      { path: 'advogados', component: LawyersPageComponent, data: { title: 'Advogados' } },
      { path: 'agenda', component: AgendaPageComponent, data: { title: 'Agenda' } },
      { path: 'agenda/novo', component: AgendaItemFormPageComponent, data: { title: 'Agenda', subtitle: 'Novo item da agenda' } },
      { path: 'agenda/:id', component: AgendaItemDetailPageComponent, data: { title: 'Agenda', subtitle: 'Detalhes do item' } },
      { path: 'agenda/:id/editar', component: AgendaItemFormPageComponent, data: { title: 'Agenda', subtitle: 'Editar item da agenda' } },
      { path: 'tarefas', redirectTo: 'agenda', pathMatch: 'full' },
      { path: 'tarefas/nova', component: LegacyTaskRedirectPageComponent },
      { path: 'tarefas/:id', component: LegacyTaskRedirectPageComponent },
      { path: 'tarefas/:id/editar', component: LegacyTaskRedirectPageComponent },
      { path: 'documentos', component: DocumentsPageComponent, data: { title: 'Documentos' } },
      { path: 'modelos-documento', component: DocumentTemplatesPageComponent, data: { title: 'Modelos de documento' } },
      { path: 'modelos-documento/novo', component: DocumentTemplateFormPageComponent, data: { title: 'Novo modelo de documento' } },
      { path: 'modelos-documento/:id/editar', component: DocumentTemplateFormPageComponent, data: { title: 'Editar modelo de documento' } },
      { path: 'documentos/novo', component: DocumentFormPageComponent, data: { title: 'Novo documento' } },
      { path: 'documentos/:id', component: DocumentDetailPageComponent, data: { title: 'Documento' } },
      { path: 'documentos/:id/editar', component: DocumentFormPageComponent, data: { title: 'Editar documento' } },
      { path: 'comunicacoes', component: CommunicationsPageComponent, data: { title: 'Comunicacoes' } },
      { path: 'modelos-comunicacao', component: MessageTemplatesPageComponent, data: { title: 'Modelos de comunicacao' } },
      { path: 'modelos-comunicacao/novo', component: MessageTemplateFormPageComponent, data: { title: 'Novo modelo de comunicacao' } },
      { path: 'modelos-comunicacao/:id/editar', component: MessageTemplateFormPageComponent, data: { title: 'Editar modelo de comunicacao' } },
      { path: 'comunicacoes/nova', component: CommunicationFormPageComponent, data: { title: 'Nova comunicacao' } },
      { path: 'comunicacoes/:id', component: CommunicationDetailPageComponent, data: { title: 'Comunicacao' } },
      { path: 'comunicacoes/:id/editar', component: CommunicationFormPageComponent, data: { title: 'Editar comunicacao' } },
      { path: 'financeiro', component: FinancialPageComponent, data: { title: 'Financeiro' } },
      { path: 'financeiro/novo', component: FinancialEntryFormPageComponent, data: { title: 'Novo lancamento financeiro' } },
      { path: 'financeiro/:id/editar', component: FinancialEntryFormPageComponent, data: { title: 'Editar lancamento financeiro' } },
      { path: 'inteligencia', component: IntelligencePageComponent, data: { title: 'Inteligencia' } },
      { path: 'notificacoes', component: NotificationsPageComponent, data: { title: 'Notificacoes' } },
      { path: 'relatorios', component: ReportsPageComponent, data: { title: 'Relatorios' } },
      { path: 'configuracoes', component: SettingsPageComponent, data: { title: 'Configuracoes' } },
      { path: 'usuarios', component: UsersPageComponent, data: { title: 'Usuarios' } },
      { path: 'usuarios/novo', component: UserFormPageComponent, data: { title: 'Novo usuario' } },
      { path: 'usuarios/:id/editar', component: UserFormPageComponent, data: { title: 'Editar usuario' } },
      { path: 'perfis', component: RolesPageComponent, data: { title: 'Perfis e permissoes' } }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
