/** Human-readable message from an API error (Data Engine or FastAPI shape). */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response;
  const data = response?.data as
    | { error?: { message?: string }; detail?: unknown; message?: string }
    | undefined;
  if (data?.error?.message) return data.error.message;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data?.message === 'string') return data.message;
  if (response?.status === 403) return 'You do not have permission to do this. Ask an administrator.';
  return fallback;
}

export function apiErrorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}
