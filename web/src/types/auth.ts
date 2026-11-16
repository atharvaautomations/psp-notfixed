export type UserRole =
  | 'STORES'
  | 'RUBBER_TECHNOLOGIST'
  | 'OPERATOR'
  | 'QUALITY_CONTROL'
  | 'SUPER_ADMIN';

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
