/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Structured provisioning errors.
 *
 * Error messages are safe to persist and log: callers must pass already
 * sanitized text. Never put access tokens, database passwords, API keys or
 * secret values into an error message.
 */

export class ProvisioningError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "ProvisioningError";
  }
}

export class ValidationError extends ProvisioningError {
  constructor(message: string) {
    super("VALIDATION_FAILED", message, true);
    this.name = "ValidationError";
  }
}

export class TemplateChecksumError extends ProvisioningError {
  constructor(message: string) {
    super("TEMPLATE_CHECKSUM_MISMATCH", message, false);
    this.name = "TemplateChecksumError";
  }
}

export class ProjectNotReadyError extends ProvisioningError {
  constructor(message: string) {
    super("PROJECT_NOT_READY", message, true);
    this.name = "ProjectNotReadyError";
  }
}

export class ProjectStateError extends ProvisioningError {
  constructor(message: string) {
    super("PROJECT_TERMINAL_STATE", message, false);
    this.name = "ProjectStateError";
  }
}

export class ReauthorizationRequiredError extends ProvisioningError {
  constructor(message = "Supabase authorization expired or revoked") {
    super("OAUTH_REAUTHORIZATION_REQUIRED", message, false);
    this.name = "ReauthorizationRequiredError";
  }
}

export class ProviderConfigurationError extends ProvisioningError {
  constructor(message: string) {
    super("PROVIDER_CONFIGURATION_INVALID", message, false);
    this.name = "ProviderConfigurationError";
  }
}

export class ProviderDisabledError extends ProvisioningError {
  constructor(message = "Tenant provisioning provider is disabled") {
    super("PROVIDER_DISABLED", message, false);
    this.name = "ProviderDisabledError";
  }
}

export class MockProviderNotAllowedError extends ProvisioningError {
  constructor(message = "MockProvider is test-only and is not allowed in this runtime") {
    super("MOCK_PROVIDER_NOT_ALLOWED", message, false);
    this.name = "MockProviderNotAllowedError";
  }
}

export class TenantDatabaseConflictError extends ProvisioningError {
  constructor(message: string) {
    super("TENANT_DATABASE_CONFLICT", message, false);
    this.name = "TenantDatabaseConflictError";
  }
}

export class TenantProjectMissingError extends ProvisioningError {
  constructor(message: string) {
    super("TENANT_PROJECT_MISSING", message, false);
    this.name = "TenantProjectMissingError";
  }
}

export class PublishableKeyMissingError extends ProvisioningError {
  constructor(message = "No publishable (anon) API key was returned for the tenant project") {
    super("PUBLISHABLE_KEY_MISSING", message, false);
    this.name = "PublishableKeyMissingError";
  }
}

export class TemplateLedgerError extends ProvisioningError {
  constructor(message: string) {
    super("TEMPLATE_LEDGER_ERROR", message, false);
    this.name = "TemplateLedgerError";
  }
}

export class VerificationError extends ProvisioningError {
  constructor(message: string) {
    super("TEMPLATE_VERIFICATION_FAILED", message, false);
    this.name = "VerificationError";
  }
}

export class TemplateInstallError extends ProvisioningError {
  constructor(message: string, retryable = false) {
    super("TEMPLATE_INSTALL_FAILED", message, retryable);
    this.name = "TemplateInstallError";
  }
}

export class TenantInitializationError extends ProvisioningError {
  constructor(message: string, retryable = false) {
    super("TENANT_INITIALIZATION_FAILED", message, retryable);
    this.name = "TenantInitializationError";
  }
}

export class SecretStoreError extends ProvisioningError {
  constructor(message: string) {
    super("SECRET_STORE_ERROR", message, false);
    this.name = "SecretStoreError";
  }
}

export class ManagementApiRequiredError extends ProvisioningError {
  constructor(message = "Management API client is not available; ensure_oauth must run first") {
    super("MANAGEMENT_API_NOT_READY", message, false);
    this.name = "ManagementApiRequiredError";
  }
}
