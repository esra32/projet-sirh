import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { homeRedirectGuard } from './core/auth/home-redirect.guard';
import { roleGuard } from './core/auth/role.guard';
import { LoginPageComponent } from './features/auth/login.page';
import { RegisterPageComponent } from './features/auth/register.page';
import { CandidateReviewComponent } from './features/manager/candidate-review.component';
import { ManagerDashboardComponent } from './features/manager/manager-dashboard.component';
import { PostingBoardComponent } from './features/manager/posting-board.component';
import { TeamReportsComponent } from './features/manager/team-reports.component';
import { DirectoryComponent } from './features/employee/directory.component';
import { EmployeeDashboardComponent } from './features/employee/employee-dashboard.component';
import { EmployeeProfileComponent } from './features/employee/employee-profile.component';
import { InternalOffersComponent } from './features/employee/internal-offers.component';
import { MyApplicationsComponent } from './features/employee/my-applications.component';
import { InterviewsComponent } from './features/employee/interviews.component';
import { ContractsComponent } from './features/rh-admin/contracts.component';
import { DepartmentsComponent } from './features/rh-admin/departments.component';
import { PositionsComponent } from './features/rh-admin/positions.component';
import { RecruitmentOversightComponent } from './features/rh-admin/recruitment-oversight.component';
import { RhDashboardComponent } from './features/rh-admin/rh-dashboard.component';
import { UsersPermissionsComponent } from './features/rh-admin/users-permissions.component';
import { MobilityPoliciesComponent } from './features/rh-admin/mobility-policies.component';
import { MobilityRequestsComponent } from './features/rh-admin/mobility-requests.component';
import { MyMobilityComponent } from './features/employee/my-mobility.component';
import { TeamMobilityComponent } from './features/manager/team-mobility.component';
import { TalentTrackingComponent } from './features/manager/talent-tracking.component';
import { OrgchartComponent } from './features/rh-admin/orgchart.component';
import { EmployeeMatchingComponent } from './features/rh-admin/employee-matching.component';
import { MatchingTabsComponent } from './features/rh-admin/matching-tabs.component';
import { MainLayoutComponent, NavLink } from './shared/layout/main-layout.component';
import { NotFoundComponent } from './shared/ui/not-found.component';
import { environment } from '../environments/environment';

const employeeLinks: NavLink[] = [
	{ label: 'Dashboard', path: '/employee' },
	{ label: 'Profil', path: '/employee/profil' },
	{ label: 'Offres internes', path: '/employee/offres' },
	{ label: 'Mes candidatures', path: '/employee/candidatures' },
	{ label: 'Ma mobilité', path: '/employee/mobilite' },
	{ label: 'Mes entretiens', path: '/employee/entretiens' },
	{ label: 'Organigramme', path: '/employee/organigramme' },
	{ label: 'Annuaire', path: '/employee/annuaire' },
];

const managerLinks: NavLink[] = [
	{ label: 'Dashboard', path: '/manager' },
	{ label: 'Profil', path: '/manager/profil' },
	{ label: 'Mes offres', path: '/manager/postes' },
	{ label: 'Candidatures', path: '/manager/candidatures' },
	{ label: 'Talents', path: '/manager/talents' },
	{ label: 'Mobilité équipe', path: '/manager/mobilite' },
	{ label: 'Rapports equipe', path: '/manager/rapports' },
];

const rhLinks: NavLink[] = [
	{ label: 'Dashboard', path: '/rh-admin' },
	{ label: 'Profil', path: '/rh-admin/profil' },
	{ label: 'Departements', path: '/rh-admin/departements' },
	{ label: 'Postes', path: '/rh-admin/postes' },
	{ label: 'Contrats', path: '/rh-admin/contrats' },
	{ label: 'Recrutement interne', path: '/rh-admin/recrutement' },
	{ label: 'Mobilité', path: '/rh-admin/mobilite' },
	{ label: 'Politiques mobilité', path: '/rh-admin/mobilite-politiques' },
	{ label: 'Matching Employés', path: '/rh-admin/matching' },
	{ label: 'BI Analytics', externalUrl: environment.supersetDashboardUrl },
	{ label: 'dbt Lineage', externalUrl: environment.dbtDocsUrl },
	{ label: 'Apache Airflow', externalUrl: environment.airflowUrl },
	{ label: 'Utilisateurs', path: '/rh-admin/utilisateurs' },
];

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		canActivate: [homeRedirectGuard],
		loadComponent: () => import('./features/home/home.page').then((m) => m.HomePageComponent),
	},
	{ path: 'auth/login', component: LoginPageComponent },
	{ path: 'auth/register', component: RegisterPageComponent },
	{
		path: 'offres',
		loadComponent: () => import('./features/public/public-offers.page').then(m => m.PublicOffersPageComponent),
	},
	{
		path: 'postuler',
		loadComponent: () => import('./features/public/public-apply.page').then(m => m.PublicApplyPageComponent),
	},
	{
		path: 'postuler/:offerId',
		loadComponent: () => import('./features/public/public-apply.page').then(m => m.PublicApplyPageComponent),
	},
	{
		path: 'employee',
		component: MainLayoutComponent,
		canActivate: [authGuard, roleGuard],
		data: {
			roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
			title: 'Espace Employe',
			subtitle: 'Parcours et opportunites',
			links: employeeLinks,
		},
		children: [
			{ path: '', component: EmployeeDashboardComponent },
			{ path: 'profil', component: EmployeeProfileComponent },
			{ path: 'offres', component: InternalOffersComponent },
			{ path: 'candidatures', component: MyApplicationsComponent },
			{ path: 'mobilite', component: MyMobilityComponent },
			{ path: 'entretiens', component: InterviewsComponent },
			{ path: 'organigramme', component: OrgchartComponent },
			{ path: 'annuaire', component: DirectoryComponent },
		],
	},
	{
		path: 'manager',
		component: MainLayoutComponent,
		canActivate: [authGuard, roleGuard],
		data: {
			roles: ['MANAGER', 'HR_ADMIN'],
			title: 'Espace Manager',
			subtitle: 'Equipe et recrutement',
			links: managerLinks,
		},
		children: [
			{ path: '', component: ManagerDashboardComponent },
			{ path: 'profil', component: EmployeeProfileComponent },
			{ path: 'postes', component: PostingBoardComponent },
			{ path: 'candidatures', component: CandidateReviewComponent },
			{ path: 'talents', component: TalentTrackingComponent },
			{ path: 'mobilite', component: TeamMobilityComponent },
			{ path: 'rapports', component: TeamReportsComponent },
		],
	},
	{
		path: 'rh-admin',
		component: MainLayoutComponent,
		canActivate: [authGuard, roleGuard],
		data: {
			roles: ['HR_ADMIN'],
			title: 'Espace RH',
			subtitle: 'Gouvernance et reporting',
			links: rhLinks,
		},
		children: [
			{ path: '', component: RhDashboardComponent },
			{ path: 'profil', component: EmployeeProfileComponent },
			{ path: 'departements', component: DepartmentsComponent },
			{ path: 'postes', component: PositionsComponent },
			{ path: 'contrats', component: ContractsComponent },
			{ path: 'recrutement', component: RecruitmentOversightComponent },
			{ path: 'mobilite', component: MobilityRequestsComponent },
			{ path: 'mobilite-politiques', component: MobilityPoliciesComponent },
			{ path: 'matching', component: MatchingTabsComponent },
			{ path: 'utilisateurs', component: UsersPermissionsComponent },
		],
	},
	{ path: '**', component: NotFoundComponent },
];
