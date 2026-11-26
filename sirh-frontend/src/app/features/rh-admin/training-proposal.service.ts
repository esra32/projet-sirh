import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TrainingProposalPayload {
  employeeId: string;
  candidateName: string;
  candidateEmail: string;
  targetPosition: string;
  missingSkill: string;
  currentLevel: string;
  requiredLevel: string;
  trainingTitle: string;
  platform: string;
  emailSubject: string;
  emailBody: string;
}

export interface TrainingProposalResult {
  sent: boolean;
  simulated: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class TrainingProposalService {
  private http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/training-proposals`;

  sendTrainingProposal(payload: TrainingProposalPayload): Observable<TrainingProposalResult> {
    return this.http.post<void>(this.endpoint, payload).pipe(
      map(() => ({ sent: true, simulated: false, message: 'Proposition de formation envoyee au collaborateur.' })),
      catchError(() => of({
        sent: true,
        simulated: true,
        message: 'Simulation d envoi email reussie pour la demo.',
      })),
    );
  }
}
