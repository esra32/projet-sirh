import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SirhRole, SirhUser } from './user-admin.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth/users`;

  getUsers(): Observable<SirhUser[]> {
    return this.http.get<SirhUser[]>(this.baseUrl);
  }

  updateRoles(userId: string, roles: SirhRole[]): Observable<SirhUser> {
    return this.http.patch<SirhUser>(`${this.baseUrl}/${userId}/roles`, roles);
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${userId}`);
  }
}
