export interface MetricCard {
  title: string;
  value: string;
  helper: string;
  color: string;
  icon: string;
}

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  client: string;
  color: string;
  notes?: string;
}

export interface AgendaItemRow {
  id: string;
  sourceId?: string;
  itemKind: 'appointment' | 'task';
  clientId?: string;
  caseId?: string;
  clientName?: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  owner: string;
  process: string;
  dueDate: string;
  timeLabel: string;
  location: string;
  color: string;
  description?: string;
}

export interface ActivityFeedItem {
  icon: string;
  title: string;
  subtitle: string;
  when: string;
}

export interface ClientRow {
  id?: string;
  nome: string;
  tipo: string;
  contato: string;
  responsavel: string;
  status: string;
  cadastro: string;
  statusKey?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface ProcessRow {
  id?: string;
  processo: string;
  cliente: string;
  area: string;
  vara: string;
  fase: string;
  status: string;
}

export interface TaskRow {
  id?: string;
  agendaItemId?: string;
  tarefa: string;
  processo: string;
  responsavel: string;
  prazo: string;
  prioridade: string;
  status: string;
}

export interface DocumentRow {
  id?: string;
  nome: string;
  tipo: string;
  processoCliente: string;
  pasta: string;
  adicionado: string;
  fileUrl?: string;
  status?: string;
  clientId?: string;
  caseId?: string;
  resumo?: string;
}

export interface DocumentVersionRow {
  id?: string;
  documentId?: string;
  versionLabel: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  notes?: string;
  isCurrent?: boolean;
  createdAt?: string;
}

export interface DocumentAttachmentRow {
  id?: string;
  documentId?: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  notes?: string;
  createdAt?: string;
}

export interface DocumentSignatureRequestRow {
  id?: string;
  documentId?: string;
  signerName: string;
  signerEmail?: string;
  signerDocument?: string;
  signerRole?: string;
  status: string;
  accessToken?: string;
  notes?: string;
  sentAt?: string;
  viewedAt?: string;
  signedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
}

export interface CommunicationRow {
  id?: string;
  assunto: string;
  processoCliente: string;
  canal: string;
  destinatario: string;
  dataHora: string;
  status: string;
  resumo?: string;
  body?: string;
  clientId?: string;
  caseId?: string;
  ownerName?: string;
}

export interface CommunicationAttachmentRow {
  id?: string;
  messageId?: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  notes?: string;
  createdAt?: string;
}

export interface FinancialEntryRow {
  id?: string;
  data: string;
  descricao: string;
  tipo: string;
  categoria: string;
  clienteProcesso: string;
  conta: string;
  valor: string;
  status: string;
  clientId?: string;
  caseId?: string;
  notes?: string;
}
