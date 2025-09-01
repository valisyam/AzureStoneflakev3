export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*/.test(error.message) || error.message.includes('Unauthorized');
}

export function getAuthToken(): string | null {
  return localStorage.getItem('stoneflake_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('stoneflake_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('stoneflake_token');
}
