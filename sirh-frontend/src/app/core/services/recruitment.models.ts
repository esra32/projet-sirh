export interface Skill {
    id: string;
    name: string;
}

export type OfferStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED' | 'PENDING_VALIDATION';

export interface JobOffer {
    id: string;
    title: string;
    description: string;
    department: string;
    location: string;
    status: OfferStatus;
    publishedDate: string | null;
    deadlineDate: string | null;
    createdAt: string;
    requiredSkills: Skill[];
    createdByEmail?: string;
    createdByName?: string;
}

export type ApplicationStatus = 'PENDING' | 'REVIEWING' | 'INTERVIEW_SCHEDULED' | 'ACCEPTED' | 'REJECTED';
export type ApplicationSource = 'INTERNAL' | 'EXTERNAL';

export interface ApplicationStatusUpdateRequest {
    status: string;
    interviewDate?: string;
    interviewLocation?: string;
    interviewerName?: string;
    interviewInstructions?: string;
    rejectionReason?: string;
}

export interface CandidateProfile {
    competences: string[];
    anneesExperience: number;
    niveau: string;
    formation: string;
    langues: string[];
    softSkills: string[];
    resumeProfil: string;
}

export interface Application {
    id: string;
    jobOfferId: string;
    jobOfferTitle: string;
    applicantEmail: string;
    applicantName: string;
    coverLetter: string;
    cvUrl?: string;
    cvFileName?: string;
    status: ApplicationStatus;
    appliedDate: string;
    skills: Skill[];
    matchScore: number;
    candidateProfile?: CandidateProfile;
    source?: ApplicationSource;
}