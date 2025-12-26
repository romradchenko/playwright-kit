export type UserError = Error & { readonly isUserError: true };

export function createUserError(message: string): UserError {
  const error = new Error(message) as UserError;
  (error as { isUserError: true }).isUserError = true;
  return error;
}

export function isUserError(error: unknown): error is UserError {
  return error instanceof Error && (error as { isUserError?: unknown }).isUserError === true;
}

