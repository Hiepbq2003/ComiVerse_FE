import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ComicCard from '../../../../components/common/ComicCard';
import { MemoryRouter } from 'react-router-dom';

describe('Common Components - Edge Cases & Security', () => {
  describe('ComicCard - Data Boundary & Sanitization', () => {
    it('Should gracefully handle exceptionally long titles without breaking layout', () => {
      const longTitle = 'A'.repeat(500); // 500 characters
      const comicData = {
        id: 'c1',
        title: longTitle,
        coverImage: '/test.jpg',
        author: 'Test Author',
        views: 100,
        rating: 4.5
      };

      render(
        <MemoryRouter>
          <ComicCard comic={comicData} />
        </MemoryRouter>
      );

      const titleEl = screen.getByText(longTitle);
      expect(titleEl).toBeInTheDocument();
      // Normally, CSS (line-clamp or text-overflow) handles the visual aspect, 
      // but we ensure React doesn't crash on huge props.
    });

    it('Should safely handle XSS payloads in author names and titles', () => {
      const xssPayload = '"><script>alert(1)</script>';
      const comicData = {
        id: 'c2',
        title: xssPayload,
        coverImage: '/test.jpg',
        author: xssPayload,
        views: 100,
        rating: 4.5
      };

      render(
        <MemoryRouter>
          <ComicCard comic={comicData} />
        </MemoryRouter>
      );

      // Verify the literal text is rendered (escaped by React), not injected as HTML
      expect(screen.getByText(xssPayload)).toBeInTheDocument();
    });

    it('Should fallback gracefully if numerical fields like views or rating are missing or null', () => {
      const comicData = {
        id: 'c3',
        title: 'Broken Stats',
        coverImage: '/test.jpg',
        author: 'Author',
        views: null,
        rating: null
      };

      render(
        <MemoryRouter>
          <ComicCard comic={comicData} />
        </MemoryRouter>
      );

      // Verify the component renders without crashing
      expect(screen.getByText('Broken Stats')).toBeInTheDocument();
    });
  });
});
