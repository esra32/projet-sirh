import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MarketOffer {
  id: string;
  title: string;
  company: string;
  city: string;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: string[];
  source: string;
  keyword: string;
  scrapedDate: string;
  description: string;
}

export interface MarketStats {
  salaryByTitle: Record<string, number>;
  topSkills: string[];
  totalOffers: number;
  citiesDistribution: Record<string, number>;
}

export interface ComparisonResult {
  title: string;
  marketAverage: number | null;
  internalSalary: number;
  difference: number | null;
  percentage: number | null;
  alert: boolean;
  recommendation: string;
}

export interface SyncResult {
  imported: number;
  keyword: string;
  message: string;
}

export interface MarketOffersPage {
  content: MarketOffer[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class MarketIntelligenceService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/market`;

  syncMarketData(keyword: string): Observable<SyncResult> {
    return this.http.get<SyncResult>(`${this.base}/sync?keyword=${encodeURIComponent(keyword)}`);
  }

  getMarketOffers(page = 0, size = 10): Observable<MarketOffersPage> {
    return this.http.get<MarketOffersPage>(`${this.base}/offers?page=${page}&size=${size}`);
  }

  getMarketStats(): Observable<MarketStats> {
    return this.http.get<MarketStats>(`${this.base}/stats`);
  }

  compareWithMarket(title: string, internalSalary: number): Observable<ComparisonResult> {
    return this.http.get<ComparisonResult>(
      `${this.base}/compare?title=${encodeURIComponent(title)}&internalSalary=${internalSalary}`
    );
  }

  clearOffers(): Observable<any> {
    return this.http.delete(`${this.base}/offers`);
  }

  getSkillsByKeyword(keyword: string): Observable<{ keyword: string; skills: string[]; marketOfferCount: number; hasData: boolean }> {
    return this.http.get<any>(`${this.base}/skills?keyword=${encodeURIComponent(keyword)}`);
  }
}