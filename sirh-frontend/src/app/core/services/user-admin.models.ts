export interface SirhUser {
  id: string;
  email: string;
  roles: string[];
}

export type SirhRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN';
