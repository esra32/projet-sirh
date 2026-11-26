import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface MobilityPolicy {
  minimumSeniorityMonths: number;
  allowedContractTypes: string[];
  maxSimultaneousApplications: number;
  cooldownAfterRejectionDays: number;
  interDepartmentAllowed: boolean;
  internationalAllowed: boolean;
  managerApprovalRequired: boolean;
  notifyHrOnApplication: boolean;
}

export type MobilityStatus = 'PENDING' | 'MANAGER_APPROVED' | 'APPROVED' | 'REJECTED';

export interface MobilityRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  currentDepartment: string;
  currentPosition: string;
  targetDepartment: string;
  targetPosition: string;
  reason: string;
  status: MobilityStatus;
  requestDate: string;
  processedDate: string | null;
  processedByEmail: string | null;
  hrComment: string | null;
}

export interface MobilityCreateRequest {
  employeeId: string;
  targetDepartment?: string;
  targetPosition?: string;
  reason: string;
}

export interface MobilityStatusUpdateRequest {
  status: MobilityStatus;
  hrComment?: string;
  processedByEmail?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MobilityService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/mobility`;

  // ── Politique ──────────────────────────────────────────────────────────────

  getPolicy(): Observable<MobilityPolicy> {
    return this.http.get<MobilityPolicy>(`${this.base}/policy`);
  }

  savePolicy(policy: MobilityPolicy): Observable<MobilityPolicy> {
    return this.http.put<MobilityPolicy>(`${this.base}/policy`, policy);
  }

  // ── Demandes ───────────────────────────────────────────────────────────────

  getAll(status?: MobilityStatus): Observable<MobilityRequest[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<MobilityRequest[]>(this.base, { params });
  }

  getMyRequests(email: string): Observable<MobilityRequest[]> {
    return this.http.get<MobilityRequest[]>(`${this.base}/my`, {
      params: new HttpParams().set('email', email),
    });
  }

  getByEmployee(employeeId: string): Observable<MobilityRequest[]> {
    return this.http.get<MobilityRequest[]>(`${this.base}/employee/${employeeId}`);
  }

  getTeamRequests(managerEmail: string): Observable<MobilityRequest[]> {
    return this.http.get<MobilityRequest[]>(`${this.base}/team`, {
      params: new HttpParams().set('managerEmail', managerEmail)
    });
  }

  create(req: MobilityCreateRequest): Observable<MobilityRequest> {
    return this.http.post<MobilityRequest>(this.base, req);
  }

  updateStatus(id: string, req: MobilityStatusUpdateRequest): Observable<MobilityRequest> {
    return this.http.put<MobilityRequest>(`${this.base}/${id}/status`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  deleteRejected(employeeEmail: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/rejected`, {
      params: new HttpParams().set('employeeEmail', employeeEmail)
    });
  }
}