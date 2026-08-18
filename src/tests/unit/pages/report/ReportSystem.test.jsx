import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LeaderReports from '../../../../pages/translator/LeaderReports';
import ModeratorReports from '../../../../pages/moderator/ModeratorReports';
import ReportCategories from '../../../../pages/moderator/ReportCategories';
import TranslationSplitScreenReview from '../../../../components/report/TranslationSplitScreenReview';
import ContentInspectionModal from '../../../../components/report/ContentInspectionModal';
import CategoryModal from '../../../../components/report/CategoryModal';
import ReportSubmitModal from '../../../../components/report/ReportSubmitModal';
import * as ReportApi from '../../../../services/api/ReportApi';
import * as ChapterApi from '../../../../services/api/ChapterApi';
import * as AuthUtils from '../../../../utils/Auth';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../../../services/api/ChapterApi', () => ({
  getChapterTranslationByIdApi: vi.fn().mockResolvedValue({ data: null }),
  getChapterDetailApi: vi.fn().mockResolvedValue({ data: null }),
  getChapterTranslationsApi: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../../../../services/api/ReportApi', () => ({
  getActiveReportCategoriesApi: vi.fn(),
  getAdminReportsApi: vi.fn(),
  getReportDetailApi: vi.fn(),
  processReportApi: vi.fn(),
  getAllReportCategoriesApi: vi.fn(),
  createReportCategoryApi: vi.fn(),
  updateReportCategoryApi: vi.fn(),
  deleteReportCategoryApi: vi.fn(),
  createReportApi: vi.fn(),
}));

vi.mock('../../../../utils/Auth', () => ({
  getAuth: vi.fn(),
  clearAuth: vi.fn(),
  setAuth: vi.fn(),
}));

