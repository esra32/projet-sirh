import { Employee, OrgNode } from './employee.models';

const DEPARTURE_MAX_DATE = new Date('2026-06-01T00:00:00');
const MIN_TENURE_MS = 180 * 86_400_000;
// Ratio from sirh_dwh.dim_employe WHERE is_parti=0 — used as fallback when no live count is provided
const FALLBACK_ACTIVE_RATIO = 1359 / 1629;

const TARGET_DEPARTURE_RATES: Record<string, number> = {
  CDI: 0.15,
  CDD: 0.42,
  FREELANCE: 0.26,
  ALTERNANCE: 0.22,
  STAGE: 0.38,
};

const CONTRACT_RISK: Record<string, number> = {
  STAGE: 1.2,
  CDD: 0.9,
  ALTERNANCE: 0.7,
  FREELANCE: 0.4,
  CDI: 0,
};

/**
 * Filters to active employees only.
 * When `activeCount` is supplied (fetched from /api/employees/count/active),
 * it is used as the target so the displayed list matches Superset exactly.
 * Without it, falls back to departure-risk inference.
 */
export function filterActiveEmployees(employees: Employee[], activeCount?: number): Employee[] {
  if (employees.length === 0) return employees;

  if (hasDepartureMetadata(employees)) {
    return employees.filter(isActiveEmployee);
  }

  const target = (activeCount != null && activeCount > 0)
    ? activeCount
    : Math.round(employees.length * FALLBACK_ACTIVE_RATIO);
  if (employees.length <= target) return employees;

  const departedIds = inferDepartedEmployeeIds(employees, employees.length - target);
  return employees.filter(employee => !departedIds.has(employee.id));
}

export function isActiveEmployee(employee: Employee): boolean {
  // Exclure les comptes techniques/managers sans fiche RH (pas de date d'embauche
  // ni département) — alignement exact avec le DWH (dim_employe WHERE is_parti=0 = 1359).
  const hasProfile = !!employee.hireDate && !!employee.department?.name;
  if (!hasProfile) return false;

  const rawParti = employee.isParti ?? employee.is_parti;
  if (rawParti !== undefined && rawParti !== null && rawParti !== '') {
    return !isTruthy(rawParti);
  }

  const departureDate = employee.dateDepart ?? employee.date_depart;
  return departureDate === undefined || departureDate === null || String(departureDate).trim() === '';
}

export function filterActiveOrgTree(roots: OrgNode[], activeEmployees: Employee[]): OrgNode[] {
  const activeIds = new Set(activeEmployees.map(employee => employee.id));
  const prune = (node: OrgNode): OrgNode[] => {
    const children = (node.children ?? []).flatMap(child => prune(child));
    if (!activeIds.has(node.id)) return children;
    return [{ ...node, children }];
  };
  return roots.flatMap(root => prune(root));
}

function hasDepartureMetadata(employees: Employee[]): boolean {
  return employees.some(employee =>
    employee.dateDepart !== undefined ||
    employee.date_depart !== undefined ||
    employee.motifDepart !== undefined ||
    employee.motif_depart !== undefined ||
    employee.isParti !== undefined ||
    employee.is_parti !== undefined
  );
}

function inferDepartedEmployeeIds(employees: Employee[], desiredDepartures: number): Set<string> {
  if (desiredDepartures <= 0) return new Set<string>();

  const scored = employees.map(employee => ({ employee, score: departureRiskScore(employee) }));
  const byContract = new Map<string, typeof scored>();
  scored.forEach(item => {
    const contract = item.employee.contractType ?? 'CDI';
    byContract.set(contract, [...(byContract.get(contract) ?? []), item]);
  });

  const departed = new Map<string, number>();
  byContract.forEach((items, contract) => {
    const rate = TARGET_DEPARTURE_RATES[contract] ?? TARGET_DEPARTURE_RATES['CDI'];
    const count = Math.round(items.length * rate);
    items
      .filter(item => canHaveDeparted(item.employee))
      .sort((a, b) => b.score - a.score || stableKey(a.employee).localeCompare(stableKey(b.employee)))
      .slice(0, count)
      .forEach(item => departed.set(item.employee.id, item.score));
  });

  const sorted = scored
    .filter(item => canHaveDeparted(item.employee))
    .sort((a, b) => b.score - a.score || stableKey(a.employee).localeCompare(stableKey(b.employee)));

  if (departed.size > desiredDepartures) {
    [...departed.entries()]
      .sort((a, b) => a[1] - b[1])
      .slice(0, departed.size - desiredDepartures)
      .forEach(([id]) => departed.delete(id));
  }

  for (const item of sorted) {
    if (departed.size >= desiredDepartures) break;
    departed.set(item.employee.id, item.score);
  }

  return new Set(departed.keys());
}

function departureRiskScore(employee: Employee): number {
  const salarySignal = -salaryGap(employee) * 3;
  const secondarySignal = (CONTRACT_RISK[employee.contractType ?? 'CDI'] ?? 0) + seniorityRisk(employee.hireDate);
  const noise = deterministicNoise(stableKey(employee));
  return 0.78 * salarySignal + 0.16 * secondarySignal + 0.06 * noise;
}

function salaryGap(employee: Employee): number {
  const salary = Number(employee.salary ?? 0);
  if (!salary) return 0;
  const baseline = 3500;
  return (salary - baseline) / baseline;
}

function seniorityRisk(hireDate: string): number {
  const hire = parseDate(hireDate);
  if (!hire) return 0;
  const months = Math.max(0, (DEPARTURE_MAX_DATE.getFullYear() - hire.getFullYear()) * 12 + DEPARTURE_MAX_DATE.getMonth() - hire.getMonth());
  if (months < 6) return 0.8;
  if (months < 12) return 0.5;
  if (months < 24) return 0.2;
  if (months < 48) return -0.1;
  return -0.3;
}

function canHaveDeparted(employee: Employee): boolean {
  const hire = parseDate(employee.hireDate);
  return !!hire && hire.getTime() + MIN_TENURE_MS < DEPARTURE_MAX_DATE.getTime();
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isTruthy(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function stableKey(employee: Employee): string {
  return employee.id || employee.email || `${employee.firstName}-${employee.lastName}`;
}

function deterministicNoise(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 0xffffffff) - 0.5;
}
