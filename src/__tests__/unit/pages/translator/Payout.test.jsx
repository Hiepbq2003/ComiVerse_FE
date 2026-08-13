import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Payout from '../../../../pages/translator/Payout';

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'translator-1', role: 'TRANSLATOR', fullName: 'Test Translator' } }),
  AuthProvider: ({ children }) => <>{children}</>,
}));

vi.mock('../../../../services/api/PayoutApi', () => ({
  getCreatorPayoutAccountApi: vi.fn().mockResolvedValue({ status: 'ACTIVE', payoutsEnabled: true }),
  getCreatorPayoutOverviewApi: vi.fn().mockResolvedValue({
    eligibleMonths: [{ periodMonth: '2026-07', eligibleAmount: 150.0 }],
    history: []
  }),
  startCreatorPayoutOnboardingApi: vi.fn(),
  syncCreatorPayoutAccountApi: vi.fn(),
  createCreatorPayoutRequestApi: vi.fn().mockResolvedValue({ success: true })
}));

describe('Translator Payout Component', () => {
  it('Should render payout information and heading', async () => {
    render(
      <MemoryRouter>
        <Payout />
      </MemoryRouter>
    );
    
    expect(screen.getByText(/Payout/i)).toBeInTheDocument();
    expect(screen.getByText(/Translator Monthly Payout/i)).toBeInTheDocument();
  });
});
