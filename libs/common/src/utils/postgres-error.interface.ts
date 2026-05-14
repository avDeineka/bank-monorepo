export interface PostgresError extends Error {
  code?: string;
  detail?: string;
  table?: string;
  constraint?: string;
}

export function getErrorMessage(error: unknown) {
  const postgresError = asPostgresError(error);

  if (postgresError?.code === '23505') {
    const duplicateField = getConstraintField(postgresError.constraint);
    if (duplicateField) {
      return `such ${duplicateField} already exists`;
    }
    return 'duplicate value violates unique constraint';
  }

  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
    if (typeof message === 'object' && message !== null && 'message' in message) {
      const nestedMessage = (message as { message?: unknown }).message;
      if (typeof nestedMessage === 'string') {
        return nestedMessage;
      }
    }
  }
  return String(error);
}

function asPostgresError(error: unknown): PostgresError | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  return error as PostgresError;
}

function getConstraintField(constraint ?: string) {
  if (!constraint) {
    return null;
  }

  const match = constraint.match(/_(.+?)_key$/);
  return match?.[1] ?? null;
}

