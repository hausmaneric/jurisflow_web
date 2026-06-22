export interface NxResult<T> {
  status: boolean;
  message: string;
  data: T;
  error?: boolean;
  error_msg?: string;
  code?: number;
}

export interface TenantLoginPayload {
  companyCode: string;
  email: string;
  password: string;
}

export interface PasswordResetRequestPayload {
  companyCode: string;
  email: string;
}

export interface PasswordResetRequestData {
  reset_token: string;
  expires_at: string;
  delivery_mode?: string;
}

export interface PasswordResetPayload {
  resetToken: string;
  newPassword: string;
}

export interface PublicCompanyProfile {
  id?: string;
  code?: string;
  name?: string;
  email?: string;
  phone?: string;
  logo_url?: string;
  status?: string;
  locale?: string;
  timezone?: string;
  settings?: Record<string, unknown>;
}

export interface PublicLeadCapturePayload {
  company_code: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  notes?: string;
  origin?: string;
  status?: string;
}

export interface PublicClientPortalSessionPayload {
  company_code: string;
  email?: string;
  document?: string;
  phone?: string;
}

export interface PublicSignupPayload {
  company_code: string;
  company_name: string;
  plan_code?: string;
  company_document?: string;
  company_email?: string;
  company_phone?: string;
  billing_email?: string;
  office_oab?: string;
  office_address?: string;
  office_number?: string;
  office_complement?: string;
  office_city?: string;
  office_state?: string;
  office_postal_code?: string;
  admin_name: string;
  admin_email: string;
  admin_phone?: string;
  admin_password: string;
  timezone?: string;
  locale?: string;
}

export interface PublicSignupData {
  company_id: string;
  role_id: string;
  admin_user_id: string;
  company_code: string;
  admin_email: string;
  plan_code?: string;
  plan_name?: string;
}

export interface GoogleOAuthStartPayload {
  companyCode: string;
  returnUrl: string;
}

export interface GoogleOAuthStartData {
  authorization_url: string;
  redirect_uri: string;
}

export interface PublicSignatureSignPayload {
  signer_name?: string;
  signer_document?: string;
}

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  company_code?: string;
  company_name?: string;
  role_name?: string;
  permissions?: string[];
}

export interface TenantLoginData {
  access_token: string;
  refresh_token: string;
  user: TenantUser;
}

export interface TenantAccount {
  id?: number;
  code?: string;
  name?: string;
}

export interface StoredSession {
  token: string;
  refreshToken: string;
  accountCode: string;
  user: TenantUser;
  account?: TenantAccount;
}
