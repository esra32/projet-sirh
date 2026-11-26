import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Department, Employee, EmployeeRequest, EmployeeSkill, OrgNode, Position, ServiceUnit } from './employee.models';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class EmployeeService {
    private http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}`;

    // ── Employees ──────────────────────────────────────────────────
    getActiveEmployeeCount(): Observable<number> {
        return this.http.get<{ count: number }>(`${this.baseUrl}/employees/count/active`)
            .pipe(map(r => r.count), catchError(() => of(-1)));
    }

    getEmployees(search?: string, department?: string): Observable<Employee[]> {
        let params = new HttpParams();
        if (search) params = params.set('search', search);
        if (department) params = params.set('department', department);
        return this.http.get<Employee[]>(`${this.baseUrl}/employees`, { params });
    }

    getEmployeeById(id: string): Observable<Employee> {
        return this.http.get<Employee>(`${this.baseUrl}/employees/${id}`);
    }

    /**
     * Retourne la fiche de l'utilisateur connecté. Le backend la crée
     * automatiquement (fiche minimale) si elle n'existe pas encore.
     */
    getMyProfile(): Observable<Employee> {
        return this.http.get<Employee>(`${this.baseUrl}/employees/me`);
    }

    getEmployeeByEmail(email: string): Observable<Employee> {
        return this.http.get<Employee[]>(`${this.baseUrl}/employees`, {
            params: new HttpParams().set('search', email)
        }).pipe(
            map((list: Employee[]) => {
                const found = list.find((e: Employee) => e.email === email);
                if (!found) throw new Error('Employé introuvable');
                return found;
            })
        );
    }

    createEmployee(employee: EmployeeRequest): Observable<Employee> {
        return this.http.post<Employee>(`${this.baseUrl}/employees`, employee);
    }

    updateEmployee(id: string, employee: EmployeeRequest): Observable<Employee> {
        return this.http.put<Employee>(`${this.baseUrl}/employees/${id}`, employee);
    }

    deleteEmployee(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/employees/${id}`);
    }

    // ── Departments ────────────────────────────────────────────────
    getDepartments(): Observable<Department[]> {
        return this.http.get<Department[]>(`${this.baseUrl}/departments`);
    }

    getDepartmentById(id: string): Observable<Department> {
        return this.http.get<Department>(`${this.baseUrl}/departments/${id}`);
    }

    createDepartment(department: Omit<Department, 'id'>): Observable<Department> {
        return this.http.post<Department>(`${this.baseUrl}/departments`, department);
    }

    updateDepartment(id: string, department: Omit<Department, 'id'>): Observable<Department> {
        return this.http.put<Department>(`${this.baseUrl}/departments/${id}`, department);
    }

    deleteDepartment(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/departments/${id}`);
    }

    // ── Positions ──────────────────────────────────────────────────
    getPositions(departmentId?: string): Observable<Position[]> {
        let params = new HttpParams();
        if (departmentId) params = params.set('departmentId', departmentId);
        return this.http.get<Position[]>(`${this.baseUrl}/positions`, { params });
    }

    getPositionById(id: string): Observable<Position> {
        return this.http.get<Position>(`${this.baseUrl}/positions/${id}`);
    }

    createPosition(position: Omit<Position, 'id'>): Observable<Position> {
        return this.http.post<Position>(`${this.baseUrl}/positions`, position);
    }

    updatePosition(id: string, position: Omit<Position, 'id'>): Observable<Position> {
        return this.http.put<Position>(`${this.baseUrl}/positions/${id}`, position);
    }

    deletePosition(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/positions/${id}`);
    }

    // ── Services (ServiceUnit) ─────────────────────────────────────
    getServices(departmentId?: string): Observable<ServiceUnit[]> {
        let params = new HttpParams();
        if (departmentId) params = params.set('departmentId', departmentId);
        return this.http.get<ServiceUnit[]>(`${this.baseUrl}/services`, { params });
    }

    createService(s: Partial<ServiceUnit>): Observable<ServiceUnit> {
        return this.http.post<ServiceUnit>(`${this.baseUrl}/services`, s);
    }

    updateService(id: string, s: Partial<ServiceUnit>): Observable<ServiceUnit> {
        return this.http.put<ServiceUnit>(`${this.baseUrl}/services/${id}`, s);
    }

    deleteService(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/services/${id}`);
    }

    // ── OrgChart ───────────────────────────────────────────────────
    /** Retourne l'arbre hiérarchique complet basé sur managerId. */
    getOrgTree(): Observable<OrgNode[]> {
        return this.http.get<OrgNode[]>(`${this.baseUrl}/orgchart/tree`);
    }

    // ── Employee Skills ────────────────────────────────────────────
    getEmployeeSkills(id: string): Observable<EmployeeSkill[]> {
        return this.http.get<EmployeeSkill[]>(`${this.baseUrl}/employees/${id}/skills`);
    }

    updateEmployeeSkills(id: string, skills: EmployeeSkill[]): Observable<EmployeeSkill[]> {
        return this.http.put<EmployeeSkill[]>(`${this.baseUrl}/employees/${id}/skills`, skills);
    }
}