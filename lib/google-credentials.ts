import type { JWTInput } from "google-auth-library";

type ServiceAccountCredentials = JWTInput & {
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
};

function trimEnv(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function buildFromIndividualEnvVars(): ServiceAccountCredentials | null {
  const type = trimEnv(process.env.type);
  const project_id = trimEnv(process.env.project_id);
  const private_key = trimEnv(process.env.private_key)?.replace(/\\n/g, "\n");
  const client_email = trimEnv(process.env.client_email);

  if (!type || !project_id || !private_key || !client_email) {
    return null;
  }

  return {
    type,
    project_id,
    private_key_id: trimEnv(process.env.private_key_id),
    private_key,
    client_email,
    client_id: trimEnv(process.env.client_id),
    auth_uri:
      trimEnv(process.env.auth_uri) ??
      "https://accounts.google.com/o/oauth2/auth",
    token_uri:
      trimEnv(process.env.token_uri) ?? "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: trimEnv(
      process.env.auth_provider_x509_cert_url,
    ),
    client_x509_cert_url: trimEnv(process.env.client_x509_cert_url),
    universe_domain: trimEnv(process.env.universe_domain) ?? "googleapis.com",
  };
}

export function getGoogleServiceAccountCredentials(): ServiceAccountCredentials {
  const json = trimEnv(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (json) {
    try {
      const parsed = JSON.parse(json) as ServiceAccountCredentials;
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      }
      return parsed;
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
  }

  const fromEnv = buildFromIndividualEnvVars();
  if (fromEnv) return fromEnv;

  throw new Error(
    "Google service account credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON or individual service account env vars.",
  );
}

export function getGoogleSheetId(): string {
  const id = trimEnv(process.env.GOOGLE_SHEET_ID);
  if (!id) {
    throw new Error("GOOGLE_SHEET_ID is not set");
  }
  return id;
}

export function getGoogleSheetTabName(): string {
  return trimEnv(process.env.GOOGLE_SHEET_TAB_NAME) ?? "Sheet1";
}
