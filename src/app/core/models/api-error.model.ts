export interface FieldError {
  field: string | null;
  rejected_value: unknown;
  reason: string | null;
}

/** Shape shared by every 400 error the API returns; extra keys vary by exception type. */
export interface ApiErrorBody {
  timestamp: string;
  error?: string;
  field_errors?: FieldError[];
  [key: string]: unknown;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody | null,
  ) {
    super(ApiError.buildMessage(status, body));
  }

  private static buildMessage(status: number, body: ApiErrorBody | null): string {
    if (!body) return `Request failed with status ${status}`;
    if (body.field_errors?.length) {
      return body.field_errors
        .map((fe) => `${fe.field ?? 'body'}: ${fe.reason ?? 'invalid'}`)
        .join('; ');
    }
    return body.error ?? `Request failed with status ${status}`;
  }
}
