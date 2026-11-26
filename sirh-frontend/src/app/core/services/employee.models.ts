export interface Department {
    id: string;
    name: string;
    description: string;
    managerEmployeeId?: string | null;
    managerName?: string | null;
}

export interface Position {
    id: string;
    title: string;
    description: string;
    departmentId: string;
}

export type ContractType = 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE' | 'ALTERNANCE';

export type SkillLevel = 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE' | 'EXPERT';

export interface EmployeeSkill {
    id?: string;
    skillName: string;
    level: SkillLevel;
}

export interface ServiceUnit {
    id: string;
    name: string;
    description?: string;
    departmentId?: string;
    departmentName?: string;
    parentServiceId?: string | null;
    parentServiceName?: string | null;
}

export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string | null;
    city?: string | null;
    salary?: number | null;
    hireDate: string;
    department: Department;
    position: Position;
    contractType: ContractType;
    serviceId?: string | null;
    serviceName?: string | null;
    managerId?: string | null;
    managerName?: string | null;
    dateDepart?: string | null;
    date_depart?: string | null;
    motifDepart?: string | null;
    motif_depart?: string | null;
    isParti?: boolean | number | string | null;
    is_parti?: boolean | number | string | null;
    skills?: EmployeeSkill[];
}

export interface EmployeeRequest {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    salary?: number | null;
    hireDate?: string | null;
    departmentId?: string | null;
    positionId?: string | null;
    contractType?: ContractType | null;
    serviceId?: string | null;
    managerId?: string | null;
}

/** Nœud de l'organigramme hiérarchique (tree JSON du backend). */
export interface OrgNode {
    id: string;
    firstName: string;
    lastName: string;
    positionTitle?: string;
    departmentName?: string;
    departmentId?: string;
    serviceName?: string;
    serviceId?: string;
    email?: string;
    phone?: string;
    contractType?: string;
    managerId?: string | null;
    children: OrgNode[];
}
