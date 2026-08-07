import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import '../../assets/style/moderator/review-queue.css'
import '../../assets/style/moderator/comic-detail.css'
import ModernButton from '../../components/common/ModernButton'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import ModernPagination from '../../components/common/ModernPagination'
import { getChaptersByComicIdApi, getChapterDetailApi } from '../../services/api/ChapterApi'
import { getAuthorComicChaptersApi } from '../../services/api/AuthorComicApi'
import { useTheme } from '../../context/ThemeContext'
import { SkeletonLoader } from '../../components/common/SkeletonLoader'
import { getAuth } from '../../utils/Auth'
import { isLanguageInModeratorScope } from '../../utils/moderatorScope'

const formatSubmitterName = (submittedBy) => {
  if (!submittedBy) return 'Unknown';
  let name = submittedBy;
  let isAuthor = false;
  if (name.startsWith('Author: ')) {
    name = name.substring(8);
    isAuthor = true;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(name)) {
    name = `User_${name.substring(0, 7)}`;
  }
  
  return isAuthor ? `Author: ${name}` : name;
};

const cleanTargetLabel = (label) => (label || '').replace(/\s*\(\d+%\s*,\s*\d+%\)/g, '').trim();

const renderCommentBadge = (c, globalPinIndex = null) => {
  const cleanLabel = cleanTargetLabel(c.targetLabel);
  const isPointPin = c.targetType === 'point' || (c.xPercentage !== null && c.xPercentage !== undefined);

  if (isPointPin) {
    return (
      <span className="mod-doc-comment-target-badge point-pin">
        📍 {cleanLabel} · Pin #{globalPinIndex || 1}
      </span>
    );
  } else if (c.targetType === 'page') {
    return (
      <span className="mod-doc-comment-target-badge page-note">
        📄 {cleanLabel} · Page Note
      </span>
    );
  } else {
    return (
      <span className="mod-doc-comment-target-badge field-note">
        💬 {cleanLabel}
      </span>
    );
  }
};

const isSameChapterItem = (c, target) => {
  if (!c || !target) return false;
  if (c === target) return true;
  
  const cNum = Number(c.number !== undefined ? c.number : (c.chapterNumber !== undefined ? c.chapterNumber : NaN));
  const tNum = Number(target.number !== undefined ? target.number : (target.chapterNumber !== undefined ? target.chapterNumber : NaN));
  if (!isNaN(cNum) && !isNaN(tNum) && cNum > 0 && tNum > 0) {
    if (cNum !== tNum) return false;
  }
  
  if (c.id && target.id && c.id === target.id) return true;
  if (c.title && target.title && c.title.trim().toLowerCase() === target.title.trim().toLowerCase()) return true;
  return false;
};

