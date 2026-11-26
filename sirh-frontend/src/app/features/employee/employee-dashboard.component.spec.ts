import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeeDashboardComponent } from './employee-dashboard.component';

describe('EmployeeDashboardComponent', () => {
  let fixture: ComponentFixture<EmployeeDashboardComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeDashboardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(EmployeeDashboardComponent);
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render three info cards', () => {
    const cards = compiled.querySelectorAll('.card');
    expect(cards.length).toBe(3);
  });

  it('should display Opportunites section', () => {
    expect(compiled.textContent).toContain('Opportunites');
  });

  it('should display candidatures section', () => {
    expect(compiled.textContent).toContain('candidatures');
  });

  it('should display News section', () => {
    expect(compiled.textContent).toContain('News');
  });
});
