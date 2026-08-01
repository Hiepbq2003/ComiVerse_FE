import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Payout from '../../../../pages/translator/Payout';

describe('Translator Payout Component', () => {
  it('Should render payout information and banking details', () => {
    render(<Payout />);
    
    expect(screen.getByText(/Payout Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Minimum payout threshold/i)).toBeInTheDocument();
    expect(screen.getByText(/Linked Banking Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Vietcombank/i)).toBeInTheDocument();
  });

  it('Should handle payout request submission', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<Payout />);
    
    const submitBtn = screen.getByText('Submit Request');
    fireEvent.click(submitBtn);
    
    expect(alertMock).toHaveBeenCalledWith('Payout request submitted successfully!');
    alertMock.mockRestore();
  });
});