function ReviewQueue({ submissions = [], comics = [], handleApprove, handleConfirmReject, handleApproveAndCreateProject, handleChapterApprove, handleChapterReject }) {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'approved' | 'rejected' | 'appealed'
  
  const [sortFilter, setSortFilter] = useState('Newest')
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedReview, setSelectedReview] = useState(null)
  const [simpleEvidenceView, setSimpleEvidenceView] = useState(null)
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [previewTab, setPreviewTab] = useState('reader') // 'reader' | 'script' | 'chapters' | 'synopsis'
  const [pageIndex, setPageIndex] = useState(0)
  const [readerLayout, setReaderLayout] = useState('single') // 'single' | 'vertical'

  const [selectedReject, setSelectedReject] = useState(null)
  const [inspectedChapterIds, setInspectedChapterIds] = useState(new Set())
  const [rejectionReason, setRejectionReason] = useState('')
  const [fetchingChapters, setFetchingChapters] = useState(false)
  const chapterCacheRef = useRef(new Map())

  // Google Docs Style Contextual Comment States with Permanent LocalStorage Persistence
  const [docCommentsMap, setDocCommentsMap] = useState(() => {
    try {
      const saved = localStorage.getItem('comiverse_moderator_doc_comments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('comiverse_moderator_doc_comments', JSON.stringify(docCommentsMap));
    } catch (e) {
      console.error('Failed to persist docCommentsMap:', e);
    }
  }, [docCommentsMap])
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(true)
  const [activePinTarget, setActivePinTarget] = useState(null)
  const [pinCommentText, setPinCommentText] = useState('')
  const [fieldCommentModalTarget, setFieldCommentModalTarget] = useState(null)
  const [isPinLocationMode, setIsPinLocationMode] = useState(false)
  const [sidebarCommentTab, setSidebarCommentTab] = useState('all') // 'all' | 'page' | 'point'
  const [isFooterVisible, setIsFooterVisible] = useState(true)
  const lastScrollTopRef = useRef(0)

  const handleReaderAreaScroll = (e) => {
    const currentScroll = e.currentTarget.scrollTop;
    const diff = currentScroll - lastScrollTopRef.current;

    if (diff > 12 && currentScroll > 50) {
      setIsFooterVisible(false);
    } else if (diff < -12) {
      setIsFooterVisible(true);
    }
    lastScrollTopRef.current = currentScroll;
  };

  const handleReaderAreaMouseMove = (e) => {
    if (window.innerHeight - e.clientY < 70) {
      setIsFooterVisible(true);
    }
  };
  
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5
  
  const [isHydrating, setIsHydrating] = useState(false)
  const [hydratedItems, setHydratedItems] = useState([])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, sortFilter, searchQuery])

  // Helper to find matching comic from comics list prop by ID or Title
  const findMatchingComic = (item) => {
    if (!item || !Array.isArray(comics) || comics.length === 0) return null;
    const itemComicId = item.comicId || item.comic_id || item.comic?.id;
    if (itemComicId) {
      const match = comics.find(c => String(c.id) === String(itemComicId));
      if (match) return match;
    }
    const itemTitle = (item.title || item.comicTitle || item.comicName || '').trim().toLowerCase();
    if (itemTitle) {
      const match = comics.find(c => (c.title || '').trim().toLowerCase() === itemTitle);
      if (match) return match;
    }
    return null;
  };

  const normalizeChapter = (chap, idx) => {
    const pages = Array.isArray(chap.pages) && chap.pages.length > 0
      ? chap.pages
      : Array.isArray(chap.images) && chap.images.length > 0
        ? chap.images
        : [];
        
    const rawTitle = String(chap.title || chap.chapter || '');
    let extractedNum = null;
    if (rawTitle) {
      const match = rawTitle.match(/chapter\s+(\d+)/i);
      if (match) extractedNum = parseInt(match[1], 10);
    }
    
    const computedNum = extractedNum || chap.chapterNumber || chap.number || idx + 1;

    return {
      ...chap,
      id: chap.id || `chap-${idx}-${Date.now()}`,
      number: computedNum,
      title: rawTitle || `Chapter ${computedNum}`,
      pages,
      content: chap.content || null,
      words: chap.words || chap.wordCount || null,
      timestamp: chap.createdAt || chap.timestamp || Date.now()
    };
  };

  // Helper to determine if a submission item is a real chapter submission (vs a raw comic catalog profile entry)
  const isRealChapterSubmission = (item) => {
    if (!item) return false;

    // Explicit arrays
    if (Array.isArray(item.pages) && item.pages.length > 0) return true;
    if (Array.isArray(item.images) && item.images.length > 0) return true;
    if (Array.isArray(item.chapters) && item.chapters.length > 0) return true;
    if (Array.isArray(item.allChapters) && item.allChapters.length > 0) return true;

    // Check title / chapter fields
    const chapTitle = String(item.chapter || item.chapterTitle || '').trim().toLowerCase();
    if (chapTitle && chapTitle !== 'raw draft' && chapTitle !== 'comic profile' && chapTitle !== 'chapter comic profile' && chapTitle !== 'none') {
      return true;
    }

    if (item.chapterNumber && item.chapterNumber > 0) return true;
    if (item.type === 'chapter' || item.submissionType === 'chapter') return true;

    return false;
  };

  // Extract real DB submitted chapter list for a raw comic submission
  const getSubmissionChapters = (item) => {
    if (!item) return [];

    let list = [];

    if (Array.isArray(item.allChapters) && item.allChapters.length > 0) {
      list = item.allChapters;
    } else if (Array.isArray(item.chapters) && item.chapters.length > 0) {
      list = item.chapters.map((c, i) => normalizeChapter(c, i));
    } else {
      if (!isRealChapterSubmission(item)) return [];
      const pages = Array.isArray(item.pages) && item.pages.length > 0
        ? item.pages
        : Array.isArray(item.images) && item.images.length > 0
          ? item.images
          : [];

      list = [normalizeChapter({
        id: item.id || `chap-${Date.now()}`,
        chapterNumber: item.chapterNumber || item.number || 1,
        title: item.chapter || item.title || 'Chapter 1',
        pages,
        content: item.content || null,
        words: item.words || null,
        timestamp: item.timestamp || Date.now()
      }, 0)];
    }

    let finalChaps = list;
    if (item.status === 'pending' || !item.status) {
      finalChaps = list.filter(c => {
        if (c.status === 'approved' || c.status === 'rejected') return false;
        const modStatus = (c.moderationStatus || '').toUpperCase();
        if (modStatus === 'PUBLISHED' || modStatus === 'REJECTED') return false;
        return true;
      });
    }

    const sortedChaps = finalChaps.map(c => ({
      ...c,
      submissionId: c.submissionId || item.id || c.id,
      originalSubmissionItem: c.originalSubmissionItem || item
    })).sort((a, b) => {
      const numA = Number(a.number) || 0;
      const numB = Number(b.number) || 0;
      if (numA !== numB) return numA - numB;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

    const usedNumbers = new Set();
    sortedChaps.forEach(c => {
      let num = Number(c.number) || 1;
      while (usedNumbers.has(num)) {
        num++;
      }
      c.number = num;
      usedNumbers.add(num);
    });

    return sortedChaps.sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
  };

  // Extract description/synopsis/summary safely from raw submission objects or matching comic
  const getSubmissionDescription = (item) => {
    if (!item) return '';

    const check = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      const val = 
        obj.description || 
        obj.summary || 
        obj.synopsis || 
        obj.comicDescription || 
        obj.comic_description || 
        obj.overview || 
        obj.details || 
        obj.comic?.description || 
        obj.comic?.summary || 
        obj.comic?.synopsis;

      const str = (val && String(val).trim() && String(val).trim() !== 'null' && String(val).trim() !== 'undefined') ? String(val).trim() : null;
      return (str && str !== 'No description has been added yet.') ? str : null;
    };

    const direct = check(item);
    if (direct) return direct;

    if (Array.isArray(item.subItems)) {
      for (const sub of item.subItems) {
        const subDesc = check(sub);
        if (subDesc) return subDesc;
      }
    }

    if (item.comic) {
      const comicDesc = check(item.comic);
      if (comicDesc) return comicDesc;
    }

    const matchComic = findMatchingComic(item);
    if (matchComic) {
      const comicDesc = check(matchComic);
      if (comicDesc) return comicDesc;
    }

    return '';
  };

  const getSubmissionLanguage = (item) => {
    if (!item) return 'Not specified';

    const check = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      const val = 
        obj.language || 
        obj.originalLanguage || 
        obj.original_language || 
        obj.rawLanguage || 
        obj.raw_language || 
        obj.targetLanguage || 
        obj.target_language || 
        obj.targetLang || 
        obj.sourceLanguage || 
        obj.sourceLang || 
        obj.lang ||
        obj.comicLanguage ||
        obj.comic?.language ||
        obj.comic?.originalLanguage ||
        obj.comic?.original_language;

      const clean = (val && String(val).trim() && String(val).trim() !== 'null' && String(val).trim() !== 'undefined' && String(val).trim() !== 'Not specified') ? String(val).trim() : null;
      return clean;
    };

    const direct = check(item);
    if (direct) return direct;

    if (Array.isArray(item.subItems)) {
      for (const sub of item.subItems) {
        const subLang = check(sub);
        if (subLang) return subLang;
      }
    }

    if (item.comic) {
      const comicLang = check(item.comic);
      if (comicLang) return comicLang;
    }

    const matchComic = findMatchingComic(item);
    if (matchComic) {
      const comicLang = check(matchComic);
      if (comicLang) return comicLang;
    }

    return 'Not specified';
  };

  const getSubmissionMinAge = (item) => {
    if (!item) return 'Not specified';

    const check = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      const val = 
        obj.minAge ?? 
        obj.min_age ?? 
        obj.minimumAge ?? 
        obj.minimum_age ?? 
        obj.ageRating ?? 
        obj.age_rating ?? 
        obj.age ?? 
        obj.comic?.minAge ?? 
        obj.comic?.min_age ?? 
        obj.comic?.minimumAge ?? 
        obj.comic?.ageRating;

      if (val === undefined || val === null) return null;
      const str = String(val).trim();
      if (!str || str === 'null' || str === 'undefined' || str === 'Not specified') return null;
      return str.endsWith('+') ? str : `${str}+`;
    };

    const direct = check(item);
    if (direct) return direct;

    if (Array.isArray(item.subItems)) {
      for (const sub of item.subItems) {
        const subAge = check(sub);
        if (subAge) return subAge;
      }
    }

    if (item.comic) {
      const comicAge = check(item.comic);
      if (comicAge) return comicAge;
    }

    const matchComic = findMatchingComic(item);
    if (matchComic) {
      const comicAge = check(matchComic);
      if (comicAge) return comicAge;
    }

    return 'Not specified';
  };

  const getSubmissionStatus = (item) => {
    if (!item) return 'ONGOING';

    const check = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      const val = 
        obj.publicationStatus || 
        obj.publication_status || 
        obj.comicStatus || 
        obj.comic_status || 
        obj.comic?.publicationStatus ||
        obj.comic?.publication_status;

      return (val && String(val).trim() && String(val).trim() !== 'null' && String(val).trim() !== 'undefined') ? String(val).trim() : null;
    };

    const direct = check(item);
    if (direct) return direct;

    if (Array.isArray(item.subItems)) {
      for (const sub of item.subItems) {
        const subSt = check(sub);
        if (subSt) return subSt;
      }
    }

    if (item.comic) {
      const comicSt = check(item.comic);
      if (comicSt) return comicSt;
    }

    const matchComic = findMatchingComic(item);
    if (matchComic) {
      const comicSt = check(matchComic);
      if (comicSt) return comicSt;
    }

    if (item.status && item.status !== 'pending' && item.status !== 'approved' && item.status !== 'rejected') {
      return item.status;
    }

    return 'ONGOING';
  };

  const getSubmissionAuthor = (item) => {
    if (!item) return 'Unknown Author';

    const check = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      const val = 
        obj.submittedBy || 
        obj.submitted_by || 
        obj.submittedByEmail || 
        obj.submitted_by_email || 
        obj.author || 
        obj.authorName || 
        obj.author_name || 
        obj.authorId || 
        obj.author_id || 
        obj.userFullName || 
        obj.userName || 
        obj.creator || 
        obj.uploader || 
        obj.comic?.author || 
        obj.comic?.authorName || 
        obj.comic?.submittedBy;

      if (!val) return null;
      const str = String(val).trim();
      if (!str || str === 'null' || str === 'undefined' || str === 'Original Author') return null;
      return formatSubmitterName(str).replace(/^Author:\s*/i, '');
    };

    const direct = check(item);
    if (direct && direct !== 'Unknown Author') return direct;

    if (Array.isArray(item.subItems)) {
      for (const sub of item.subItems) {
        const subAuth = check(sub);
        if (subAuth && subAuth !== 'Unknown Author') return subAuth;
      }
    }

    if (item.comic) {
      const comicAuth = check(item.comic);
      if (comicAuth && comicAuth !== 'Unknown Author') return comicAuth;
    }

    const matchComic = findMatchingComic(item);
    if (matchComic) {
      const comicAuth = check(matchComic);
      if (comicAuth && comicAuth !== 'Unknown Author') return comicAuth;
    }

    const fallbackId = item.authorId || item.author_id || item.userId || item.user_id || item.submittedBy || item.author;
    if (fallbackId && String(fallbackId).trim() && String(fallbackId).trim() !== 'Original Author') {
      return formatSubmitterName(String(fallbackId).trim()).replace(/^Author:\s*/i, '');
    }

    return 'Unknown Author';
  };

  const getSubmissionGenres = (item) => {
    if (!item) return [];

    const check = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      let raw = obj.genres || obj.genreList || obj.categories || obj.comic?.genres || obj.genre_names;
      if (!raw) return null;
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map(g => typeof g === 'object' && g !== null ? (g.name || g.label || String(g)) : String(g)).filter(Boolean);
      }
      if (typeof raw === 'string' && raw.trim()) {
        return raw.split(',').map(s => s.trim()).filter(Boolean);
      }
      return null;
    };

    const direct = check(item);
    if (direct && direct.length > 0) return direct;

    if (Array.isArray(item.subItems)) {
      for (const sub of item.subItems) {
        const subG = check(sub);
        if (subG && subG.length > 0) return subG;
      }
    }

    if (item.comic) {
      const comicG = check(item.comic);
      if (comicG && comicG.length > 0) return comicG;
    }

    const matchComic = findMatchingComic(item);
    if (matchComic) {
      const comicG = check(matchComic);
      if (comicG && comicG.length > 0) return comicG;
    }

    return [];
  };

  // 1. High-Performance Memoized Tab Counts (Grouped by Comic)
  const tabCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0, appealed: 0 };
    const authUser = getAuth()?.user;

    const scopedSubmissions = submissions.filter(item => 
      isLanguageInModeratorScope(getSubmissionLanguage(item), authUser)
    );

    ['pending', 'approved', 'rejected'].forEach(tabStatus => {
      const itemsInTab = scopedSubmissions.filter(i => i.status === tabStatus);
      const uniqueKeys = new Set();
      itemsInTab.forEach(item => {
        const titleClean = (item.title || '').toLowerCase().trim();
        const submitterClean = (item.submittedBy || '').toLowerCase().trim();
        const key = item.comicId ? `comic-${item.comicId}` : `group-${titleClean}_${submitterClean}`;
        uniqueKeys.add(key);
      });
      counts[tabStatus] = uniqueKeys.size;
    });

    const appealedComics = comics.filter(c => c.isAppealed || c.appealed || c.moderationStatus === 'APPEALED');
    counts.appealed = appealedComics.length;

    return counts;
  }, [submissions, comics]);

  // 2. High-Performance Instant Query Filter & Sort
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const authUser = getAuth()?.user;
    
    if (activeTab === 'appealed') {
      return comics
        .filter(c => c.isAppealed || c.appealed || c.moderationStatus === 'APPEALED')
        .filter(c => {
           if (!query) return true;
           return (c.title?.toLowerCase().includes(query) || c.authorName?.toLowerCase().includes(query));
        })
        .map(c => ({
          ...c,
          status: 'appealed',
          type: 'Comic Appeal',
          submittedBy: c.authorName,
          timestamp: c.updatedAt || c.createdAt || Date.now(),
          isComicAppealItem: true
        }))
        .sort((a, b) => {
          const timeA = new Date(a.timestamp || 0).getTime() || 0;
          const timeB = new Date(b.timestamp || 0).getTime() || 0;
          return sortFilter === 'Newest' ? timeB - timeA : timeA - timeB;
        });
    }

    return submissions
      .filter(item => isLanguageInModeratorScope(getSubmissionLanguage(item), authUser))
      .filter(item => item.status === activeTab)
      .filter(item => {
        if (!query) return true;
        return (
          item.title?.toLowerCase().includes(query) ||
          item.submittedBy?.toLowerCase().includes(query) ||
          item.submittedByEmail?.toLowerCase().includes(query) ||
          item.chapter?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp || a.submittedAt || a.createdAt || 0).getTime() || 0;
        const timeB = new Date(b.timestamp || b.submittedAt || b.createdAt || 0).getTime() || 0;
        return sortFilter === 'Newest' ? timeB - timeA : timeA - timeB;
      });
  }, [submissions, comics, activeTab, searchQuery, sortFilter]);

  // 3. Smart Comic Grouping: Consolidate multiple chapter submissions of the same comic into 1 card
  const groupedItems = useMemo(() => {
    const groupsMap = new Map();

    filteredItems.forEach(item => {
      const titleClean = (item.title || '').toLowerCase().trim();
      const submitterClean = (item.submittedBy || '').toLowerCase().trim();
      const key = item.comicId ? `comic-${item.comicId}` : `group-${titleClean}_${submitterClean}`;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          ...item,
          groupKey: key,
          subItems: [item]
        });
      } else {
        const group = groupsMap.get(key);
        group.subItems.push(item);

        // Use newest timestamp for display
        const itemTime = new Date(item.timestamp || item.submittedAt || item.createdAt || 0).getTime() || 0;
        const groupTime = new Date(group.timestamp || group.submittedAt || group.createdAt || 0).getTime() || 0;
        if (itemTime > groupTime) {
          group.timestamp = item.timestamp || item.submittedAt || item.createdAt;
        }
      }
    });

    // Populate and clean up grouped chapters
    groupsMap.forEach(group => {
      // Prioritize real chapter submissions over raw comic catalog draft profiles
      const realChapterItems = group.subItems.filter(isRealChapterSubmission);
      const itemsToUse = realChapterItems.length > 0 ? realChapterItems : group.subItems;

      const combinedChaps = [];
      itemsToUse.forEach(item => {
        const itemChaps = getSubmissionChapters(item);
        itemChaps.forEach(newChap => {
          const exists = combinedChaps.some(c => 
            (c.id && newChap.id && c.id === newChap.id) || 
            (c.title && newChap.title && c.title.toLowerCase().trim() === newChap.title.toLowerCase().trim())
          );
          if (!exists) {
            combinedChaps.push(newChap);
          }
        });
      });

      // Do not filter out chapters without pages; preserve all chapters
      group.allChapters = combinedChaps;

      // Synchronize group.chapters with group.allChapters for 100% consistent badge count
      group.chapters = group.allChapters;
      
      // Sort chapters initially by their existing number and timestamp
      group.allChapters.sort((a, b) => {
        const numA = Number(a.number) || 0;
        const numB = Number(b.number) || 0;
        if (numA !== numB) return numA - numB;
        return (a.timestamp || 0) - (b.timestamp || 0);
      });

      // Resolve duplicate chapter numbers robustly
      const usedNumbers = new Set();
      group.allChapters.forEach(chap => {
        let num = Number(chap.number) || 1;
        while (usedNumbers.has(num)) {
          num++;
        }
        chap.number = num;
        usedNumbers.add(num);
      });

      // Re-sort just in case the resolution changed the logical order
      group.allChapters.sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));

      // Enrich group root metadata from its subItems
      group.language = getSubmissionLanguage(group);
      group.minAge = getSubmissionMinAge(group);
      group.publicationStatus = getSubmissionStatus(group);
      group.submittedBy = getSubmissionAuthor(group);
      group.description = getSubmissionDescription(group);
      group.genres = getSubmissionGenres(group);
    });

    return Array.from(groupsMap.values());
  }, [filteredItems]);

  const totalPages = Math.ceil(groupedItems.length / ITEMS_PER_PAGE)
  const paginatedItems = useMemo(() => {
    return groupedItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [groupedItems, currentPage]);

  const onApproveClick = (groupOrItem) => {
    const targetId = typeof groupOrItem === 'string' ? groupOrItem : (groupOrItem.id || groupOrItem);
    const itemsToApprove = typeof groupOrItem === 'object' && groupOrItem.subItems ? groupOrItem.subItems : [{ id: targetId, ...groupOrItem }];
    itemsToApprove.forEach(i => handleApprove(i.id || i, typeof i === 'object' ? i : null));
    setSelectedReview(null)
    setSelectedChapter(null)
  }

  const onModalApproveClick = async (specificChap = null) => {
    if (!selectedReview) return;
    const chapToApprove = specificChap || selectedChapter || (selectedReview.allChapters && selectedReview.allChapters[0]);
    if (!chapToApprove) return;

    const targetSubId = chapToApprove.submissionId || chapToApprove.id || selectedReview.id;
    const targetSubItem = chapToApprove.originalSubmissionItem || (selectedReview.subItems ? selectedReview.subItems.find(s => (s.id || s) === targetSubId) : selectedReview);

    if (handleChapterApprove) {
      await handleChapterApprove(selectedReview.id || targetSubId, chapToApprove);
    } else {
      await handleApprove(targetSubId, targetSubItem || chapToApprove);
    }

    const currentPendingChapters = getSubmissionChapters(selectedReview);
    const remainingChapters = currentPendingChapters.filter(c => {
      return !isSameChapterItem(c, chapToApprove);
    });

    const remainingSubItems = (selectedReview.subItems || []).filter(s => {
      return !isSameChapterItem(s, targetSubItem) && !isSameChapterItem(s, chapToApprove);
    });

    if (remainingChapters.length === 0) {
      setSelectedReview(null);
      setSelectedChapter(null);
    } else {
      const updatedReview = {
        ...selectedReview,
        allChapters: remainingChapters,
        chapters: remainingChapters,
        subItems: remainingSubItems.length > 0 ? remainingSubItems : selectedReview.subItems,
        chapterNumber: remainingChapters.length,
        number: remainingChapters.length
      };
      setSelectedReview(updatedReview);

      const nextChapter = remainingChapters[0];
      setSelectedChapter(nextChapter);
      setPageIndex(0);

      if (remainingChapters.length > 1) {
        setPreviewTab('chapters');
      } else {
        setPreviewTab(nextChapter && Array.isArray(nextChapter.pages) && nextChapter.pages.length > 0 ? 'reader' : 'chapters');
      }
    }
  };

  const onModalRejectClick = (specificChap = null) => {
    if (!selectedReview) return;
    const chapToReject = specificChap || selectedChapter || (selectedReview.allChapters && selectedReview.allChapters[0]);
    if (!chapToReject) return;

    const targetSubId = chapToReject.submissionId || chapToReject.id || selectedReview.id;
    const targetSubItem = chapToReject.originalSubmissionItem || (selectedReview.subItems ? selectedReview.subItems.find(s => (s.id || s) === targetSubId) : selectedReview);
    const baseItem = typeof targetSubItem === 'object' && targetSubItem !== null ? targetSubItem : (typeof selectedReview === 'object' && selectedReview !== null ? selectedReview : { id: targetSubId });
    setSelectedReject({
      ...baseItem,
      id: targetSubId,
      rejectChapterObj: chapToReject,
      parentReviewId: selectedReview.id || targetSubId
    });
    setRejectionReason('');
  };

  const onOpenReject = (item) => {
    setSelectedReject(item)
    setRejectionReason('')
  }

  const handleJumpToPageFromReport = (item, comment) => {
    setSelectedReject(null);
    handleOpenReviewModal(item);
    
    if (comment.targetKey && comment.targetKey.startsWith('page-')) {
      const pNum = parseInt(comment.targetKey.replace('page-', ''), 10);
      if (!isNaN(pNum) && pNum > 0) {
        const targetIndex = pNum - 1;
        setPageIndex(targetIndex);
        if (readerLayout === 'vertical') {
          scrollToPageElement(pNum);
        }
      }
    }
  }

  const onConfirmRejectClick = () => {
    if (!selectedReject) return
    const comicId = selectedReject.parentReviewId || selectedReject.id;
    const comments = docCommentsMap[comicId] || selectedReject.notes || [];
    const userOverallNote = rejectionReason.trim();
    let finalPayload = '';

    if (userOverallNote && comments.length > 0) {
      const formattedComments = comments.map((c, i) => `${i + 1}. [${c.targetLabel}]: ${c.text}`).join('\n');
      finalPayload = `${userOverallNote}\n\n--- DETAILED INSPECTION FEEDBACK REPORT (${comments.length} PINNED ITEMS) ---\n${formattedComments}`;
    } else if (comments.length > 0) {
      const formattedComments = comments.map((c, i) => `${i + 1}. [${c.targetLabel}]: ${c.text}`).join('\n');
      finalPayload = `--- DETAILED INSPECTION FEEDBACK REPORT (${comments.length} PINNED ITEMS) ---\n${formattedComments}`;
    } else {
      finalPayload = userOverallNote;
    }

    if (selectedReject.rejectChapterObj && handleChapterReject) {
      handleChapterReject(selectedReject.parentReviewId || selectedReject.id, selectedReject.rejectChapterObj, finalPayload);
    } else {
      const itemsToReject = selectedReject.subItems ? selectedReject.subItems : [selectedReject];
      itemsToReject.forEach(i => handleConfirmReject(i.id || i, finalPayload));
    }

    if (selectedReview && (selectedReview.allChapters || selectedReview.subItems)) {
      const targetObj = selectedReject.rejectChapterObj || selectedReject;

      const currentPendingChapters = getSubmissionChapters(selectedReview);
      const remainingChapters = currentPendingChapters.filter(c => {
        return !isSameChapterItem(c, targetObj);
      });
      const remainingSubItems = (selectedReview.subItems || []).filter(s => {
        return !isSameChapterItem(s, targetObj) && s !== selectedReject;
      });

      if (remainingChapters.length === 0) {
        setSelectedReview(null);
        setSelectedChapter(null);
      } else {
        const updatedReview = {
          ...selectedReview,
          allChapters: remainingChapters,
          chapters: remainingChapters,
          subItems: remainingSubItems.length > 0 ? remainingSubItems : selectedReview.subItems,
          chapterNumber: remainingChapters.length,
          number: remainingChapters.length
        };
        setSelectedReview(updatedReview);

        const nextChapter = remainingChapters[0];
        setSelectedChapter(nextChapter);
        setPageIndex(0);

        if (remainingChapters.length > 1) {
          setPreviewTab('chapters');
        } else {
          setPreviewTab(nextChapter && Array.isArray(nextChapter.pages) && nextChapter.pages.length > 0 ? 'reader' : 'chapters');
        }
      }
    } else {
      setSelectedReview(null);
      setSelectedChapter(null);
    }

    setSelectedReject(null)
    setRejectionReason('')
  }

  const handleAddDocComment = (submissionId, targetType, targetKey, targetLabel, text, coords = null) => {
    if (!text || !text.trim()) return
    const newComment = {
      id: `doc-comment-${Date.now()}`,
      submissionId,
      targetType,
      targetKey,
      targetLabel,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      author: 'Moderator',
      xPercentage: coords?.x !== undefined ? coords.x : null,
      yPercentage: coords?.y !== undefined ? coords.y : null
    }

    setDocCommentsMap(prev => ({
      ...prev,
      [submissionId]: [...(prev[submissionId] || []), newComment]
    }))
    setActivePinTarget(null)
    setPinCommentText('')
    setFieldCommentModalTarget(null)
    setShowCommentsSidebar(true)
  }

  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  const handleStartEditDocComment = (comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.text)
  }

  const handleSaveEditDocComment = (submissionId, commentId) => {
    if (!editingCommentText.trim()) return
    setDocCommentsMap(prev => ({
      ...prev,
      [submissionId]: (prev[submissionId] || []).map(c => 
        c.id === commentId ? { ...c, text: editingCommentText.trim(), editedAt: new Date().toISOString() } : c
      )
    }))
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  const scrollToPageElement = (pNum) => {
    setTimeout(() => {
      const targetEl = document.getElementById(`page-container-${pNum}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  const handleDeleteDocComment = (submissionId, commentId) => {
    setDocCommentsMap(prev => ({
      ...prev,
      [submissionId]: (prev[submissionId] || []).filter(c => c.id !== commentId)
    }))
  }



  // Accelerated Backend Chapter Fetching with In-Memory Cache
  const fetchChaptersFromBackend = async (comicId, fetchDetails = true) => {
    if (!comicId) return [];
    
    const cacheKey = fetchDetails ? `full_${comicId}` : `shallow_${comicId}`;
    if (chapterCacheRef.current.has(cacheKey)) {
      return chapterCacheRef.current.get(cacheKey);
    }
    // Return full if shallow was requested but full is available
    if (!fetchDetails && chapterCacheRef.current.has(`full_${comicId}`)) {
      return chapterCacheRef.current.get(`full_${comicId}`);
    }

    try {
      let chaptersData = null;
      try {
        chaptersData = await getChaptersByComicIdApi(comicId, {}, true);
      } catch {
        chaptersData = await getAuthorComicChaptersApi(comicId);
      }
      let list = chaptersData?.data || chaptersData || [];
      if (!Array.isArray(list)) list = [];
      
      // Filter out PREVIEW_READY or DRAFT chapters since moderator should not see them
      list = list.filter(ch => {
        const status = (ch.status || ch.moderationStatus || '').toUpperCase();
        return !status || status === 'APPROVED' || status === 'PUBLISHED' || status === 'SUBMITTED_FOR_REVIEW' || status === 'REJECTED';
      });

      if (list.length === 0) return [];

      if (!fetchDetails) {
        const shallowResult = list.map((ch, idx) => normalizeChapter(ch, idx));
        chapterCacheRef.current.set(`shallow_${comicId}`, shallowResult);
        return shallowResult;
      }

      // Parallel batch fetching for maximum throughput
      const detailed = await Promise.allSettled(
        list.map(ch => getChapterDetailApi(ch.id))
      );

      const result = list.map((ch, idx) => {
        const detailResult = detailed[idx];
        const detail = detailResult?.status === 'fulfilled'
          ? (detailResult.value?.data || detailResult.value || {})
          : {};
        return normalizeChapter({ ...ch, ...detail }, idx);
      });

      chapterCacheRef.current.set(`full_${comicId}`, result);
      return result;
    } catch (err) {
      console.warn('Failed to fetch chapters from backend:', err?.message);
      return [];
    }
  };

  useEffect(() => {
    let isMounted = true;
    const hydrateItems = async () => {
      setIsHydrating(true);
      const itemsCopy = [...paginatedItems];
      
      const hydrated = await Promise.all(itemsCopy.map(async (item) => {
        let chaps = (item.allChapters && item.allChapters.length > 0)
          ? [...item.allChapters]
          : getSubmissionChapters(item);
          
        const hasPages = chaps.some(c => Array.isArray(c.pages) && c.pages.length > 0);
        if (!hasPages && item.comicId) {
          try {
            const backendChaps = await fetchChaptersFromBackend(item.comicId, false);
            if (backendChaps.length > 0) {
              backendChaps.forEach(bChap => {
                const exists = chaps.some(c => 
                  (c.id && bChap.id && c.id === bChap.id) || 
                  (c.title && bChap.title && c.title.toLowerCase() === bChap.title.toLowerCase())
                );
                if (!exists) {
                  chaps.push(bChap);
                }
              });
            }
          } catch (e) {
            console.warn("Hydration failed for", item.comicId, e);
          }
        }
        
        // Preserve all chapters regardless of pages array length
        
        item.allChapters = chaps;
        item.chapters = chaps;
        return item;
      }));
      
      if (isMounted) {
        setHydratedItems(hydrated);
        setIsHydrating(false);
      }
    };
    
    if (paginatedItems.length > 0) {
      hydrateItems();
    } else {
      setHydratedItems([]);
      setIsHydrating(false);
    }
    
    return () => { isMounted = false; };
  }, [paginatedItems]);

  const handleOpenReviewModal = async (item) => {
    if (item.status === 'rejected') {
      setSimpleEvidenceView(item);
      return;
    }

    setSelectedReview(item);
    setPageIndex(0);
    setFetchingChapters(true);

    // Get combined chapters from group or item
    let chaps = (item.allChapters && item.allChapters.length > 0)
      ? [...item.allChapters]
      : getSubmissionChapters(item);

    // If no pages found and we have a comicId, fetch from backend
    const hasPages = chaps.some(c => Array.isArray(c.pages) && c.pages.length > 0);
    if (!hasPages && item.comicId) {
      const backendChaps = await fetchChaptersFromBackend(item.comicId, true);
      if (backendChaps.length > 0) {
        backendChaps.forEach(bChap => {
          const exists = chaps.some(c => 
            (c.id && bChap.id && c.id === bChap.id) || 
            (c.title && bChap.title && c.title.toLowerCase() === bChap.title.toLowerCase())
          );
          if (!exists) {
            chaps.push(bChap);
          } else {
            const existing = chaps.find(c => (c.id && bChap.id && c.id === bChap.id) || (c.title && bChap.title && c.title.toLowerCase() === bChap.title.toLowerCase()));
            if (existing && (!existing.pages || existing.pages.length === 0) && bChap.pages?.length > 0) {
              existing.pages = bChap.pages;
            }
          }
        });
      }
    }

    // Preserve all chapters regardless of pages array length

    item.allChapters = chaps;
    item.chapters = chaps;

    const firstChap = chaps[0] || null;
    setSelectedChapter(firstChap);

    // Dynamic Tab Selection for optimal Moderator UX:
    // If comic has > 1 chapter, default focus to 'chapters' list; if 1 chapter, default to 'reader' image view
    if (chaps.length > 1) {
      setPreviewTab('chapters');
    } else {
      setPreviewTab(firstChap && Array.isArray(firstChap.pages) && firstChap.pages.length > 0 ? 'reader' : 'chapters');
    }

    setFetchingChapters(false);
  };

  const handleSelectChapterItem = (chap) => {
    setSelectedChapter(chap);
    setPageIndex(0);
    setPreviewTab('reader');
    if (chap?.id) {
      setInspectedChapterIds(prev => new Set(prev).add(chap.id));
    }
  };

  const getReviewViewPages = (submission, chapter, docComments) => {
    if (!submission) return [];
    const chaps = (submission.allChapters && submission.allChapters.length > 0) 
      ? [...submission.allChapters] 
      : getSubmissionChapters(submission);
    const active = chapter || chaps[0] || null;
    const base = (active && Array.isArray(active.pages)) ? active.pages : [];
    
    let viewPages = base.map((url, idx) => ({ url, originalIdx: idx, pNum: idx + 1 }));
    if (submission.status === 'rejected') {
       const comments = docComments[submission.id] || [];
       const pinnedSet = new Set(comments.map(c => {
         const match = c.targetKey?.match(/^page-(\d+)$/);
         return match ? parseInt(match[1], 10) : null;
       }).filter(n => n !== null));
       
       if (pinnedSet.size > 0) {
         viewPages = viewPages.filter(p => pinnedSet.has(p.pNum));
       }
    }
    return viewPages;
  }

  // Accelerated Image Preloading Strategy
  useEffect(() => {
    if (!selectedReview || previewTab !== 'reader') return
    const viewPages = getReviewViewPages(selectedReview, selectedChapter, docCommentsMap);

    if (viewPages.length > 0) {
      const preloadIndices = [pageIndex, pageIndex + 1, pageIndex - 1, pageIndex + 2]
      preloadIndices.forEach(idx => {
        if (idx >= 0 && idx < viewPages.length && viewPages[idx]) {
          const img = new Image()
          img.src = viewPages[idx].url
        }
      })
    }
  }, [selectedReview, selectedChapter, previewTab, pageIndex])

  // Instant Keyboard Navigation for Reader Mode
  useEffect(() => {
    if (!selectedReview || previewTab !== 'reader') return
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return

      const viewPages = getReviewViewPages(selectedReview, selectedChapter, docCommentsMap);

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (pageIndex < viewPages.length - 1) {
          setPageIndex(prev => prev + 1)
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (pageIndex > 0) {
          setPageIndex(prev => prev - 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedReview, selectedChapter, previewTab, pageIndex])

  return (
    <div className="fade-in">
      <div className="moderator-page-header">
        <h1>Raw Content Review Queue</h1>
        <p>Review and verify author submission inputs (Title, Language, Min Age, Description, Genres, Cover & Chapters), inspect raw chapter manuscripts, and approve catalog publication.</p>
      </div>

      {/* Dynamic Statistics Ribbon */}
      {(() => {
        const pending = tabCounts.pending;
        const approved = tabCounts.approved;
        const rejected = tabCounts.rejected;
        const total = pending + approved + rejected;
        const rate = (approved + rejected) > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0;

        return (
          <div className="moderator-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', margin: '20px 0 24px' }}>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span style={{ fontSize: '13px', color: 'var(--mod-text-secondary)', display: 'block', marginBottom: '6px' }}>Total Submissions</span>
              <strong style={{ fontSize: '24px', color: '#ffffff' }}>{total}</strong>
            </div>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.12)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(168, 85, 247, 0.8)', display: 'block', marginBottom: '6px' }}>Pending Review</span>
              <strong style={{ fontSize: '24px', color: '#c084fc' }}>{pending}</strong>
            </div>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(16, 185, 129, 0.8)', display: 'block', marginBottom: '6px' }}>Approved Items</span>
              <strong style={{ fontSize: '24px', color: '#34d399' }}>{approved}</strong>
            </div>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.12)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(239, 68, 68, 0.8)', display: 'block', marginBottom: '6px' }}>Rejected Items</span>
              <strong style={{ fontSize: '24px', color: '#f87171' }}>{rejected}</strong>
            </div>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.12)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(59, 130, 246, 0.8)', display: 'block', marginBottom: '6px' }}>Approval Rate</span>
              <strong style={{ fontSize: '24px', color: '#60a5fa' }}>{rate}%</strong>
            </div>
          </div>
        );
      })()}

      {/* Main Status Tabs */}
      <div className="moderator-tabs">
        <button 
          className={`moderator-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Review
          <span className="moderator-tab-btn-badge pending">{tabCounts.pending}</span>
        </button>
        <button 
          className={`moderator-tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          Approved
          <span className="moderator-tab-btn-badge approved">{tabCounts.approved}</span>
        </button>
        <button 
          className={`moderator-tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          Rejected
          <span className="moderator-tab-btn-badge rejected">{tabCounts.rejected}</span>
        </button>
        <button 
          className={`moderator-tab-btn ${activeTab === 'appealed' ? 'active' : ''}`}
          onClick={() => setActiveTab('appealed')}
        >
          Appealed
          <span className="moderator-tab-btn-badge appealed" style={{ background: '#f59e0b', color: '#fff' }}>{tabCounts.appealed}</span>
        </button>
      </div>

      {/* Filter and Sort bar */}
      <div className="moderator-filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', flexWrap: 'wrap', marginBottom: '20px' }}>
        <input 
          type="text"
          className="moderator-select"
          placeholder="Search raw comics by title, author name, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '240px', outline: 'none' }}
        />

        <select 
          className="moderator-select"
          value={sortFilter}
          onChange={(e) => setSortFilter(e.target.value)}
        >
          <option>Newest</option>
          <option>Oldest</option>
        </select>
      </div>

      {/* Submissions List Grid */}
      <div className="moderator-cards-list">
        {filteredItems.length === 0 ? (
          <div className="moderator-empty-state">
            <h3>No submissions found</h3>
            <p>There are no raw comic submissions matching your active filters.</p>
          </div>
        ) : isHydrating ? (
          <div className="skeleton-comic-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[...Array(Math.min(ITEMS_PER_PAGE, filteredItems.length))].map((_, i) => (
              <div key={i} className="submission-card" style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div className="skeleton-img skeleton-shimmer" style={{ width: '80px', height: '110px', borderRadius: '8px' }}></div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                    <div className="skeleton-line skeleton-shimmer long" style={{ height: '24px', margin: 0 }}></div>
                    <div className="skeleton-line skeleton-shimmer short" style={{ height: '16px', margin: 0, width: '120px' }}></div>
                    <div className="skeleton-line skeleton-shimmer short" style={{ height: '22px', margin: 0, width: '80px', borderRadius: '6px' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          hydratedItems.map(item => (
            <div className="submission-card" key={item.id}>
              <div className="submission-cover-placeholder">
                {item.cover && (item.cover.startsWith('http') || item.cover.includes('/')) ? (
                  <img src={item.cover} alt={item.title} className="submission-cover-img" />
                ) : (
                  item.cover || '📚'
                )}
              </div>

              <div className="submission-info">
                <h3 className="submission-title">{item.title}</h3>
                <p className="submission-meta">
                  <span><strong>Author:</strong> {getSubmissionAuthor(item)}</span>
                  {getSubmissionLanguage(item) !== 'Not specified' && <span> · <strong>Lang:</strong> {getSubmissionLanguage(item)}</span>}
                  {getSubmissionMinAge(item) !== 'Not specified' && <span> · <strong>Age:</strong> {getSubmissionMinAge(item)}</span>}
                </p>
                <div className="submission-extra" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  <span className="submission-extra-item">⏱️ {formatTimeAgo(item.timestamp || item.submittedAt || item.createdAt)}</span>
                  <span className="submission-extra-item" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11.5px' }}>
                    📚 {getSubmissionChapters(item).length} {getSubmissionChapters(item).length === 1 ? 'Chapter' : 'Chapters'}
                  </span>
                </div>
              </div>

              <div className="submission-right-side">
                <div className="submission-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <ModernButton 
                    variant={2} 
                    label={item.isComicAppealItem ? "📄 Review Appeal" : (item.status === 'rejected' ? "👁 View Evidence" : "👁 View Content")} 
                    className="btn-review"
                    onClick={() => {
                      if (item.isComicAppealItem) {
                        navigate(`/moderator/comic-management/${item.id}`);
                      } else {
                        handleOpenReviewModal(item);
                      }
                    }} 
                  />

                  {item.status === 'pending' && (
                    <>
                      <ModernButton 
                        variant={2} 
                        label="✓ Approve All" 
                        className="btn-approve"
                        onClick={() => onApproveClick(item)} 
                      />

                      <ModernButton 
                        variant={2} 
                        label="✗ Reject All" 
                        className="btn-reject"
                        onClick={() => onOpenReject(item)} 
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <ModernPagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
            variant="pills"
          />
        </div>
      )}

      {/* ── FULL-SCREEN WIDE CHAPTER CONTENT & MANUSCRIPT READER OVERLAY ────────── */}
      {selectedReview && createPortal(
        <div className={`mod-inspector-overlay fade-in ${theme === 'light' ? 'light-theme' : 'dark-theme'}`}>
          {/* Topbar Navigation & Review Actions */}
          {(() => {
            const viewPages = getReviewViewPages(selectedReview, selectedChapter, docCommentsMap);
            const activeComments = docCommentsMap[selectedReview.id] || [];
            const chaptersList = getSubmissionChapters(selectedReview);

            return (
              <div className="mod-inspector-topbar">
                {/* Left: Truncated Title & Subtitle Group */}
                <div className="mod-inspector-title-group" style={{ maxWidth: '340px' }}>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <h3 className="mod-inspector-title" title={`${selectedReview.title}${selectedChapter ? ` — ${selectedChapter.title}` : ''}`}>
                      📖 {selectedReview.title} {selectedChapter ? `— ${selectedChapter.title}` : ''}
                    </h3>
                    <div className="mod-inspector-subtitle">
                      {getSubmissionAuthor(selectedReview)} · {formatTimeAgo(selectedReview.timestamp || selectedReview.submittedAt || selectedReview.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Center: Fixed Standard Mode Tabs Order */}
                <div className="mod-inspector-mode-tabs">
                  <button
                    type="button"
                    className={`mod-mode-tab ${previewTab === 'reader' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('reader')}
                  >
                    🖼️ Image Reader ({viewPages.length})
                  </button>
                  <button
                    type="button"
                    className={`mod-mode-tab ${previewTab === 'chapters' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('chapters')}
                  >
                    📋 Chapters ({chaptersList.length})
                  </button>
                  <button
                    type="button"
                    className={`mod-mode-tab ${previewTab === 'synopsis' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('synopsis')}
                  >
                    ℹ️ Details & Inputs
                  </button>
                </div>

                {/* Right: Toggle Comments Drawer, Review Actions & Close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className={`mod-mode-tab ${showCommentsSidebar ? 'active' : ''}`}
                    onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
                    title="Toggle Google Docs Style Feedback Comments"
                  >
                    💬 Feedback Pins ({activeComments.length})
                  </button>

                  <button 
                    className="mod-inspector-close-btn" 
                    onClick={() => { setSelectedReview(null); setSelectedChapter(null); }}
                    title="Close Viewer"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Main Workspace Body Container with Right Comment Sidebar */}
          <div className="mod-inspector-body">
            {/* Left Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
              {(() => {
                const viewPages = getReviewViewPages(selectedReview, selectedChapter, docCommentsMap);
                const chaptersList = getSubmissionChapters(selectedReview);
                const activeChap = selectedChapter || chaptersList[0] || null;

                /* MODE 1: RAW IMAGE READER VIEW */
                if (previewTab === 'reader') {
                  if (viewPages.length === 0) {
                    return (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
                        <h3 className="mod-inspector-title" style={{ margin: '0 0 8px' }}>No Manuscript Page Images Attached</h3>
                        <p className="mod-inspector-subtitle" style={{ margin: '0 0 20px', fontSize: '14px', maxWidth: '480px', textAlign: 'center' }}>
                          This submission does not contain uploaded raw page images for {activeChap ? activeChap.title : 'this chapter'}. You can inspect script text or chapter list tabs.
                        </p>
                        {chaptersList.length > 1 && (
                          <button
                            type="button"
                            className="mod-mode-tab active"
                            onClick={() => setPreviewTab('chapters')}
                          >
                            📋 View Chapter List ({chaptersList.length} Chapters)
                          </button>
                        )}
                      </div>
                    );
                  }

                  const current = viewPages[pageIndex] || viewPages[0];
                  const pageComments = (docCommentsMap[selectedReview.id] || [])
                    .filter(c => c.targetKey === `page-${current.pNum}`);

                  return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
                      {/* Top sub-header for active chapter label & Pin Instruction */}
                      <div className="mod-inspector-subbanner">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="mod-pane-title--raw" style={{ fontWeight: '700' }}>
                            🌐 Original Raw Manuscript — {activeChap ? activeChap.title : 'Chapter Page'} (Page {pageIndex + 1} of {viewPages.length})
                          </span>
                          <span className="mod-inspector-subtitle" style={{ fontSize: '12px' }}>
                            💡 Click anywhere on image to drop a Google Docs style comment pin!
                          </span>
                        </div>

                        {chaptersList.length > 1 && (
                          <div className="mod-inspect-select-container">
                            <span className="mod-inspect-select-label">Switch Chapter:</span>
                            <select
                              className="mod-inspect-select"
                              value={activeChap?.id}
                              onChange={(e) => {
                                const found = chaptersList.find(c => c.id === e.target.value);
                                if (found) handleSelectChapterItem(found);
                              }}
                            >
                              {chaptersList.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Central Wide Reader Container with Click Pinning */}
                      <div
                        className="mod-inspector-reader-area"
                        onClick={() => setActivePinTarget(null)}
                        onScroll={handleReaderAreaScroll}
                        onMouseMove={handleReaderAreaMouseMove}
                        style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: readerLayout === 'single' ? 'center' : 'flex-start', padding: '24px 24px 90px 24px' }}
                      >
                        {readerLayout === 'single' ? (
                          <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', textAlign: 'center' }}>
                            <img
                              src={current.url}
                              alt={`Page ${current.pNum}`}
                              decoding="async"
                              loading="eager"
                              onClick={(e) => {
                                if (!isPinLocationMode) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                setFieldCommentModalTarget({
                                  targetType: 'point',
                                  targetKey: `page-${current.pNum}`,
                                  targetLabel: `Page ${current.pNum}`,
                                  coords: { x, y }
                                });
                              }}
                              style={{
                                maxHeight: '75vh',
                                maxWidth: '100%',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                cursor: isPinLocationMode ? 'crosshair' : 'pointer'
                              }}
                              title={isPinLocationMode ? "Click to drop a location pin comment on this image" : `Page ${current.pNum}`}
                            />

                            {/* Render Pinned Comment Markers over Image */}
                            {pageComments.map((c) => {
                              const globalPinIndex = (docCommentsMap[selectedReview.id] || []).findIndex(item => item.id === c.id) + 1;

                              return (
                                c.xPercentage !== null && (
                                  <div
                                    key={c.id}
                                    className={`mod-doc-comment-pin ${activePinTarget === c.id ? 'active' : ''}`}
                                    style={{ left: `${c.xPercentage}%`, top: `${c.yPercentage}%` }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowCommentsSidebar(true);
                                      setActivePinTarget(prev => prev === c.id ? null : c.id);
                                      const el = document.getElementById(`doc-comment-card-${c.id}`);
                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                    }}
                                  >
                                    📌 {globalPinIndex > 0 ? globalPinIndex : 1}

                                    {/* Glassmorphic Floating Tooltip Card */}
                                    <div className="mod-pin-hover-tooltip">
                                      <div className="mod-pin-tooltip-header">
                                        {renderCommentBadge(c, globalPinIndex)}
                                      </div>
                                      <p className="mod-pin-tooltip-body">{c.text}</p>
                                      <div className="mod-pin-tooltip-footer">
                                        <span>🛡️ {c.author || 'Moderator'}</span>
                                        <span>{formatTimeAgo(c.createdAt)}</span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', width: '100%', maxWidth: '850px' }}>
                            {viewPages.map((pageObj, pIdx) => {
                              const pComments = (docCommentsMap[selectedReview.id] || [])
                                .filter(c => c.targetKey === `page-${pageObj.pNum}`);

                              return (
                                <div key={pIdx} id={`page-container-${pageObj.pNum}`} style={{ width: '100%', textAlign: 'center', position: 'relative' }}>
                                  <img
                                    src={pageObj.url}
                                    alt={`Page ${pageObj.pNum}`}
                                    decoding="async"
                                    loading="lazy"
                                    onClick={(e) => {
                                      if (selectedReview.status !== 'pending') return;
                                      setPageIndex(pIdx);
                                      if (!isPinLocationMode) {
                                        scrollToPageElement(pageObj.pNum);
                                        return;
                                      }
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                      const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                      setFieldCommentModalTarget({
                                        targetType: 'point',
                                        targetKey: `page-${pageObj.pNum}`,
                                        targetLabel: `Page ${pageObj.pNum}`,
                                        coords: { x, y }
                                      });
                                    }}
                                    style={{
                                      width: '100%',
                                      maxHeight: '90vh',
                                      objectFit: 'contain',
                                      borderRadius: '8px',
                                      boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                                      border: '1px solid rgba(148, 163, 184, 0.2)',
                                      cursor: selectedReview.status === 'pending' ? (isPinLocationMode ? 'crosshair' : 'pointer') : 'default'
                                    }}
                                    title={selectedReview.status === 'pending' ? (isPinLocationMode ? 'Click to drop a location pin comment on this image' : `Click to select Page ${pageObj.pNum}`) : `Page ${pageObj.pNum}`}
                                  />

                                  {/* Render Pinned Comment Markers over Image in Vertical Scroll Mode */}
                                  {pComments.map((c) => {
                                    const globalPinIndex = (docCommentsMap[selectedReview.id] || []).findIndex(item => item.id === c.id) + 1;

                                    return (
                                      c.xPercentage !== null && (
                                        <div
                                          key={c.id}
                                          className={`mod-doc-comment-pin ${activePinTarget === c.id ? 'active' : ''}`}
                                          style={{ left: `${c.xPercentage}%`, top: `${c.yPercentage}%` }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowCommentsSidebar(true);
                                            setActivePinTarget(prev => prev === c.id ? null : c.id);
                                            const el = document.getElementById(`doc-comment-card-${c.id}`);
                                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                          }}
                                        >
                                          📌 {globalPinIndex > 0 ? globalPinIndex : 1}

                                          {/* Glassmorphic Floating Tooltip Card */}
                                          <div className="mod-pin-hover-tooltip">
                                            <div className="mod-pin-tooltip-header">
                                              {renderCommentBadge(c, globalPinIndex)}
                                            </div>
                                            <p className="mod-pin-tooltip-body">{c.text}</p>
                                            <div className="mod-pin-tooltip-footer">
                                              <span>🛡️ {c.author || 'Moderator'}</span>
                                              <span>{formatTimeAgo(c.createdAt)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    );
                                  })}

                                  <span className="mod-inspector-subtitle" style={{ display: 'inline-block', marginTop: '6px', fontSize: '11.5px' }}>
                                    Page {pageObj.pNum} of {viewPages.length}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Bottom Reader Toolbar Controls */}
                      <div className={`mod-inspector-controls ${!isFooterVisible ? 'is-hidden' : ''}`}>
                        <div className="mod-page-nav-group">
                          <button
                            type="button"
                            className="mod-nav-arrow"
                            onClick={() => {
                              const targetP = Math.max(0, pageIndex - 1);
                              setPageIndex(targetP);
                              if (readerLayout === 'vertical') scrollToPageElement(viewPages[targetP].pNum);
                            }}
                            disabled={pageIndex === 0}
                          >
                            ← Previous Page
                          </button>
                          
                          <div className="mod-inspect-select-container">
                            <span className="mod-inspect-select-label">Page</span>
                            <select
                              className="mod-inspect-select"
                              value={pageIndex}
                              onChange={(e) => {
                                const targetIdx = Number(e.target.value);
                                setPageIndex(targetIdx);
                                if (readerLayout === 'vertical') {
                                  const current = viewPages[targetIdx];
                                  if (current) scrollToPageElement(current.pNum);
                                }
                              }}
                            >
                              {viewPages.map((p, pOptionIdx) => (
                                <option key={pOptionIdx} value={pOptionIdx}>Page {p.pNum} ({pOptionIdx + 1} of {viewPages.length})</option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            className="mod-nav-arrow"
                            onClick={() => {
                              const targetP = Math.min(viewPages.length - 1, pageIndex + 1);
                              setPageIndex(targetP);
                              if (readerLayout === 'vertical') scrollToPageElement(viewPages[targetP].pNum);
                            }}
                            disabled={pageIndex === viewPages.length - 1}
                          >
                            Next Page →
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="mod-inspect-select-container">
                            <span className="mod-inspect-select-label">Reader Layout:</span>
                            <select
                              className="mod-inspect-select"
                              value={readerLayout}
                              onChange={(e) => setReaderLayout(e.target.value)}
                            >
                              <option value="single">📖 Single Page</option>
                              <option value="vertical">📜 Continuous Vertical Scroll</option>
                            </select>
                          </div>

                          <div className="mod-inspector-divider" />

                          <ModernButton 
                            variant={2} 
                            label="Close Viewer" 
                            onClick={() => { setSelectedReview(null); setSelectedChapter(null); }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }


                /* MODE 3: SUBMITTED CHAPTER LIST TABLE */
                if (previewTab === 'chapters') {
                  return (
                    <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h4 className="mod-inspector-title" style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>
                            📖 Submitted Chapters ({chaptersList.length} Chapters)
                          </h4>
                          <span className="mod-inspector-subtitle" style={{ fontSize: '13px' }}>Click "👁️ View Chapter" to switch reader focus</span>
                        </div>

                        {chaptersList.length === 0 ? (
                          <div className="mod-inspector-card" style={{ padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
                            <p className="mod-inspector-title" style={{ margin: '0 0 6px', fontWeight: '700', fontSize: '16px' }}>Raw Comic Profile Entry</p>
                            <p className="mod-inspector-subtitle" style={{ margin: 0 }}>This is an initial raw comic catalog profile submission. No chapters have been uploaded yet.</p>
                          </div>
                        ) : (
                          <div className="mod-inspector-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                            <table className="mod-chapters-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                              <thead>
                                <tr>
                                  <th style={{ padding: '14px 18px', color: theme === 'light' ? '#334155' : '#cbd5e1', fontWeight: '800' }}>Chapter #</th>
                                  <th style={{ padding: '14px 18px', color: theme === 'light' ? '#334155' : '#cbd5e1', fontWeight: '800' }}>Pages / Length</th>
                                  <th style={{ padding: '14px 18px', color: theme === 'light' ? '#334155' : '#cbd5e1', fontWeight: '800' }}>Submitted Time</th>
                                  <th style={{ padding: '14px 18px', textAlign: 'right', color: theme === 'light' ? '#334155' : '#cbd5e1', fontWeight: '800' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {chaptersList.map((chap, idx) => {
                                  const isSelected = activeChap && activeChap.id === chap.id;
                                  const rowTextColor = isSelected
                                    ? (theme === 'light' ? '#581c87' : '#e9d5ff')
                                    : (theme === 'light' ? '#0f172a' : '#f1f5f9');
                                  
                                  return (
                                    <tr 
                                      key={chap.id || idx} 
                                      className={isSelected ? 'selected' : ''}
                                      style={{
                                        background: isSelected
                                          ? (theme === 'light' ? '#f3e8ff' : 'rgba(168,85,247,0.18)')
                                          : 'transparent'
                                      }}
                                    >
                                      <td style={{ padding: '14px 18px', fontWeight: '800', color: rowTextColor }}>
                                        {chap.title && !chap.title.toLowerCase().startsWith('chapter') ? `Chapter ${chap.number || idx + 1} — ${chap.title}` : (chap.title || `Chapter ${chap.number || idx + 1}`)}
                                      </td>
                                      <td style={{ padding: '14px 18px', fontWeight: '600', color: rowTextColor }}>
                                        📄 {Array.isArray(chap.pages) ? chap.pages.length : (Array.isArray(chap.images) ? chap.images.length : 0)} Pages {chap.words ? `· ${chap.words}` : ''}
                                      </td>
                                      <td style={{ padding: '14px 18px', fontWeight: '600', color: rowTextColor }}>
                                        ⏱️ {formatTimeAgo(chap.timestamp || selectedReview.timestamp)}
                                      </td>
                                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                          <ModernButton
                                            variant={2}
                                            label={isSelected ? '✓ Inspecting' : '👁️ View'}
                                            onClick={() => handleSelectChapterItem(chap)}
                                          />
                                          {selectedReview.status === 'pending' && chap.status !== 'approved' && chap.status !== 'rejected' && (
                                            <>
                                              <ModernButton
                                                variant={2}
                                                label="✓ Approve"
                                                className="btn-approve"
                                                onClick={() => onModalApproveClick(chap)}
                                              />
                                              <ModernButton
                                                variant={2}
                                                label="✗ Reject"
                                                className="btn-reject"
                                                onClick={() => onModalRejectClick(chap)}
                                              />
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                /* MODE 4: AUTHOR INPUT DATA REVIEW WORKBENCH (DEFAULT/SYNOPSIS) */
                return (
                  <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
                    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {/* Author Input Fields Review Card */}
                      <div className="mod-inspector-card" style={{
                        borderRadius: '16px',
                        padding: '24px'
                      }}>
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '24px' }}>
                          {/* Cover Image Input Preview */}
                          <div style={{
                            width: '150px',
                            height: '210px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            border: '1px solid rgba(148,163,184,0.2)',
                            flexShrink: 0
                          }}>
                            {selectedReview.cover && (selectedReview.cover.startsWith('http') || selectedReview.cover.includes('/')) ? (
                              <img src={selectedReview.cover} alt={selectedReview.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: '#7c3aed' }}>
                                {selectedReview.cover || '📚'}
                              </div>
                            )}
                          </div>

                          {/* Core Input Fields */}
                          <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                              <span className="mod-pane-title--raw" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
                                Comic Title *
                              </span>
                              <h2 className="mod-inspector-title" style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>
                                {selectedReview.title}
                              </h2>
                            </div>

                            {/* Author Input Fields Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                              <div className="mod-inspector-card" style={{ padding: '10px 12px', borderRadius: '8px' }}>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block' }}>Original Language *</span>
                                <strong style={{ fontSize: '13.5px', display: 'block', marginTop: '4px' }}>{getSubmissionLanguage(selectedReview)}</strong>
                              </div>

                              <div className="mod-inspector-card" style={{ padding: '10px 12px', borderRadius: '8px' }}>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block' }}>Minimum Age</span>
                                <strong style={{ fontSize: '13.5px', display: 'block', marginTop: '4px' }}>{getSubmissionMinAge(selectedReview)}</strong>
                              </div>

                              <div className="mod-inspector-card" style={{ padding: '10px 12px', borderRadius: '8px' }}>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block' }}>Publication Status</span>
                                <strong style={{ fontSize: '13.5px', color: '#10b981', display: 'block', marginTop: '4px' }}>{getSubmissionStatus(selectedReview)}</strong>
                              </div>

                              <div className="mod-inspector-card" style={{ padding: '10px 12px', borderRadius: '8px' }}>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block' }}>Author Account</span>
                                <strong style={{ fontSize: '13.5px', display: 'block', marginTop: '4px' }}>{getSubmissionAuthor(selectedReview)}</strong>
                              </div>
                            </div>

                            {/* Genres Input Field Display */}
                            {(() => {
                              const genresList = getSubmissionGenres(selectedReview);
                              return genresList && genresList.length > 0 ? (
                                <div>
                                  <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Genres</span>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {genresList.map((genre, idx) => (
                                      <span key={idx} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: 'rgba(124,58,237,0.15)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)' }}>
                                        {genre}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>

                        {/* Description Field Review */}
                        <div style={{ borderTop: '1px solid rgba(148,163,184,0.15)', paddingTop: '16px', marginTop: '12px' }}>
                          <span className="mod-pane-title--raw" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>
                            Description
                          </span>
                          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {getSubmissionDescription(selectedReview) || 'No description has been added yet.'}
                          </p>
                        </div>
                      </div>

                      {/* Rejection Feedback if Rejected */}
                      {selectedReview.status === 'rejected' && (
                        <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderLeft: '4px solid #ef4444' }}>
                          <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                            Rejection Feedback:
                          </strong>
                          <span style={{ fontStyle: 'italic', fontSize: '13.5px' }}>
                            "{selectedReview.rejectionReason || 'No feedback recorded.'}"
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right Collapsible Google Docs Style Feedback Comments Sidebar Drawer */}
            {showCommentsSidebar && (
              <div className="mod-doc-comments-sidebar">
                {/* Sidebar Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(148,163,184,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 className="mod-inspector-title" style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>
                      💬 Contextual Feedback ({ (docCommentsMap[selectedReview.id] || []).length })
                    </h4>
                    <span className="mod-inspector-subtitle" style={{ fontSize: '11.5px' }}>
                      Google Docs style pinned comments
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mod-modal-close-btn"
                    onClick={() => setShowCommentsSidebar(false)}
                    title="Close Sidebar"
                  >
                    ×
                  </button>
                </div>

                {/* Sub-tabs for filtering sidebar comments */}
                {(() => {
                  const allList = docCommentsMap[selectedReview.id] || [];
                  const pageNotesList = allList.filter(c => c.targetType === 'page' || (!c.coords && c.targetType !== 'field'));
                  const pointPinsList = allList.filter(c => c.targetType === 'point' || c.xPercentage !== null);

                  const displayList = allList.filter(c => {
                    if (sidebarCommentTab === 'page') return c.targetType === 'page' || (!c.coords && c.targetType !== 'field');
                    if (sidebarCommentTab === 'point') return c.targetType === 'point' || c.xPercentage !== null;
                    return true;
                  });

                  return (
                    <>
                      <div className="mod-doc-comments-sidebar-tabs">
                        <button
                          type="button"
                          className={`mod-sidebar-tab-btn ${sidebarCommentTab === 'all' ? 'active-all' : ''}`}
                          onClick={() => setSidebarCommentTab('all')}
                        >
                          All ({allList.length})
                        </button>
                        <button
                          type="button"
                          className={`mod-sidebar-tab-btn ${sidebarCommentTab === 'page' ? 'active-notes' : ''}`}
                          onClick={() => {
                            setSidebarCommentTab('page');
                            setIsPinLocationMode(false);
                          }}
                        >
                          📄 Notes ({pageNotesList.length})
                        </button>
                        <button
                          type="button"
                          className={`mod-sidebar-tab-btn ${sidebarCommentTab === 'point' ? 'active-pins' : ''}`}
                          onClick={() => {
                            setSidebarCommentTab('point');
                            setIsPinLocationMode(true);
                          }}
                        >
                          📍 Pins ({pointPinsList.length})
                        </button>
                      </div>

                      {/* Sidebar Body with Comment List */}
                      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Quick Add Feedback Form inside Sidebar — Only for Pending Submissions */}
                        {selectedReview.status === 'pending' ? (
                          sidebarCommentTab === 'point' || isPinLocationMode ? (
                            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#c084fc', letterSpacing: '0.5px' }}>
                                  📍 Location Pin Drop Mode
                                </span>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', color: '#a855f7', fontWeight: '700' }}>
                                  Target: Page {pageIndex + 1}
                                </span>
                              </div>

                              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.2)' }}>
                                <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.4', color: theme === 'light' ? '#334155' : '#e2e8f0' }}>
                                  👇 <strong>Click anywhere directly on Page {pageIndex + 1} image panel</strong> to drop an exact coordinate pin marker!
                                </p>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                                <span style={{ fontSize: '11.5px', color: '#a855f7', fontWeight: '700' }}>
                                  📍 Pin Mode ACTIVE
                                </span>
                                <button
                                  type="button"
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(148,163,184,0.3)',
                                    background: 'transparent',
                                    color: theme === 'light' ? '#475569' : '#cbd5e1',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    setIsPinLocationMode(false);
                                    setSidebarCommentTab('page');
                                  }}
                                >
                                  Switch to 📄 Page Note
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ padding: '14px', borderRadius: '12px', background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.15)', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#0ea5e9', letterSpacing: '0.5px' }}>
                                  ➕ Quick Add Page Note
                                </span>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600' }}>
                                  Target: Page {pageIndex + 1}
                                </span>
                              </div>

                              <textarea
                                className="rejection-reason-textarea"
                                placeholder={`Type general page note for Page ${pageIndex + 1}...`}
                                value={pinCommentText}
                                onChange={(e) => setPinCommentText(e.target.value)}
                                style={{ minHeight: '70px', padding: '10px 12px', fontSize: '12.5px', borderRadius: '8px', boxSizing: 'border-box', width: '100%' }}
                              />

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                <button
                                  type="button"
                                  style={{
                                    width: '100%',
                                    padding: '8px 14px',
                                    fontSize: '12.5px',
                                    fontWeight: '700',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: pinCommentText.trim() ? 'pointer' : 'not-allowed',
                                    background: pinCommentText.trim() ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : 'rgba(148,163,184,0.2)',
                                    color: pinCommentText.trim() ? '#ffffff' : 'rgba(255,255,255,0.4)',
                                    boxShadow: pinCommentText.trim() ? '0 4px 12px rgba(14,165,233,0.3)' : 'none',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                  }}
                                  onClick={() => {
                                    if (!pinCommentText.trim()) return;
                                    handleAddDocComment(
                                      selectedReview.id,
                                      'page',
                                      `page-${pageIndex + 1}`,
                                      `Page ${pageIndex + 1}`,
                                      pinCommentText
                                    );
                                    setPinCommentText('');
                                  }}
                                  disabled={!pinCommentText.trim()}
                                >
                                  📄 Add Page Note
                                </button>
                              </div>
                            </div>
                          )
                        ) : (
                          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', fontSize: '12px', textAlign: 'center', lineHeight: '1.5' }}>
                            🔒 Submission is <strong style={{ color: '#7c3aed' }}>{selectedReview.status.toUpperCase()}</strong> — Comments & Inspection Notes are frozen in read-only mode.
                          </div>
                        )}

                        {displayList.length === 0 ? (
                          <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '36px', marginBottom: '10px' }}>💬</div>
                            <p className="mod-inspector-title" style={{ margin: '0 0 6px', fontWeight: '700', fontSize: '14px' }}>No Comments Found</p>
                            <p className="mod-inspector-subtitle" style={{ margin: 0, fontSize: '12px', lineHeight: '1.5' }}>
                              No comments match the selected filter category ({sidebarCommentTab}).
                            </p>
                          </div>
                        ) : (
                          displayList.map((c, idx) => (
                            <div
                              key={c.id || idx}
                              id={`doc-comment-card-${c.id}`}
                              className={`mod-doc-comment-card ${activePinTarget === c.id ? 'active-highlight' : ''}`}
                              onClick={() => {
                                setActivePinTarget(c.id);
                                if (c.targetKey.startsWith('page-')) {
                                  const pNum = parseInt(c.targetKey.replace('page-', ''), 10);
                                  if (!isNaN(pNum)) {
                                    setPageIndex(pNum - 1);
                                    setPreviewTab('reader');
                                    if (readerLayout === 'vertical') {
                                      scrollToPageElement(pNum);
                                    }
                                  }
                                }
                              }}
                              style={{
                                cursor: c.targetKey.startsWith('page-') ? 'pointer' : 'default',
                                borderColor: activePinTarget === c.id ? '#7c3aed' : undefined,
                                boxShadow: activePinTarget === c.id ? '0 0 16px rgba(124, 58, 237, 0.4)' : undefined
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {renderCommentBadge(c, allList.findIndex(item => item.id === c.id) + 1)}

                                {/* Edit & Delete Action Buttons for Pending Submissions */}
                                {selectedReview.status === 'pending' && (
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditDocComment(c);
                                      }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', opacity: 0.7 }}
                                      title="Edit Comment"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDocComment(selectedReview.id, c.id);
                                      }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', opacity: 0.7 }}
                                      title="Delete Comment"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Inline Comment Editing View */}
                              {editingCommentId === c.id ? (
                                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                                  <textarea
                                    className="rejection-reason-textarea"
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    style={{ minHeight: '60px', padding: '8px 10px', fontSize: '12.5px' }}
                                    autoFocus
                                  />
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      className="mod-mode-tab"
                                      style={{ padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer' }}
                                      onClick={() => setEditingCommentId(null)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className="mod-mode-tab active"
                                      style={{ padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer' }}
                                      onClick={() => handleSaveEditDocComment(selectedReview.id, c.id)}
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                  {c.text}
                                </p>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginTop: '4px' }}>
                                <span style={{ fontWeight: '700', color: '#7c3aed' }}>🛡️ {c.author || 'Moderator'}</span>
                                <span className="mod-inspector-subtitle">{formatTimeAgo(c.createdAt)} {c.editedAt ? '(edited)' : ''}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: PIN COMMENT MODAL (FOR FIELDS & PAGES) ───────────────── */}
      {fieldCommentModalTarget && selectedReview && createPortal(
        <div className="mod-modal-overlay mod-inspector-high-priority">
          <div className="mod-modal-card">
            <div className="mod-modal-header">
              <h3>📌 Add Pinned Feedback Comment</h3>
              <button className="mod-modal-close-btn" onClick={() => setFieldCommentModalTarget(null)}>×</button>
            </div>

            <div className="mod-modal-body">
              <p style={{ fontSize: '13.5px', margin: '0 0 12px', color: 'var(--mod-text-secondary)' }}>
                Targeting: <strong style={{ color: '#7c3aed' }}>{fieldCommentModalTarget.targetLabel}</strong>
              </p>
              
              <textarea
                className="rejection-reason-textarea"
                placeholder="Type your specific inspection comment (e.g. Dialogue text typo, missing panel background, cover resolution too low)..."
                value={pinCommentText}
                onChange={(e) => setPinCommentText(e.target.value)}
                autoFocus
              />
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={2} 
                label="Cancel" 
                className="btn-cancel"
                onClick={() => setFieldCommentModalTarget(null)} 
              />
              <ModernButton 
                variant={2} 
                label="📌 Pin Comment" 
                className="btn-approve"
                onClick={() => {
                  handleAddDocComment(
                    selectedReview.id,
                    fieldCommentModalTarget.targetType,
                    fieldCommentModalTarget.targetKey,
                    fieldCommentModalTarget.targetLabel,
                    pinCommentText,
                    fieldCommentModalTarget.coords || null
                  );
                }}
                disabled={!pinCommentText.trim()}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── SIMPLE EVIDENCE VIEW MODAL ────────── */}
      {simpleEvidenceView && createPortal(
        <div className="mod-modal-overlay mod-inspector-high-priority" style={{ 
          zIndex: 999999, 
          backdropFilter: 'blur(16px)', 
          WebkitBackdropFilter: 'blur(16px)',
          backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.7)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{ 
            maxWidth: '480px', 
            width: '90%', 
            borderRadius: '24px', 
            background: theme === 'light' 
              ? 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.85) 100%)' 
              : 'linear-gradient(135deg, rgba(30,27,75,0.95) 0%, rgba(15,23,42,0.85) 100%)',
            boxShadow: theme === 'light' 
              ? '0 20px 40px -10px rgba(124,58,237,0.15), 0 0 0 1px rgba(255,255,255,0.5) inset' 
              : '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.3) inset',
            border: theme === 'light' ? '1px solid rgba(124,58,237,0.1)' : '1px solid rgba(139,92,246,0.2)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transform: 'scale(1)',
            animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            
            {/* Top decorative gradient bar */}
            <div style={{ height: '6px', width: '100%', background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #ff6b35 100%)' }} />

            <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '22px', 
                  fontWeight: '800', 
                  background: 'linear-gradient(90deg, #9333ea, #db2777)', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.5px'
                }}>
                  Submission Evidence
                </h3>
                <span style={{ fontSize: '14px', color: theme === 'light' ? '#64748b' : '#94a3b8', fontWeight: '500' }}>
                  {simpleEvidenceView.title || simpleEvidenceView.comicName}
                </span>
              </div>
              <button 
                onClick={() => setSimpleEvidenceView(null)}
                style={{
                  background: theme === 'light' ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = theme === 'light' ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = theme === 'light' ? '#64748b' : '#94a3b8'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div style={{ padding: '0 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Image Section */}
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  width: '140px', height: '140px', 
                  background: '#a855f7', 
                  filter: 'blur(50px)', 
                  opacity: theme === 'light' ? 0.15 : 0.25, 
                  borderRadius: '50%', 
                  top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  zIndex: 0
                }} />
                <img 
                  src={simpleEvidenceView.cover || simpleEvidenceView.coverImageUrl || '/assets/default_cover.jpg'} 
                  alt="Cover" 
                  style={{ 
                    width: '130px', height: '180px', 
                    objectFit: 'cover', 
                    borderRadius: '12px', 
                    border: theme === 'light' ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: theme === 'light' ? '0 15px 35px -5px rgba(0,0,0,0.15)' : '0 15px 35px -5px rgba(0,0,0,0.5)',
                    position: 'relative',
                    zIndex: 1,
                    transition: 'transform 0.3s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05) translateY(-5px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
                />
              </div>
              
              {/* Reason Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: simpleEvidenceView.status === 'rejected' ? '#ef4444' : '#10b981', boxShadow: `0 0 10px ${simpleEvidenceView.status === 'rejected' ? '#ef4444' : '#10b981'}` }} />
                  <h4 style={{ margin: 0, fontSize: '13px', color: theme === 'light' ? '#334155' : '#e2e8f0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                    {simpleEvidenceView.status === 'rejected' ? 'Rejection Reason' : 'Status Reason'}
                  </h4>
                </div>
                
                <div className="glass-input-wrapper" style={{
                  padding: '18px 20px', 
                  background: theme === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  borderRadius: '12px', 
                  border: theme === 'light' ? '1px solid rgba(148,163,184,0.2)' : '1px solid rgba(148,163,184,0.1)', 
                  fontSize: '14.5px', 
                  lineHeight: '1.7', 
                  color: theme === 'light' ? '#1e293b' : '#f8fafc',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {simpleEvidenceView.rejectionReason || simpleEvidenceView.notes || 'No specific reason provided.'}
                </div>
              </div>
              
            </div>
            
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: REJECTION REMARKS (UPGRADED WITH PAGE THUMBNAILS & PINNED COMMENTS REPORT) ───────────────── */}
      {selectedReject && createPortal(
        <div className="mod-modal-overlay mod-inspector-high-priority" style={{ zIndex: 999999 }}>
          <div className="mod-modal-card mod-reject-modal" style={{ maxWidth: '680px', width: '90%', borderRadius: '16px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="mod-modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#ef4444' }}>
                  ✗ Confirm Submission Rejection
                </h3>
                <span className="mod-inspector-subtitle" style={{ fontSize: '12px' }}>
                  {selectedReject.title} · Author: {formatSubmitterName(selectedReject.submittedBy).replace('Author: ', '')}
                </span>
              </div>
              <button className="mod-modal-close-btn" onClick={() => setSelectedReject(null)}>×</button>
            </div>

            <div className="mod-modal-body" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(() => {
                const chaptersList = getSubmissionChapters(selectedReject);
                const totalChapters = chaptersList.length;
                const uninspectedCount = chaptersList.filter(c => !inspectedChapterIds.has(c.id)).length;
                
                return (
                  <>
                    <p style={{ fontSize: '13.5px', margin: 0, lineHeight: '1.5', color: 'var(--mod-text-secondary)' }}>
                      You are about to reject raw submission <strong>"{selectedReject.title}"</strong> (which contains {totalChapters} chapter{totalChapters !== 1 ? 's' : ''}). Review the attached inspection feedback report below before sending it to the author.
                    </p>
                    {uninspectedCount > 0 && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', color: '#b91c1c', fontSize: '13.5px' }}>
                        ⚠️ <strong>Warning:</strong> {uninspectedCount} chapter{uninspectedCount !== 1 ? 's have' : ' has'} not been inspected yet. Are you sure you want to proceed with rejecting the entire submission?
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Editable Rejection Reason Area */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--mod-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Rejection Message / Overall Remarks (Required)
                </label>
                <textarea
                  className="rejection-reason-textarea"
                  placeholder="Type overall rejection remarks or specific revision instructions for the author..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{ width: '100%', minHeight: '110px', padding: '12px', borderRadius: '8px', fontSize: '13.5px', outline: 'none' }}
                />
              </div>
            </div>

            <div className="mod-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid rgba(148,163,184,0.15)', display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={2} 
                label="Cancel" 
                className="btn-cancel"
                onClick={() => setSelectedReject(null)} 
              />
              <ModernButton 
                variant={2} 
                label="✗ Confirm & Send Rejection" 
                className="btn-reject"
                onClick={onConfirmRejectClick}
                disabled={!rejectionReason.trim()}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ReviewQueue
