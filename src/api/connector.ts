import apiClient from './axios';

/**
 * Website onboarding through the Tek Juice connector.
 *
 * The connector key is returned exactly once by `issueConnectorCredential`.
 * Callers must keep it in memory only: never persist it to localStorage,
 * sessionStorage, cookies, URLs or logs.
 */

export interface OwnershipChallenge {
  challenge_id: string;
  website_id: string;
  domain: string;
  method: 'dns_txt' | 'https_file';
  instructions: {
    record_name?: string;
    record_type?: string;
    record_value?: string;
    url?: string;
    file_contents?: string;
  };
  expires_at: string;
}

export interface IssuedConnectorCredential {
  credential_id: string;
  website_id: string;
  key: string;
  key_prefix: string;
  name: string;
  status: string;
  message: string;
}

export interface PublicationStatus {
  website_id: string;
  onboarding_status: string;
  publication_status: string;
  publication_ready: boolean;
  endpoint_host: string | null;
  capabilities: string[];
  contract_versions: string[];
  verified_at: string | null;
  failure_reason: string | null;
  last_error: string | null;
}

export async function createOwnershipChallenge(
  websiteId: string,
  method: OwnershipChallenge['method'],
): Promise<OwnershipChallenge> {
  const { data } = await apiClient.post<OwnershipChallenge>(
    `/api/v1/websites/${websiteId}/ownership-challenges`,
    { method },
  );
  return data;
}

export async function verifyOwnershipChallenge(
  websiteId: string,
  challengeId: string,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<Record<string, unknown>>(
    `/api/v1/websites/${websiteId}/ownership-challenges/${challengeId}/verify`,
  );
  return data;
}

export async function issueConnectorCredential(
  websiteId: string,
): Promise<IssuedConnectorCredential> {
  const { data } = await apiClient.post<IssuedConnectorCredential>(
    '/api/v1/connector/credentials',
    { website_id: websiteId },
  );
  return data;
}

export async function revokeConnectorCredential(websiteId: string): Promise<void> {
  await apiClient.delete(`/api/v1/connector/credentials/${websiteId}`);
}

export async function getPublicationStatus(websiteId: string): Promise<PublicationStatus> {
  const { data } = await apiClient.get<PublicationStatus>(
    `/api/v1/connector/websites/${websiteId}/publication`,
  );
  return data;
}

export async function reverifyPublication(websiteId: string): Promise<PublicationStatus> {
  const { data } = await apiClient.post<PublicationStatus>(
    `/api/v1/connector/websites/${websiteId}/publication/verify`,
  );
  return data;
}
