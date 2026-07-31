import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import GenreManagement from '../../../../pages/moderator/GenreManagement';
import * as GenreApi from '../../../../services/api/GenreApi';
import { toast } from 'react-toastify';

vi.mock('../../../../services/api/GenreApi', () => ({
  getAllGenresApi: vi.fn(),
  createGenreApi: vi.fn(),
  updateGenreApi: vi.fn(),
  deleteGenreApi: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Genre Management Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (comics = []) => {
    return render(<GenreManagement comics={comics} />);
  };

  it('Should fetch and display genres', async () => {
    GenreApi.getAllGenresApi.mockResolvedValueOnce([
      { id: '1', name: 'Action', slug: 'action' },
      { id: '2', name: 'Comedy', slug: 'comedy' },
    ]);

    renderComponent([
      { id: 'c1', title: 'Comic 1', genres: [{ name: 'Action' }] }
    ]);

    expect(await screen.findByText('Action')).toBeInTheDocument();
    expect(await screen.findByText('Comedy')).toBeInTheDocument();
  });

  it('Should open add modal and create a new genre', async () => {
    GenreApi.getAllGenresApi.mockResolvedValueOnce([]);
    GenreApi.createGenreApi.mockResolvedValueOnce({ id: '3', name: 'Fantasy', slug: 'fantasy' });

    renderComponent();

    // Click add genre button
    const addBtn = await screen.findByText(/Add Genre/i);
    fireEvent.click(addBtn);

    // Verify modal is open
    expect(await screen.findByText('Create New Genre')).toBeInTheDocument();

    // Type new genre
    const input = screen.getByPlaceholderText('e.g. Action, Comedy, Fantasy');
    fireEvent.change(input, { target: { value: 'Fantasy' } });

    // Click create
    const createBtn = screen.getByText('Create');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(GenreApi.createGenreApi).toHaveBeenCalledWith({ name: 'Fantasy', slug: 'fantasy' });
      expect(toast.success).toHaveBeenCalledWith('Genre added successfully!');
    });

    // Check if added to UI
    expect(await screen.findByText('Fantasy')).toBeInTheDocument();
  });
});
