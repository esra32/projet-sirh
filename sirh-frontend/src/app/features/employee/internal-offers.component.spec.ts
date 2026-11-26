import { offerMatchesQuery, shouldDisplayOfferInEmployeeList } from './internal-offers.component';

describe('offerMatchesQuery', () => {
  it('matches an offer by its creation date', () => {
    const offer = {
      id: 'offer-1',
      title: 'Développeur Backend',
      description: 'Poste backend',
      department: 'Informatique',
      location: 'Tunis',
      status: 'PUBLISHED' as const,
      publishedDate: '2024-06-01',
      deadlineDate: '2024-07-01',
      createdAt: '2024-06-10T10:00:00',
      requiredSkills: []
    };

    expect(offerMatchesQuery(offer as any, '2024-06-10')).toBeTrue();
    expect(offerMatchesQuery(offer as any, '10/06/2024')).toBeTrue();
    expect(offerMatchesQuery(offer as any, 'développeur')).toBeTrue();
  });
});

describe('shouldDisplayOfferInEmployeeList', () => {
  it('shows offers that have been published and are ready for application', () => {
    const offer = {
      status: 'PENDING_VALIDATION' as const,
      publishedDate: '2026-07-26',
      createdAt: '2026-07-26T09:00:00'
    } as any;

    expect(shouldDisplayOfferInEmployeeList(offer)).toBeTrue();
  });

  it('keeps cancelled or closed offers hidden', () => {
    expect(shouldDisplayOfferInEmployeeList({ status: 'CANCELLED' } as any)).toBeFalse();
    expect(shouldDisplayOfferInEmployeeList({ status: 'CLOSED' } as any)).toBeFalse();
  });
});
