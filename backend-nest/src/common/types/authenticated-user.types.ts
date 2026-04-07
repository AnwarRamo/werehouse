export type AuthenticatedUser = {
  userId: string;
  username?: string;
  email?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
};
