export type AuthenticatedUser = {
  userId: string;
  username?: string;
  role?: string;
  permissions?: string[];
};