describe('Report System - Comprehensive Test Suite with Reader Reporting', () => {
  const mockCategories = [
    {
      id: 'cat-1',
      name: 'Translation Accuracy / Grammar Error',
      description: 'Severe semantic mistranslations',
      assigned_role: 'PROJECT_LEADER',
      target_types: ['CHAPTER_TRANSLATIONS'],
      is_active: true
    },
    {
      id: 'cat-3',
      name: 'Image Corruption / Broken Pages',
      description: 'Image missing 404 or corrupted',
      assigned_role: 'MODERATOR',
      target_types: ['CHAPTER', 'COMIC'],
      is_active: true
    }
  ];

  const mockReports = [
    {
      id: 'rep-101',
      reporter_id: 'user-1',
      reporter_name: 'John Reader',
      reporter_avatar: 'avatar1.jpg',
      reporter_email: 'john@example.com',
      target_type: 'CHAPTER_TRANSLATIONS',
      target_id: 'trans-101',
      target_title: 'Martial Peak - Chapter 124',
      target_url: '/comic/1/chapter/124',
      category_id: 'cat-1',
      category_name: 'Translation Accuracy / Grammar Error',
      assigned_role: 'PROJECT_LEADER',
      status: 'PENDING',
      description_text: 'Mistranslated lines on page 3 and 5',
      created_at: '2026-08-07T14:20:00Z',
      raw_pages: [
        { page_number: 1, image_url: 'raw1.jpg', label: 'Page 1' },
        { page_number: 2, image_url: 'raw2.jpg', label: 'Page 2' }
      ],
      translated_pages: [
        { page_number: 1, image_url: 'trans1.jpg', label: 'Page 1' },
        { page_number: 2, image_url: 'trans2.jpg', label: 'Page 2' }
      ]
    },
    {
      id: 'rep-103',
      reporter_id: 'user-2',
      reporter_name: 'Alice Cooper',
      reporter_avatar: 'avatar2.jpg',
      reporter_email: 'alice@example.com',
      target_type: 'CHAPTER',
      target_id: 'chap-52',
      target_title: 'The Great Demon King - Chapter 52',
      target_url: '/comic/3/chapter/52',
      category_id: 'cat-3',
      category_name: 'Image Corruption / Broken Pages',
      assigned_role: 'MODERATOR',
      status: 'PENDING',
      description_text: 'Chapter 52 images corrupted on pages 1-5',
      created_at: '2026-08-08T01:10:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn().mockReturnValue(true);
    AuthUtils.getAuth.mockReturnValue({ token: 'mock-jwt-token', user: { id: 'reader-1' } });

    ReportApi.getActiveReportCategoriesApi.mockResolvedValue(mockCategories);
    ReportApi.getAllReportCategoriesApi.mockResolvedValue(mockCategories);
    ReportApi.getAdminReportsApi.mockResolvedValue({
      reports: mockReports,
      total: mockReports.length,
      page: 1,
      limit: 10
    });
    ReportApi.processReportApi.mockResolvedValue({ success: true });
    ReportApi.createReportCategoryApi.mockResolvedValue({ id: 'cat-new', name: 'New Category' });
    ReportApi.updateReportCategoryApi.mockResolvedValue({ success: true });
    ReportApi.deleteReportCategoryApi.mockResolvedValue({ success: true });
    ReportApi.createReportApi.mockResolvedValue({ id: 'rep-new', success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ── 1. LEADER REPORTS SCREEN ── */
  describe('1. LeaderReports Screen', () => {
    it('renders report dashboard with status filter tabs and table', async () => {
      render(
        <MemoryRouter>
          <LeaderReports />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Translation Review & Reports Dashboard/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Martial Peak - Chapter 124')).toBeInTheDocument();
      expect(screen.getByText('John Reader')).toBeInTheDocument();
      expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
    });

    it('filters reports when searching by text query', async () => {
      render(
        <MemoryRouter>
          <LeaderReports />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Martial Peak - Chapter 124')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by comic title/i);
      fireEvent.change(searchInput, { target: { value: 'Martial Peak' } });

      await waitFor(() => {
        expect(ReportApi.getAdminReportsApi).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'Martial Peak' })
        );
      });
    });

    it('opens Translation Split-Screen Review modal when clicking "Review Translation"', async () => {
      render(
        <MemoryRouter>
          <LeaderReports />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Martial Peak - Chapter 124')).toBeInTheDocument();
      });

      const reviewBtns = screen.getAllByRole('button', { name: /Review Translation/i });
      fireEvent.click(reviewBtns[0]);

      await waitFor(() => {
        expect(screen.getByText(/RAW BENCHMARK \(ORIGINAL\)/i)).toBeInTheDocument();
        expect(screen.getByText(/TRANSLATION & TYPESET/i)).toBeInTheDocument();
      });
    });
  });

  /* ── 2. TRANSLATION SPLIT-SCREEN COMPONENT ── */
  describe('2. TranslationSplitScreenReview Component', () => {
    it('renders side-by-side columns and toggles synchronized scroll', () => {
      const handleClose = vi.fn();
      const handleProcess = vi.fn().mockResolvedValue({ success: true });

      render(
        <TranslationSplitScreenReview
          report={mockReports[0]}
          onClose={handleClose}
          onProcess={handleProcess}
        />
      );

      expect(screen.getByText(/RAW BENCHMARK \(ORIGINAL\)/i)).toBeInTheDocument();
      expect(screen.getByText(/TRANSLATION & TYPESET/i)).toBeInTheDocument();

      const syncBtn = screen.getByTitle(/Toggle Synchronized Scroll/i);
      fireEvent.click(syncBtn);
      expect(syncBtn).toBeInTheDocument();
    });

    it('submits resolution note when clicking Accept in Split-Screen', async () => {
      const handleClose = vi.fn();
      const handleProcess = vi.fn().mockResolvedValue({ success: true });

      render(
        <TranslationSplitScreenReview
          report={mockReports[0]}
          onClose={handleClose}
          onProcess={handleProcess}
        />
      );

      const acceptBtn = screen.getByRole('button', { name: /Accept \(ACCEPT\)/i });
      fireEvent.click(acceptBtn);

      const confirmBtn = screen.getByRole('button', { name: /Confirm Approval/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(handleProcess).toHaveBeenCalledWith(
          'rep-101',
          expect.objectContaining({ action: 'ACCEPT' })
        );
      });
    });

    it('fetches translation by ID first and then loads chapter detail by chapterId', async () => {
      ChapterApi.getChapterTranslationByIdApi.mockResolvedValueOnce({
        data: {
          id: '019fc858-4ed2-7852-824f-cec6fee37d12',
          chapterId: '019fbf18-1742-7090-8f4b-a9061ddbed29',
          chapterNumber: '2',
          comicId: '019fbf11-4b56-7c33-97c7-1f367e5b6f54',
          comicTitle: 'Sekiro Side Story Hanbei the Undying',
          languageCode: 'English',
          pagesBubbles: JSON.stringify([
            {
              pageId: 'p-1',
              pageNumber: 1,
              imageUrl: 'https://res.cloudinary.com/page1.jpg',
              bubbles: JSON.stringify({
                selections: [
                  {
                    id: 'b-1',
                    shape: 'rect',
                    x: 10,
                    y: 20,
                    width: 30,
                    height: 15,
                    translation: 'Hello Sekiro Translation',
                    textColor: '#000000',
                    textBgColor: '#ffffff'
                  }
                ]
              })
            }
          ])
        }
      });

      ChapterApi.getChapterDetailApi.mockResolvedValueOnce({
        data: {
          id: '019fbf18-1742-7090-8f4b-a9061ddbed29',
          chapterNumber: 2,
          images: [
            {
              id: 'img-1',
              pageNumber: 1,
              imageUrl: 'https://res.cloudinary.com/raw1.jpg'
            }
          ]
        }
      });

      render(
        <TranslationSplitScreenReview
          report={{
            id: 'rep-999',
            target_type: 'CHAPTER_TRANSLATIONS',
            target_id: '019fc858-4ed2-7852-824f-cec6fee37d12',
            category_name: 'Mistranslation',
            reporter_name: 'Tester'
          }}
          onClose={vi.fn()}
          onProcess={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(ChapterApi.getChapterTranslationByIdApi).toHaveBeenCalledWith('019fc858-4ed2-7852-824f-cec6fee37d12');
        expect(ChapterApi.getChapterDetailApi).toHaveBeenCalledWith('019fbf18-1742-7090-8f4b-a9061ddbed29');
      });

      await waitFor(() => {
        expect(screen.getByText('Hello Sekiro Translation')).toBeInTheDocument();
      });
    });
  });

  /* ── 3. MODERATOR REPORTS SCREEN ── */
  describe('3. ModeratorReports Screen & Content Inspection', () => {
    it('renders violation reports for Moderator and opens ContentInspectionModal', async () => {
      render(
        <MemoryRouter>
          <ModeratorReports />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Violation Reports Management/i)).toBeInTheDocument();
      });

      const inspectBtns = screen.getAllByRole('button', { name: /Inspect & Resolve/i });
      fireEvent.click(inspectBtns[0]);

      await waitFor(() => {
        expect(screen.getByText(/Content Inspection:/i)).toBeInTheDocument();
      });
    });

    it('submits moderator decision in ContentInspectionModal', async () => {
      const handleClose = vi.fn();
      const handleProcess = vi.fn().mockResolvedValue({ success: true });

      render(
        <ContentInspectionModal
          report={mockReports[1]}
          onClose={handleClose}
          onProcess={handleProcess}
        />
      );

      const acceptBtn = screen.getByRole('button', { name: /Accept Report \(ACCEPT\)/i });
      fireEvent.click(acceptBtn);

      const submitBtn = screen.getByRole('button', { name: /Confirm Action/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleProcess).toHaveBeenCalledWith(
          'rep-103',
          expect.objectContaining({ action: 'ACCEPT' })
        );
      });
    });
  });

  /* ── 4. REPORT CATEGORIES MANAGEMENT ── */
  describe('4. ReportCategories Screen & CategoryModal', () => {
    it('renders list of categories and handles quick active toggle', async () => {
      render(
        <MemoryRouter>
          <ReportCategories roleScope="ALL" />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Translation Accuracy / Grammar Error')).toBeInTheDocument();
        expect(screen.getByText('Image Corruption / Broken Pages')).toBeInTheDocument();
      });

      const toggles = screen.getAllByRole('checkbox');
      fireEvent.click(toggles[0]);

      await waitFor(() => {
        expect(ReportApi.updateReportCategoryApi).toHaveBeenCalled();
      });
    });

    it('validates required fields in CategoryModal when creating category', async () => {
      const handleClose = vi.fn();
      const handleSubmit = vi.fn().mockResolvedValue({ success: true });

      render(
        <CategoryModal
          isOpen={true}
          category={null}
          onClose={handleClose}
          onSubmit={handleSubmit}
        />
      );

      const saveBtn = screen.getByRole('button', { name: /Create Category/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Category name is required/i)).toBeInTheDocument();
      });
    });

    it('submits valid category data from CategoryModal', async () => {
      const handleClose = vi.fn();
      const handleSubmit = vi.fn().mockResolvedValue({ success: true });

      render(
        <CategoryModal
          isOpen={true}
          category={null}
          onClose={handleClose}
          onSubmit={handleSubmit}
        />
      );

      const nameInput = screen.getByPlaceholderText(/e.g., Translation Accuracy/i);
      fireEvent.change(nameInput, { target: { value: 'Machine Translation Artifacts' } });

      const saveBtn = screen.getByRole('button', { name: /Create Category/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Machine Translation Artifacts',
            assigned_role: 'MODERATOR'
          })
        );
      });
    });
  });

  /* ── 5. READER REPORT SUBMISSION MODAL ── */
  describe('5. Reader Report Submission Modal (ReportSubmitModal)', () => {
    it('renders report modal with active categories in a select dropdown for comic', async () => {
      const handleClose = vi.fn();

      render(
        <MemoryRouter>
          <ReportSubmitModal
            isOpen={true}
            onClose={handleClose}
            targetType="COMIC"
            targetId="comic-1"
            targetTitle="Martial Peak"
          />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Report Comic Series Issue/i)).toBeInTheDocument();
        expect(screen.getByText(/Martial Peak/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('submits report with category and description from reader', async () => {
      const handleClose = vi.fn();

      render(
        <MemoryRouter>
          <ReportSubmitModal
            isOpen={true}
            onClose={handleClose}
            targetType="CHAPTER"
            targetId="chap-10"
            targetTitle="One Piece - Chapter 10"
            chapterNumber={10}
          />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/One Piece - Chapter 10/i)).toBeInTheDocument();
      });

      const descTextarea = screen.getByPlaceholderText(/Please specify the corrupted or broken pages/i);
      fireEvent.change(descTextarea, {
        target: { value: 'Page 3 is missing and page 4 image is corrupted 404.' }
      });

      const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(ReportApi.createReportApi).toHaveBeenCalledWith(
          expect.objectContaining({
            target_type: 'CHAPTER',
            target_id: 'chap-10',
            description_text: 'Page 3 is missing and page 4 image is corrupted 404.'
          })
        );
      });
    });
  });
});
