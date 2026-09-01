export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
};

export type AuthSessionResponse = {
  message: string;
  access_token: string | null;
  refresh_token?: string | null;
  user: AuthUser;
};

export function getSafeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}
