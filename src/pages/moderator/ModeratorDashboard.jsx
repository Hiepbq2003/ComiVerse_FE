import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../../assets/style/moderator/dashboard.css'
import ModeratorLayout from '../../components/layout/ModeratorLayout'
import ReviewQueue from './ReviewQueue'
import ComicManagement from './ComicManagement'
import GenreManagement from './GenreManagement'
import ProjectTeams from './ProjectTeams'
import ChatMonitor from './ChatMonitor'
import ForumModeration from './ForumModeration'
import ModeratorReports from './ModeratorReports'
import ReportCategories from './ReportCategories'
import { getAllComicsApi, updateComicApi, deleteComicApi, getComicLeaderboardApi } from '../../services/api/ComicApi'
import { getAllProjectTeamsApi, createProjectTeamApi, deleteProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { getAllSubmissionsApi, approveSubmissionApi, rejectSubmissionApi } from '../../services/api/SubmissionApi'
import { getAllGenresApi } from '../../services/api/GenreApi'
import { getAllForumThreadsApi } from '../../services/api/ForumThreadApi'
import { getAllChatFlagsApi } from '../../services/api/ChatFlagApi'
import { approveChapterDirectApi } from '../../services/api/ChapterApi'
import { toast } from 'react-toastify'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import ModernButton from '../../components/common/ModernButton'
import { getAuth } from '../../utils/Auth'
import { isLanguageInModeratorScope, getModeratorScope } from '../../utils/moderatorScope'


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

const getCategoryStyle = (actionType) => {
  switch (actionType) {
    case 'REVIEW_QUEUE':
      return { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' };
    case 'PROJECT_TEAMS':
      return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
    case 'CHAT_MODERATION':
      return { background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.2)' };
    case 'FORUM_MODERATION':
      return { background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.2)' };
    case 'COMIC_MANAGEMENT':
      return { background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.2)' };
    default:
      return { background: 'rgba(255, 255, 255, 0.05)', color: 'var(--mod-text-secondary)', border: '1px solid rgba(255, 255, 255, 0.1)' };
  }
};

const renderDescription = (description) => {
  if (!description) return '';
  const regex = /(chapter\s+[0-9a-zA-Z.-]+)/i;
  const parts = description.split(regex);
  if (parts.length > 1) {
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return <strong key={index} style={{ color: 'var(--mod-purple)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{part}</strong>;
      }
      return part;
    });
  }
  return description;
};

function ModeratorDashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState(() => {
    return location.state?.activeNav || 'dashboard'
  })

  // Sync activeNav changes back to history state so F5 preserves the current tab
  useEffect(() => {
    if (location.state?.activeNav !== activeNav) {
      navigate(location.pathname, { replace: true, state: { ...location.state, activeNav } })
    }
  }, [activeNav, navigate, location.pathname, location.state])
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [pinnedPoint, setPinnedPoint] = useState(null)
  const [hoveredGenre, setHoveredGenre] = useState(null)
  const [chartTimeframe, setChartTimeframe] = useState('week') // 'week' | 'month'
  
  // Dynamic API backed states
  const [submissions, setSubmissions] = useState([])
  const [comics, setComics] = useState([])
  const [topComics, setTopComics] = useState([])
  const [projectTeams, setProjectTeams] = useState([])
  const [genres, setGenres] = useState([])
  const [forumThreads, setForumThreads] = useState([])
  const [chatFlags, setChatFlags] = useState([])
  const [loading, setLoading] = useState(true)

  // Creation Team Modal Shared triggers
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [createTeamStep, setCreateTeamStep] = useState(1)
  const [createTeamForm, setCreateTeamForm] = useState({
    title: '',
    comicName: '',
    sourceLang: 'Japanese',
    targetLang: 'English',
    leaderName: '',
    leaderId: '',
    priority: 'High',
    cover: '',
    comicId: ''
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  const getComicCover = (item) => {
    if (!item) return '';
    return item.cover || item.coverImage || item.coverImageUrl || item.coverUrl || item.cover_url || item.imageUrl || '';
  };

  const isTitleMatch = (t1, t2) => {
    if (!t1 || !t2) return false;
    const clean1 = String(t1).trim().toLowerCase().replace(/[^a-z0-9]/gi, '').replace(/s$/, '');
    const clean2 = String(t2).trim().toLowerCase().replace(/[^a-z0-9]/gi, '').replace(/s$/, '');
    return clean1 === clean2;
  };

  const deduplicateComics = (list) => {
    if (!Array.isArray(list)) return [];
    const seenIds = new Set();
    const seenTitles = new Set();
    return list.filter(item => {
      if (!item) return false;
      const idKey = item.id ? String(item.id).toLowerCase() : '';
      const titleKey = item.title ? String(item.title).trim().toLowerCase().replace(/[^a-z0-9]/gi, '').replace(/s$/, '') : '';
      
      if (idKey && seenIds.has(idKey)) return false;
      if (titleKey && seenTitles.has(titleKey)) return false;
      
      if (idKey) seenIds.add(idKey);
      if (titleKey) seenTitles.add(titleKey);
      return true;
    });
  };

  const syncApprovedComics = (initialComics, subsList) => {
    const result = (initialComics || []).map(c => {
      const cCover = getComicCover(c);
      return {
        ...c,
        cover: cCover,
        coverImage: cCover,
        coverImageUrl: cCover
      };
    });
    (subsList || []).forEach(sub => {
      if (sub.status === 'approved' && (sub.title || sub.comicName || sub.comicTitle)) {
        const comicTitle = (sub.title || sub.comicName || sub.comicTitle).trim();
        const existingIdx = result.findIndex(c => isTitleMatch(c.title, comicTitle) || (sub.comicId && String(c.id) === String(sub.comicId)));
        const coverVal = getComicCover(sub);
        if (existingIdx !== -1) {
          const finalCover = getComicCover(result[existingIdx]) || coverVal;
          const subChapsCount = Array.isArray(sub.allChapters) ? sub.allChapters.length : (Array.isArray(sub.chapters) ? sub.chapters.length : 0);
          const currentChapsCount = result[existingIdx].chapterCount || result[existingIdx].chapters || 0;
          result[existingIdx] = {
            ...result[existingIdx],
            cover: finalCover,
            coverImage: finalCover,
            coverImageUrl: finalCover,
            publicationStatus: result[existingIdx].publicationStatus || 'ONGOING',
            status: 'Active',
            chapterCount: Math.max(currentChapsCount, subChapsCount),
            chapters: Math.max(currentChapsCount, subChapsCount)
          };
        } else {
          const authorNameClean = formatSubmitterName(sub.submittedBy || sub.author || sub.submittedByEmail || sub.authorName || 'Unknown Author').replace(/^Author:\s*/i, '');
          const stableId = sub.comicId || (sub.id ? `comic-${sub.id}` : (sub.submissionId ? `comic-${sub.submissionId}` : `comic-${comicTitle.replace(/\s+/g, '-').toLowerCase()}`));

          // Check if local override marks this comic as archived
          let isArchived = false;
          try {
            const l1 = JSON.parse(localStorage.getItem('comiverse_local_comic_' + stableId) || '{}');
            const l2 = JSON.parse(localStorage.getItem('comiverse_local_comic_' + sub.comicId) || '{}');
            if (l1.archived || l2.archived) isArchived = true;
          } catch (e) {}

          // Dynamically check if this submission holds a real comic UUID that no longer exists in backend DB
          const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
          const hasRealBackendComics = Array.isArray(initialComics) && initialComics.length > 0;
          const isDeletedBackendComic = hasRealBackendComics && sub.comicId && sub.comicId !== sub.id && isUUID(sub.comicId);

          if (!isArchived && !isDeletedBackendComic) {
            const subChapsCount = Array.isArray(sub.allChapters) ? sub.allChapters.length : (Array.isArray(sub.chapters) ? sub.chapters.length : 0);
            const initialChaps = subChapsCount > 0 ? subChapsCount : (sub.chapterCount || sub.chapters || sub.chapterNumber || sub.number || 0);

            result.unshift({
              id: stableId,
              title: comicTitle,
              authorName: authorNameClean,
              author: sub.submittedBy || sub.author || sub.submittedByEmail || sub.authorName || 'Unknown Author',
              genres: Array.isArray(sub.genres) ? sub.genres : (typeof sub.genres === 'string' ? sub.genres.split(',').map(g => g.trim()) : []),
              cover: coverVal,
              coverImage: coverVal,
              coverImageUrl: coverVal,
              publicationStatus: 'ONGOING',
              status: 'Active',
              language: sub.language || sub.rawLanguage || sub.originalLanguage || sub.targetLanguage || '',
              description: sub.description || sub.summary || sub.synopsis || sub.comicDescription || sub.overview || '',
              chapterCount: initialChaps,
              chapters: initialChaps,
              views: 0,
              viewCount: 0,
              rating: sub.rating || sub.ratingAverage || 0.0,
              ratingAverage: sub.ratingAverage || sub.rating || 0.0,
              ratingCount: sub.ratingCount || 0,
              projectTeam: '-',
              lastChapterUpdatedAt: sub.approvedAt || sub.timestamp || new Date().toISOString()
            });
          }
        }
      }
    });
    return deduplicateComics(result);
  };

  const publishComicToManagement = (sub, isSingleChapter = false, approvedChapObj = null) => {
    if (!sub || (!sub.title && !sub.comicName && !sub.comicTitle)) return;
    const comicTitle = (sub.title || sub.comicName || sub.comicTitle).trim();
    if (!comicTitle) return;

    const coverVal = getComicCover(sub);
    const nowIso = new Date().toISOString();
    const currentUser = getAuth()?.user;
    const currentUsername = currentUser?.fullName || currentUser?.username || 'Moderator';

    setComics(prev => {
      const existingIdx = prev.findIndex(c => isTitleMatch(c.title, comicTitle) || (sub.comicId && String(c.id) === String(sub.comicId)));
      if (existingIdx !== -1) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const finalCover = getComicCover(existing) || coverVal;
        const currentChapsList = Array.isArray(existing.allChapters) ? existing.allChapters : (Array.isArray(existing.chaptersData) ? existing.chaptersData : []);
        let newChapsList = currentChapsList;
        if (approvedChapObj) {
          const enrichedChap = { ...approvedChapObj, approvedBy: approvedChapObj.approvedBy || currentUsername, approvedAt: approvedChapObj.approvedAt || nowIso };
          const exists = currentChapsList.some(c => isSameChapterItem(c, approvedChapObj));
          if (!exists) newChapsList = [...currentChapsList, enrichedChap];
        } else if (Array.isArray(sub.allChapters) && sub.allChapters.length > 0) {
          newChapsList = sub.allChapters.map(c => ({ ...c, approvedBy: c.approvedBy || currentUsername, approvedAt: c.approvedAt || nowIso }));
        }
        const currentCount = existing.chapterCount !== undefined ? existing.chapterCount : (existing.chapters || 0);
        const newChapCount = newChapsList.length > 0 ? newChapsList.length : (isSingleChapter ? currentCount + 1 : Math.max(currentCount, sub.chapterNumber || sub.number || (currentCount + 1)));
        updated[existingIdx] = {
          ...existing,
          cover: finalCover,
          coverImage: finalCover,
          coverImageUrl: finalCover,
          publicationStatus: 'ONGOING',
          status: 'Active',
          chapterCount: newChapCount,
          chapters: newChapCount,
          allChapters: newChapsList,
          chaptersData: newChapsList,
          approvedAt: existing.approvedAt || nowIso,
          approvedBy: existing.approvedBy || currentUsername,
          lastChapterUpdatedAt: nowIso
        };
        return deduplicateComics(updated);
      } else {
        const authorNameClean = formatSubmitterName(sub.submittedBy || sub.author || sub.submittedByEmail || sub.authorName || 'Unknown Author').replace(/^Author:\s*/i, '');
        const initialChapsList = approvedChapObj ? [{ ...approvedChapObj, approvedBy: currentUsername, approvedAt: nowIso }] : (Array.isArray(sub.allChapters) ? sub.allChapters.map(c => ({ ...c, approvedBy: c.approvedBy || currentUsername, approvedAt: c.approvedAt || nowIso })) : (Array.isArray(sub.chapters) ? sub.chapters.map(c => ({ ...c, approvedBy: c.approvedBy || currentUsername, approvedAt: c.approvedAt || nowIso })) : []));
        const initialChaps = initialChapsList.length > 0 ? initialChapsList.length : (isSingleChapter ? 1 : (sub.chapterNumber || sub.number || sub.chapters || 0));
        const newComic = {
          id: sub.comicId || `comic-${Date.now()}`,
          title: comicTitle,
          authorName: authorNameClean,
          author: sub.submittedBy || sub.author || sub.submittedByEmail || sub.authorName || 'Unknown Author',
          genres: Array.isArray(sub.genres) ? sub.genres : (typeof sub.genres === 'string' ? sub.genres.split(',').map(g => g.trim()) : []),
          cover: coverVal,
          coverImage: coverVal,
          coverImageUrl: coverVal,
          publicationStatus: 'ONGOING',
          status: 'Active',
          language: sub.language || sub.rawLanguage || sub.originalLanguage || sub.targetLanguage || '',
          description: sub.description || sub.summary || sub.synopsis || sub.comicDescription || sub.overview || '',
          chapterCount: initialChaps,
          chapters: initialChaps,
          allChapters: initialChapsList,
          chaptersData: initialChapsList,
          views: 0,
          viewCount: 0,
          rating: sub.ratingCount ? (sub.rating || sub.ratingAverage || 0.0) : 0.0,
          ratingAverage: sub.ratingCount ? (sub.ratingAverage || sub.rating || 0.0) : 0.0,
          ratingCount: sub.ratingCount || 0,
          projectTeam: '-',
          approvedAt: sub.approvedAt || nowIso,
          lastChapterUpdatedAt: nowIso
        };
        return deduplicateComics([newComic, ...prev]);
      }
    });
  };

  const syncComicWithLocalOverride = (comic) => {
    try {
      const savedLocal = localStorage.getItem('comiverse_local_comic_' + comic.id);
      if (savedLocal) {
        return { ...comic, ...JSON.parse(savedLocal) };
      }
    } catch(e) {}
    return comic;
  };

  const fetchComicsAndTeams = async () => {
    try {
      const [comicsData, teamsData, genresData] = await Promise.all([
        getAllComicsApi().catch(err => {
          console.warn('[ModeratorDashboard] getAllComicsApi fallback:', err?.message || err)
          return []
        }),
        getAllProjectTeamsApi().catch(err => {
          console.warn('[ModeratorDashboard] getAllProjectTeamsApi fallback:', err?.message || err)
          return []
        }),
        getAllGenresApi().catch(err => {
          console.warn('[ModeratorDashboard] getAllGenresApi fallback:', err?.message || err)
          return []
        })
      ])
      const authUser = getAuth()?.user;
      const rawComics = comicsData || [];
      
      // Auto-link submissions to real DB IDs if titles match
      setSubmissions(prevSubs => (prevSubs || []).map(sub => {
        if (!sub) return sub;
        const subTitle = sub.title || sub.comicName || sub.comicTitle;
        const dbMatch = rawComics.find(c => c && isTitleMatch(c.title, subTitle));
        if (dbMatch) {
          return {
            ...sub,
            comicId: dbMatch.id
          };
        }
        return sub;
      }));

      const mappedComics = syncApprovedComics(
        rawComics.map(c => {
          const merged = syncComicWithLocalOverride(c);
          const team = (teamsData || []).find(t => t.comicName && t.comicName.toLowerCase() === merged.title.toLowerCase())
          const cCover = getComicCover(merged);
          return {
            ...merged,
            cover: cCover,
            coverImage: cCover,
            coverImageUrl: cCover,
            projectTeam: team ? team.title : 'Unassigned',
            teamStatus: team ? team.status : 'None',
            chaptersCount: merged.chaptersCount || merged.chapterCount || merged.latestChapterNumber || 0
          }
        }).filter(c => isLanguageInModeratorScope(c.language || c.rawLanguage || c.originalLanguage, authUser)),
        submissions
      ).map(c => syncComicWithLocalOverride(c));
      setComics(deduplicateComics(mappedComics))
      
      let localTeams = [];
      try {
        const localRaw = localStorage.getItem('comiverse_local_project_teams');
        if (localRaw) localTeams = JSON.parse(localRaw);
      } catch(e) {}

      const rawTeams = Array.isArray(teamsData) ? teamsData : (teamsData?.data || []);
      const mergedTeamsMap = new Map();
      [...localTeams, ...rawTeams].forEach(t => {
        if (!t) return;
        const key = t.id || `${t.comicName}-${t.targetLang}`;
        if (!mergedTeamsMap.has(key)) {
          mergedTeamsMap.set(key, t);
        }
      });
      setProjectTeams(Array.from(mergedTeamsMap.values()));
      setGenres(genresData?.data || genresData || [])
    } catch (err) {
      console.error('Failed to fetch comics/teams:', err)
    }
  }

  const syncSubmissionsWithLocalOverride = (rawSubmissions) => {
    return rawSubmissions || [];
  };
  
  const fetchSubmissionsData = async () => {
    try {
      const data = await getAllSubmissionsApi()
      const authUser = getAuth()?.user;
      const filtered = (data || []).filter(s => isLanguageInModeratorScope(s.language || s.rawLanguage || s.targetLanguage || s.targetLang || s.originalLanguage, authUser));
      setSubmissions(syncSubmissionsWithLocalOverride(filtered))
    } catch (err) {
      console.error('Failed to fetch submissions:', err)
    }
  }

  const fetchForumThreadsData = async () => {
    try {
      const data = await getAllForumThreadsApi()
      setForumThreads(data || [])
    } catch (err) {
      console.error('Failed to fetch forum threads:', err)
    }
  }

  const fetchChatFlagsData = async () => {
    try {
      const data = await getAllChatFlagsApi()
      setChatFlags(data || [])
    } catch (err) {
      console.error('Failed to fetch chat flags:', err)
    }
  }

const withTimeout = (promise, fallbackValue = [], ms = 15000) => {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallbackValue), ms))
  ]).catch(() => fallbackValue);
};

  const fetchAllData = async () => {
    // If data is already present, refresh silently in background without showing full screen loader
    if (comics.length === 0 && submissions.length === 0) {
      setLoading(true);
    }
    try {
      // Phase 1: Core Dashboard Data (Comics, Teams, Submissions, Genres) with 2s max timeout
      const [comicsData, teamsData, submissionsData, genresData, leaderboardData] = await Promise.all([
        withTimeout(getAllComicsApi(), []),
        withTimeout(getAllProjectTeamsApi(), []),
        withTimeout(getAllSubmissionsApi(), []),
        withTimeout(getAllGenresApi(), []),
        withTimeout(getComicLeaderboardApi({ timeframe: 'month' }), [])
      ]);

      const authUser = getAuth()?.user;
      setTopComics(leaderboardData?.data || leaderboardData?.content || leaderboardData || []);
      
      const mergedSubmissionsData = [...(submissionsData || [])].filter(s => {
        // If we can map the submission to a comic, filter out comics with 0 chapters
        const comic = (comicsData || []).find(c => String(c.id) === String(s.comicId));
        if (comic && (!comic.chapterCount || comic.chapterCount <= 0)) {
          return false;
        }
        return true;
      });

      const enrichedRawSubmissions = mergedSubmissionsData.map(s => {
        const titleClean = (s.title || s.comicTitle || '').toLowerCase().trim();
        const cIdMatch = s.comicId ? String(s.comicId) : (s.id ? String(s.id) : null);

        const matchComic = (comicsData || []).find(c =>
          (cIdMatch && String(c.id) === cIdMatch) ||
          (titleClean && c.title && c.title.toLowerCase().trim() === titleClean)
        );

        const baseObj = matchComic ? { ...matchComic, ...s } : { ...s };
        
        let normalizedStatus = (s.status || baseObj.approvalStatus || baseObj.moderationStatus || 'pending').toLowerCase();
        if (normalizedStatus.includes('pending') || normalizedStatus.includes('submitted') || normalizedStatus === 'new') {
          normalizedStatus = 'pending';
        } else if (normalizedStatus.includes('approve') || normalizedStatus === 'published') {
          normalizedStatus = 'approved';
        } else if (normalizedStatus.includes('reject')) {
          normalizedStatus = 'rejected';
        }

        return {
          ...baseObj,
          id: s.id || `sub-${Date.now()}-${Math.random()}`,
          originalId: s.id,
          comicId: baseObj.comicId || baseObj.id,
          title: baseObj.title || baseObj.comicTitle || s.title || 'Untitled',
          cover: baseObj.coverImageUrl || baseObj.cover || s.cover || '',
          type: (s.submissionType || s.type || 'NEW_COMIC').toUpperCase(),
          status: normalizedStatus,
          author: baseObj.authorName || baseObj.author || s.submittedBy || 'Unknown',
          submittedAt: s.submittedAt || s.createdAt || new Date().toISOString(),
          comic: {
            ...(matchComic || {}),
            ...(s.comic || {})
          },
          originalLanguage: s.originalLanguage || s.original_language || s.language || s.rawLanguage || matchComic?.originalLanguage || matchComic?.language || 'Japanese',
          language: s.language || s.originalLanguage || s.rawLanguage || matchComic?.language || matchComic?.originalLanguage || 'Japanese',
          minimumAge: s.minimumAge ?? s.minAge ?? s.min_age ?? matchComic?.minimumAge ?? matchComic?.minAge ?? 13,
          minAge: s.minAge ?? s.minimumAge ?? s.min_age ?? matchComic?.minAge ?? matchComic?.minimumAge ?? 13,
          publicationStatus: s.publicationStatus || s.publication_status || matchComic?.publicationStatus || matchComic?.publication_status || 'ONGOING',
          submittedBy: s.submittedBy || s.submittedByEmail || s.author || matchComic?.submittedBy || matchComic?.author || matchComic?.authorName || authUser?.fullName || 'Unknown Author',
          summary: s.summary || s.description || s.synopsis || matchComic?.summary || matchComic?.description || matchComic?.synopsis || '',
          description: s.description || s.summary || s.synopsis || matchComic?.description || matchComic?.summary || matchComic?.synopsis || ''
        };
      });

      const filteredSubmissions = syncSubmissionsWithLocalOverride(
        enrichedRawSubmissions.filter(s => isLanguageInModeratorScope(s.language || s.rawLanguage || s.targetLanguage || s.targetLang || s.originalLanguage, authUser))
      );
      
      setSubmissions(filteredSubmissions);

      const mappedComics = syncApprovedComics(
        (comicsData || []).filter(c => c.moderationStatus === 'PUBLISHED' || c.moderationStatus === 'UNPUBLISHED').map(c => {
          const merged = syncComicWithLocalOverride(c);
          const team = (teamsData || []).find(t => t.comicName && t.comicName.toLowerCase() === merged.title.toLowerCase())
          const cCover = getComicCover(merged);
          return {
            ...merged,
            cover: cCover,
            coverImage: cCover,
            coverImageUrl: cCover,
            projectTeam: team ? team.title : 'Unassigned',
            teamStatus: team ? team.status : 'None',
            chaptersCount: merged.chaptersCount || merged.chapterCount || merged.latestChapterNumber || 0
          }
        }),
        filteredSubmissions
      ).map(c => syncComicWithLocalOverride(c));

      console.log('[ModeratorDashboard] Data Hydration Summary:', {
        rawComicsData: comicsData,
        rawComicsCount: comicsData?.length || 0,
        submissionsCount: submissionsData?.length || 0,
        filteredSubmissionsCount: filteredSubmissions?.length || 0,
        mappedComicsCount: mappedComics?.length || 0,
        moderatorScope: getModeratorScope(authUser)
      });

      setComics(deduplicateComics(mappedComics));
      let localTeams = [];
      try {
        const localRaw = localStorage.getItem('comiverse_local_project_teams');
        if (localRaw) localTeams = JSON.parse(localRaw);
      } catch(e) {}

      const rawTeams = Array.isArray(teamsData) ? teamsData : (teamsData?.data || []);
      const mergedTeamsMap = new Map();
      [...localTeams, ...rawTeams].forEach(t => {
        if (!t) return;
        const key = t.id || `${t.comicName}-${t.targetLang}`;
        if (!mergedTeamsMap.has(key)) {
          mergedTeamsMap.set(key, t);
        }
      });
      setProjectTeams(Array.from(mergedTeamsMap.values()));
      setGenres(genresData?.data || (Array.isArray(genresData) ? genresData : []));

      // Release screen loading indicator immediately after Stage 1 (~50ms)
      setLoading(false);

      // Phase 2: Secondary Background Data (Forum threads & Chat flags) with timeout
      const [forumData, chatData] = await Promise.all([
        withTimeout(getAllForumThreadsApi(), []),
        withTimeout(getAllChatFlagsApi(), [])
      ]);

      setForumThreads(forumData || []);
      setChatFlags(chatData || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve control panel data from server.');
    } finally {
      setLoading(false);
    }
  }

  const getNavBadges = () => {
    let localFlags = []
    try {
      const raw = localStorage.getItem('comiverse_moderator_flags')
      localFlags = raw ? JSON.parse(raw) : []
    } catch (e) {}

    const flagMap = new Map()
    ;(chatFlags || []).forEach(f => flagMap.set(f.id, f))
    localFlags.forEach(f => flagMap.set(f.id, { ...(flagMap.get(f.id) || {}), ...f }))
    const allFlags = Array.from(flagMap.values())

    const pendingChatFlags = allFlags.filter(item => !item.status || item.status === 'pending').length

    return {
      'review-queue': (() => {
        const authUser = getAuth()?.user;
        const scopedSubmissions = submissions.filter(item => {
          const lang = item.language || item.rawLanguage || item.originalLanguage || item.lang || 'Original Raw';
          return isLanguageInModeratorScope(lang, authUser);
        });
        const itemsInTab = scopedSubmissions.filter(item => item.status === 'pending' || !item.status);
        const uniqueKeys = new Set();
        itemsInTab.forEach(item => {
          const titleClean = (item.title || '').toLowerCase().trim();
          const submitterClean = (item.submittedBy || '').toLowerCase().trim();
          const key = item.comicId ? `comic-${item.comicId}` : `group-${titleClean}_${submitterClean}`;
          uniqueKeys.add(key);
        });
        return uniqueKeys.size;
      })(),
      'chat-monitor': pendingChatFlags,
      'forum': forumThreads.filter(item => item.isReported).length,
    }
  }

  // API Call Integration Handlers
  const handleApprove = async (id, subItem) => {
    try {
      let cleanId = String(id || '').replace(/^(comic|group|chap)-/, '');
      if (subItem && subItem.submissionId) {
        cleanId = String(subItem.submissionId).replace(/^(comic|group|chap)-/, '');
      } else if (subItem && subItem.id && !String(subItem.id).startsWith('comic-') && !String(subItem.id).startsWith('group-')) {
        cleanId = String(subItem.id);
      }

      const appSub = subItem || submissions.find(item => (item.id || item) === id || item.submissionId === id || item.id === cleanId);
      
      let realDbId = null;
      if (cleanId && !cleanId.startsWith('comic-') && !cleanId.startsWith('group-')) {
        try {
          const res = await approveSubmissionApi(cleanId);
          realDbId = res?.data?.data?.comicId || res?.data?.comicId || res?.data?.data?.id || res?.data?.id || res?.id || null;
        } catch (apiErr) {
          console.warn(`[Backend Approve API Notice] ${apiErr?.message || apiErr}`);
        }
      }

      // Also directly approve all chapter records associated with this submission group
      // The submission approve API only updates submission.status but NOT chapter.moderation_status
      const allSubItems = appSub?.subItems || [appSub];
      for (const si of allSubItems) {
        const chapDbId = si?.chapterId || si?.chapter_id;
        if (chapDbId && !String(chapDbId).startsWith('chap-')) {
          try {
            await approveChapterDirectApi(chapDbId);
          } catch (chapErr) {
            console.warn(`[Backend DB Sync] approveChapterDirectApi(${chapDbId}) notice:`, chapErr?.message || chapErr);
          }
        }
      }

      toast.success('Submission approved and published to Comic Management!')
      const nowIso = new Date().toISOString();

      setSubmissions(prev => {
        const targetTitle = (appSub?.title || appSub?.comicName || '').toLowerCase().trim();
        const targetSubmitter = (appSub?.submittedBy || '').toLowerCase().trim();

        const next = prev.map(item => {
          const itemTitle = (item.title || item.comicTitle || '').toLowerCase().trim();
          const itemSubmitter = (item.submittedBy || '').toLowerCase().trim();

          const isMatchById = (item.id === id || item.submissionId === id || item.id === cleanId || item.submissionId === cleanId);
          const isMatchByTitle = (targetTitle && itemTitle === targetTitle && (!targetSubmitter || !itemSubmitter || itemSubmitter === targetSubmitter));

          if (isMatchById || isMatchByTitle) {
            return { 
              ...item, 
              status: 'approved', 
              approvedAt: nowIso,
              comicId: realDbId || item.comicId || `comic-${Date.now()}` // Ensure we store real DB ID for synchronization
            };
          }
          return item;
        });

        try { localStorage.setItem('comiverse_moderator_submissions_override', JSON.stringify(next)); } catch (e) {}
        return next;
      });

      await fetchComicsAndTeams()
      if (appSub) {
        publishComicToManagement(appSub);
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to approve submission.')
    }
  }

  const handleApproveAndCreateProject = async (item) => {
    try {
      let realDbId = null;
      try {
        const res = await approveSubmissionApi(item.id)
        realDbId = res?.data?.data?.comicId || res?.data?.comicId || res?.data?.data?.id || res?.data?.id || res?.id || null;
      } catch (apiErr) {
        console.warn(`[Backend Approve API Notice] ${apiErr?.message || apiErr}`);
      }

      // Also directly approve all chapter records
      const allSubItems = item?.subItems || [item];
      for (const si of allSubItems) {
        const chapDbId = si?.chapterId || si?.chapter_id;
        if (chapDbId && !String(chapDbId).startsWith('chap-')) {
          try {
            await approveChapterDirectApi(chapDbId);
          } catch (chapErr) {
            console.warn(`[Backend DB Sync] approveChapterDirectApi(${chapDbId}) notice:`, chapErr?.message || chapErr);
          }
        }
      }

      toast.success(`Approved "${item.title}" & published to Comic Management! Opening Translation Project setup...`)
      const nowIso = new Date().toISOString();
      setSubmissions(prev => {
        const next = prev.map(s => s.id === item.id ? { ...s, status: 'approved', approvedAt: nowIso, comicId: realDbId || s.comicId || `comic-${Date.now()}` } : s);
        try { localStorage.setItem('comiverse_moderator_submissions_override', JSON.stringify(next)); } catch (e) {}
        return next;
      });
      await fetchComicsAndTeams()
      publishComicToManagement(item)

      const subChapsCount = Array.isArray(item.allChapters) ? item.allChapters.length : (Array.isArray(item.chapters) ? item.chapters.length : (item.chapterNumber || item.number || item.chapterCount || 1));
      setCreateTeamForm({
        title: `${item.title} - Translation Team`,
        comicName: item.title,
        sourceLang: item.language || 'Japanese',
        targetLang: 'English',
        leaderName: '',
        leaderId: '',
        cover: getComicCover(item),
        comicId: item.comicId || item.id || '',
        chapterCount: subChapsCount,
        chaptersCount: subChapsCount
      })
      setCreateTeamStep(1)
      setShowCreateTeamModal(true)
      setActiveNav('project-teams')
    } catch (err) {
      console.error(err)
      toast.error('Failed to approve submission.')
    }
  }

  const handleConfirmReject = async (id, reason, subItem = null) => {
    try {
      let cleanId = String(id || '').replace(/^(comic|group|chap)-/, '');
      if (subItem && subItem.submissionId) {
        cleanId = String(subItem.submissionId).replace(/^(comic|group|chap)-/, '');
      } else if (subItem && subItem.id && !String(subItem.id).startsWith('comic-') && !String(subItem.id).startsWith('group-')) {
        cleanId = String(subItem.id);
      }

      if (cleanId.includes('mock')) {
        const targetSub = subItem || submissions.find(item => item.id === id || item.id === cleanId);
        if (targetSub && targetSub.comicId) {
          const realSub = submissions.find(s => s.comicId === targetSub.comicId && (s.type === 'NEW_COMIC' || s.submissionType === 'NEW_COMIC') && !String(s.id).includes('mock'));
          if (realSub && realSub.id) {
            cleanId = String(realSub.id).replace(/^(comic|group|chap)-/, '');
          }
        }
      }

      if (cleanId && !cleanId.startsWith('comic-') && !cleanId.startsWith('group-') && !cleanId.includes('mock')) {
        try {
          await rejectSubmissionApi(cleanId, reason || 'Submission rejected');
        } catch (apiErr) {
          console.warn(`[Backend Reject API Notice] ${apiErr?.message || apiErr}`);
        }
      } else if (cleanId.includes('mock')) {
        console.warn(`[Backend DB Sync] Could not find real submission ID for mock submission. Comic rejection may not persist.`);
      }

      toast.success('Submission rejected.')
      const nowIso = new Date().toISOString();

      setSubmissions(prev => {
        const targetSub = subItem || prev.find(item => item.id === id || item.submissionId === id || item.id === cleanId || item.submissionId === cleanId);
        const targetTitle = (targetSub?.title || targetSub?.comicName || '').toLowerCase().trim();
        const targetSubmitter = (targetSub?.submittedBy || '').toLowerCase().trim();

        const next = prev.map(item => {
          const itemTitle = (item.title || item.comicTitle || '').toLowerCase().trim();
          const itemSubmitter = (item.submittedBy || '').toLowerCase().trim();

          const isMatchById = (item.id === id || item.submissionId === id || item.id === cleanId || item.submissionId === cleanId);
          const isMatchByTitle = (targetTitle && itemTitle === targetTitle && (!targetSubmitter || !itemSubmitter || itemSubmitter === targetSubmitter));

          if (isMatchById || isMatchByTitle) {
            return {
              ...item,
              status: 'rejected',
              rejectedAt: nowIso,
              rejectionReason: reason || 'Submission rejected'
            };
          }
          return item;
        });

        try { localStorage.setItem('comiverse_moderator_submissions_override', JSON.stringify(next)); } catch (e) {}
        return next;
      });
    } catch (err) {
      console.error(err)
      toast.error('Failed to reject submission.')
    }
  }

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

  const handleChapterApprove = async (submissionId, chapterObj) => {
    const chapTitle = chapterObj?.title || `Chapter ${chapterObj?.number || chapterObj?.chapterNumber || ''}`.trim() || 'Chapter';

    // Find the real submission record that owns this chapter
    const targetSubId = chapterObj?.submissionId || submissionId;
    const sub = submissions.find(item => {
      if (item.status === 'approved' || item.status === 'rejected') return false;
      const chaps = item.allChapters || item.chapters || [];
      if (chaps.some(c => isSameChapterItem(c, chapterObj))) return true;
      if (item.id === targetSubId || item.submissionId === targetSubId || item.id === submissionId) return true;
      return false;
    }) || submissions.find(item => item.id === targetSubId || item.submissionId === targetSubId || item.id === submissionId);

    // The chapter's actual DB ID (not the submission ID)
    const chapterDbId = chapterObj?.chapterId || chapterObj?.chapter_id || chapterObj?.id;

    try {
      // 1. Always approve the submission record (this updates submissions table → disappears from pending queue)
      let realSubmissionId = String(targetSubId || '');
      if (realSubmissionId.includes('mock')) {
        const realSub = submissions.find(s => s.chapterId && String(s.chapterId) === String(chapterObj?.id));
        if (realSub && realSub.id && !String(realSub.id).includes('mock')) {
          realSubmissionId = String(realSub.id);
        }
      }
      realSubmissionId = realSubmissionId.replace(/^(comic|group|chap)-/, '');

      if (realSubmissionId && !realSubmissionId.startsWith('group-') && !realSubmissionId.startsWith('chap-') && !realSubmissionId.includes('mock')) {
        try {
          const res = await approveSubmissionApi(realSubmissionId);
          const realDbComic = res?.data || res;
          if (realDbComic && (realDbComic.id || realDbComic.comicId) && sub) {
            sub.comicId = realDbComic.comicId || realDbComic.id;
          }
        } catch (subErr) {
          console.warn(`[handleChapterApprove] approveSubmissionApi(${realSubmissionId}) failed:`, subErr?.message);
        }
      }

      // 2. Also approve chapter directly to ensure chapters table is updated (moderationStatus → PUBLISHED)
      const cleanChapterDbId = String(chapterDbId || '');
      if (cleanChapterDbId && !cleanChapterDbId.startsWith('chap-') && !cleanChapterDbId.startsWith('group-')) {
        try {
          await approveChapterDirectApi(cleanChapterDbId);
        } catch (chapErr) {
          console.warn(`[handleChapterApprove] approveChapterDirectApi(${cleanChapterDbId}) failed:`, chapErr?.message);
        }
      }
    } catch (apiErr) {
      console.warn('[handleChapterApprove] Outer API error:', apiErr?.message);
    }

    try {
      toast.success(`Approved "${chapTitle}" & saved to Database & Comic Management!`);

      if (sub) {
        publishComicToManagement(sub, true, chapterObj);
      }

      const nowIso = new Date().toISOString();
      const comicTitleClean = (sub?.title || sub?.comicName || sub?.comicTitle || chapterObj?.comicTitle || chapterObj?.originalSubmissionItem?.title || chapterObj?.title || '').trim().toLowerCase();

      setSubmissions(prev => {
        const existingApprovedIndex = prev.findIndex(item => item.status === 'approved' && ((comicTitleClean && item.title && item.title.trim().toLowerCase() === comicTitleClean) || (sub?.comicId && item.comicId && item.comicId === sub.comicId)));
        
        let nextSubmissions = [];
        let sourceMatched = false;

        prev.forEach(item => {
          const isSourceItem = (sub && (item === sub || item.id === sub.id || item.submissionId === sub.id)) ||
            (!sourceMatched && item.status !== 'approved' && item.status !== 'rejected' && ((item.allChapters || item.chapters || []).some(c => isSameChapterItem(c, chapterObj))));

          if (isSourceItem) {
            sourceMatched = true;
            const currentChaps = Array.isArray(item.allChapters) && item.allChapters.length > 0 ? item.allChapters : (Array.isArray(item.chapters) && item.chapters.length > 0 ? item.chapters : []);
            const remainingChaps = currentChaps.filter(c => !isSameChapterItem(c, chapterObj));

            if (remainingChaps.length === 0) {
              if (existingApprovedIndex === -1) {
                nextSubmissions.push({
                  ...item,
                  status: 'approved',
                  approvedAt: nowIso,
                  allChapters: [{ ...chapterObj, status: 'approved', approvedAt: nowIso }],
                  chapters: [{ ...chapterObj, status: 'approved', approvedAt: nowIso }],
                  chapterNumber: 1,
                  number: 1
                });
              } else {
                nextSubmissions.push({
                  ...item,
                  status: 'approved',
                  approvedAt: nowIso
                });
              }
            } else {
              nextSubmissions.push({
                ...item,
                allChapters: remainingChaps,
                chapters: remainingChaps,
                chapterNumber: remainingChaps.length,
                number: remainingChaps.length
              });
            }
          } else if (existingApprovedIndex !== -1 && prev.indexOf(item) === existingApprovedIndex) {
            const appChaps = Array.isArray(item.allChapters) && item.allChapters.length > 0 ? item.allChapters : (Array.isArray(item.chapters) && item.chapters.length > 0 ? item.chapters : []);
            const exists = appChaps.some(c => isSameChapterItem(c, chapterObj));
            const newAppChaps = exists ? appChaps : [...appChaps, { ...chapterObj, status: 'approved', approvedAt: nowIso }];
            nextSubmissions.push({
              ...item,
              allChapters: newAppChaps,
              chapters: newAppChaps,
              chapterNumber: newAppChaps.length,
              number: newAppChaps.length,
              lastChapterUpdatedAt: nowIso
            });
          } else {
            nextSubmissions.push(item);
          }
        });

        if (existingApprovedIndex === -1 && sub && !nextSubmissions.some(item => item.status === 'approved' && ((comicTitleClean && item.title && item.title.trim().toLowerCase() === comicTitleClean) || (sub.comicId && item.comicId && item.comicId === sub.comicId)))) {
          nextSubmissions.push({
            ...sub,
            id: `${sub.id || sub.submissionId || 'sub'}-approved`,
            status: 'approved',
            approvedAt: nowIso,
            comicId: sub.comicId || `comic-${Date.now()}`,
            allChapters: [{ ...chapterObj, status: 'approved', approvedAt: nowIso }],
            chapters: [{ ...chapterObj, status: 'approved', approvedAt: nowIso }],
            chapterNumber: 1,
            number: 1
          });
        }

        try {
          localStorage.setItem('comiverse_moderator_submissions_override', JSON.stringify(nextSubmissions));
        } catch (e) {}

        return nextSubmissions;
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve chapter.');
    }
  };


  const handleChapterReject = async (submissionId, chapterObj, reason) => {
    let cleanId = String(chapterObj?.submissionId || submissionId || '').replace(/^(comic|group|chap)-/, '');
    if (cleanId.includes('mock') || String(submissionId).includes('mock')) {
      const realSub = submissions.find(s => s.chapterId && String(s.chapterId) === String(chapterObj?.id));
      if (realSub && realSub.id && !String(realSub.id).includes('mock')) {
        cleanId = String(realSub.id).replace(/^(comic|group|chap)-/, '');
      }
    }
    const chapTitle = chapterObj?.title || `Chapter ${chapterObj?.number || chapterObj?.chapterNumber || ''}`.trim() || 'Chapter';

    const targetSubId = chapterObj?.submissionId || chapterObj?.id || submissionId;
    const sub = submissions.find(item => {
      if (item.status === 'approved' || item.status === 'rejected') return false;
      const chaps = item.allChapters || item.chapters || [];
      if (chaps.some(c => isSameChapterItem(c, chapterObj))) return true;
      if (item.id === targetSubId || item.submissionId === targetSubId || item.id === submissionId) return true;
      return false;
    }) || submissions.find(item => item.id === targetSubId || item.submissionId === targetSubId || item.id === submissionId);

    if (cleanId && !cleanId.startsWith('group-') && !cleanId.startsWith('comic-') && !cleanId.includes('mock')) {
      try {
        const rejectResponse = await rejectSubmissionApi(cleanId, reason || 'Chapter rejected');
        const responseData = rejectResponse?.data || rejectResponse;
        if (responseData?.comicAutoRejected) {
          toast.success(`Rejected "${chapTitle}" — All chapters rejected, comic profile auto-rejected!`);
          
          // Mark ALL submissions for this comic as rejected
          const nowIso = new Date().toISOString();
          const comicId = sub?.comicId || chapterObj?.comicId;
          const comicTitleClean = (sub?.title || sub?.comicName || sub?.comicTitle || chapterObj?.comicTitle || '').trim().toLowerCase();
          
          setSubmissions(prev => {
            const nextSubmissions = prev.map(item => {
              const matchByComicId = comicId && String(item.comicId) === String(comicId);
              const matchByTitle = comicTitleClean && (item.title || '').trim().toLowerCase() === comicTitleClean;
              
              if (matchByComicId || matchByTitle) {
                return {
                  ...item,
                  status: 'rejected',
                  rejectedAt: nowIso,
                  rejectionReason: item.chapterId ? (reason || 'Chapter rejected') : 'All chapters were rejected. Comic profile auto-rejected.'
                };
              }
              return item;
            });

            try {
              localStorage.setItem('comiverse_moderator_submissions_override', JSON.stringify(nextSubmissions));
            } catch (e) {}

            return nextSubmissions;
          });
          return; // Early return — everything is handled
        }
      } catch (apiErr) {
        console.warn(`[Backend DB Sync] rejectSubmissionApi(${cleanId}) notice:`, apiErr?.message || apiErr);
      }
    } else if (cleanId.includes('mock')) {
      console.warn(`[Backend DB Sync] Could not find real submission ID for mock submission. Chapter rejection may not persist.`);
    }

    try {
      toast.success(`Rejected "${chapTitle}" & updated Database!`);

      const nowIso = new Date().toISOString();
      const comicTitleClean = (sub?.title || sub?.comicName || sub?.comicTitle || chapterObj?.comicTitle || chapterObj?.originalSubmissionItem?.title || chapterObj?.title || '').trim().toLowerCase();

      setSubmissions(prev => {
        let sourceMatched = false;
        const nextSubmissions = prev.map(item => {
          const isSourceItem = (sub && (item === sub || item.id === sub.id || item.submissionId === sub.id)) ||
            (!sourceMatched && item.status !== 'approved' && item.status !== 'rejected' && ((item.allChapters || item.chapters || []).some(c => isSameChapterItem(c, chapterObj))));

          if (isSourceItem) {
            sourceMatched = true;
            return {
              ...item,
              status: 'rejected',
              rejectedAt: nowIso,
              rejectionReason: reason || 'Chapter rejected'
            };
          }
          return item;
        });

        try {
          localStorage.setItem('comiverse_moderator_submissions_override', JSON.stringify(nextSubmissions));
        } catch (e) {}

        return nextSubmissions;
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject chapter.');
    }
  };

  const handleSaveEditComic = async (id, updatedFields) => {
    let cleanUpdated = { ...updatedFields };
    const isValidId = (val) => Boolean(val && String(val).trim() !== '' && String(val) !== 'null' && String(val) !== 'undefined');
    const targetItem = comics.find(c => c.id === id);
    const targetTitle = targetItem?.title || updatedFields?.title;
    const targetCover = targetItem?.cover || targetItem?.coverImage || targetItem?.coverImageUrl || updatedFields?.cover || '';

    let matchedDbComic = isValidId(id) ? { id } : null;
    if (!matchedDbComic) {
      if (targetCover) {
        matchedDbComic = comics.find(c => isValidId(c.id) && (c.cover === targetCover || c.coverImage === targetCover || c.coverImageUrl === targetCover));
      }
      if (!matchedDbComic && targetTitle) {
        matchedDbComic = comics.find(c => isValidId(c.id) && isTitleMatch(c.title, targetTitle));
      }
    }

    const realDbId = matchedDbComic?.id || id;

    try {
      const updated = await updateComicApi(realDbId, updatedFields);
      if (updated) {
        cleanUpdated = updated?.data || updated;
      }
    } catch (err) {
      console.warn('[Moderator] Update API error (using local override fallback):', err?.message);
    }

    try {
      const existing = JSON.parse(localStorage.getItem('comiverse_local_comic_' + id) || '{}');
      localStorage.setItem('comiverse_local_comic_' + id, JSON.stringify({ ...existing, ...cleanUpdated }));
      if (realDbId !== id) {
        localStorage.setItem('comiverse_local_comic_' + realDbId, JSON.stringify({ ...existing, ...cleanUpdated }));
      }
    } catch(e) {}

    setComics(prev => prev.map(c => (c.id === id || c.id === realDbId) ? { ...c, ...cleanUpdated, projectTeam: c.projectTeam } : c));
    toast.success('Comic updated successfully.');
  }

  const handleSuspendComic = async (id) => {
    try {
      await updateComicApi(id, { moderationStatus: 'UNPUBLISHED' })
    } catch (err) {
      console.warn('[Moderator] Suspend API error:', err?.message)
    }
    
    try {
      const existing = JSON.parse(localStorage.getItem('comiverse_local_comic_' + id) || '{}');
      localStorage.setItem('comiverse_local_comic_' + id, JSON.stringify({ ...existing, moderationStatus: 'UNPUBLISHED', archived: false }));
      
      const overrideRaw = localStorage.getItem('comiverse_moderator_submissions_override');
      if (overrideRaw) {
        let overrides = JSON.parse(overrideRaw);
        overrides = overrides.filter(sub => {
          const stableId = sub.comicId || (sub.id ? `comic-${sub.id}` : null);
          return stableId !== id && sub.comicId !== id && sub.id !== id;
        });
        localStorage.setItem('comiverse_moderator_submissions_override', JSON.stringify(overrides));
      }
      
      const baseRaw = localStorage.getItem('comiverse_moderator_submissions');
      if (baseRaw) {
        let baseSubs = JSON.parse(baseRaw);
        baseSubs = baseSubs.filter(sub => {
          const stableId = sub.comicId || (sub.id ? `comic-${sub.id}` : null);
          return stableId !== id && sub.comicId !== id && sub.id !== id;
        });
        localStorage.setItem('comiverse_moderator_submissions', JSON.stringify(baseSubs));
      }
    } catch (e) { /* ignore */ }

    setComics(prev => prev.map(c => c.id === id || c.id === id.replace('comic-', '') ? { ...c, moderationStatus: 'UNPUBLISHED' } : c));
    toast.success('Comic suspended successfully.');
  }

  const handleRestoreComic = async (id) => {
    try {
      await updateComicApi(id, { moderationStatus: 'PUBLISHED' })
    } catch (err) {
      console.warn('[Moderator] Restore API error:', err?.message)
    }
    
    setComics(prev => prev.map(c => c.id === id || c.id === id.replace('comic-', '') ? { ...c, moderationStatus: 'PUBLISHED' } : c));
    toast.success('Comic restored successfully.');
  }

  const handleTriggerAssignTeam = (comic) => {
    setActiveNav('project-teams')
    const chCount = comic.chapterCount || comic.chaptersCount || comic.chapters || (Array.isArray(comic.allChapters) ? comic.allChapters.length : 1);
    setCreateTeamForm({
      title: `${comic.title} Team`,
      comicName: comic.title,
      sourceLang: 'Japanese',
      targetLang: 'English',
      leaderName: '',
      leaderId: '',
      priority: 'High',
      cover: getComicCover(comic),
      comicId: comic.id || comic.comicId || '',
      chapterCount: chCount,
      chaptersCount: chCount
    })
    setCreateTeamStep(1)
    setShowCreateTeamModal(true)
  }

  const handleCreateProjectTeam = async () => {
    const exists = projectTeams.some(
      t => t.comicName && (createTeamForm.comicName || '') && t.comicName.toLowerCase() === (createTeamForm.comicName || '').toLowerCase() &&
           t.targetLang && (createTeamForm.targetLang || '') && t.targetLang.toLowerCase() === (createTeamForm.targetLang || '').toLowerCase()
    )
    if (exists) {
      toast.error(`A translation team for "${createTeamForm.comicName}" in "${createTeamForm.targetLang}" already exists!`)
      return
    }

    const leaderName = createTeamForm.leaderName.trim() || 'Translator Leader'
    const leaderInitials = leaderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    
    let resolvedCover = createTeamForm.cover || createTeamForm.coverImage || createTeamForm.coverUrl || '';
    if (!resolvedCover || resolvedCover === '🔮' || resolvedCover === '📚') {
      const targetName = (createTeamForm.comicName || '').toLowerCase().trim();
      const matchComic = comics.find(c => (c.title && c.title.toLowerCase().trim() === targetName) || (createTeamForm.comicId && (c.id === createTeamForm.comicId || c.comicId === createTeamForm.comicId)));
      if (matchComic) resolvedCover = getComicCover(matchComic);
      if (!resolvedCover || resolvedCover === '🔮' || resolvedCover === '📚') {
        const matchSub = submissions.find(s => (s.title && s.title.toLowerCase().trim() === targetName) || (s.comicName && s.comicName.toLowerCase().trim() === targetName));
        if (matchSub) resolvedCover = getComicCover(matchSub);
      }
      if (!resolvedCover || resolvedCover === '🔮' || resolvedCover === '📚') {
        try {
          const overrideRaw = localStorage.getItem('comiverse_moderator_submissions_override');
          if (overrideRaw) {
            const parsed = JSON.parse(overrideRaw);
            const matchO = parsed.find(s => (s.title && s.title.toLowerCase().trim() === targetName) || (s.comicName && s.comicName.toLowerCase().trim() === targetName));
            if (matchO) resolvedCover = getComicCover(matchO);
          }
        } catch(e) {}
      }
    }

    const targetName = (createTeamForm.comicName || '').toLowerCase().trim();
    const matchComic = comics.find(c => (c.title && c.title.toLowerCase().trim() === targetName) || (createTeamForm.comicId && (c.id === createTeamForm.comicId || c.comicId === createTeamForm.comicId)));
    const matchSub = submissions.find(s => (s.title && s.title.toLowerCase().trim() === targetName) || (s.comicName && s.comicName.toLowerCase().trim() === targetName));
    
    let calcChaps = createTeamForm.chaptersCount || createTeamForm.chapterCount || 0;
    if (!calcChaps && matchComic) {
      calcChaps = matchComic.chapterCount || matchComic.chaptersCount || matchComic.chapters || matchComic.latestChapterNumber || (Array.isArray(matchComic.allChapters) ? matchComic.allChapters.length : 0);
    }
    if (!calcChaps && matchSub) {
      calcChaps = (Array.isArray(matchSub.allChapters) ? matchSub.allChapters.length : (Array.isArray(matchSub.chapters) ? matchSub.chapters.length : (matchSub.chapterNumber || matchSub.number || matchSub.chapterCount || 0)));
    }
    const initialChapterCount = Math.max(1, parseInt(calcChaps, 10) || 1);

    const newTeam = {
      title: createTeamForm.title.trim() || `${createTeamForm.comicName} Team`,
      comicName: createTeamForm.comicName,
      status: 'Active',
      membersCount: 1,
      chaptersCount: initialChapterCount,
      progress: 0,
      leaderName: leaderName,
      leaderId: createTeamForm.leaderId || null,
      leaderInitials: leaderInitials,
      deadline: 'unspecified',
      sourceLang: createTeamForm.sourceLang,
      targetLang: createTeamForm.targetLang,
      priority: createTeamForm.priority,
      cover: resolvedCover || '',
      coverImage: resolvedCover || '',
      comicId: createTeamForm.comicId || null,
      description: `Official translation team for ${createTeamForm.comicName}.`,
      assignedToMe: true,
      maxMembers: 5,
      isRecruiting: true,
      notes: `Official translation team for ${createTeamForm.comicName}.`
    }

    try {
      const res = await createProjectTeamApi(newTeam);
      const createdObj = res?.data?.data || res?.data || res;

      const finalTeam = {
        ...newTeam,
        ...(createdObj && typeof createdObj === 'object' ? createdObj : {}),
        id: createdObj?.id || newTeam.id || `team-${Date.now()}`
      };

      setProjectTeams(prev => {
        const filtered = (prev || []).filter(t => t.id !== finalTeam.id);
        return [finalTeam, ...filtered];
      });

      try {
        const localRaw = localStorage.getItem('comiverse_local_project_teams');
        let localArr = localRaw ? JSON.parse(localRaw) : [];
        localArr = [finalTeam, ...localArr.filter(t => t.id !== finalTeam.id)];
        localStorage.setItem('comiverse_local_project_teams', JSON.stringify(localArr));
      } catch (e) {}

      setComics(prev => (prev || []).map(c => {
        if (c.title && finalTeam.comicName && c.title.toLowerCase().trim() === finalTeam.comicName.toLowerCase().trim()) {
          return { ...c, projectTeam: finalTeam.title };
        }
        return c;
      }));

      toast.success('Project team created successfully!')
      setShowCreateTeamModal(false)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.status === 409 ? `Conflict: A translation team for "${createTeamForm.comicName}" in "${createTeamForm.targetLang}" was just created by another moderator.` : 'Failed to create translation project team.')
      fetchComicsAndTeams() // Re-fetch on conflict
    }
  }

  const handleRemoveProjectTeam = async (id, teamTitle, comicName) => {
    if (window.confirm(`Are you sure you want to remove ${teamTitle}?`)) {
      try {
        await deleteProjectTeamApi(id)
        
        toast.success('Project team removed successfully.')
        setProjectTeams(prev => prev.filter(t => t.id !== id))
        setComics(prev => prev.map(c => c.projectTeam === teamTitle ? { ...c, projectTeam: '-' } : c))
      } catch (err) {
        console.error(err)
        toast.error('Failed to remove project team.')
      }
    }
  }

  return (
    <ModeratorLayout activeNav={activeNav} onNavChange={setActiveNav} navBadges={getNavBadges()}>
      {loading ? (
        <div className="moderator-empty-state">
          <p>Loading dashboard metrics...</p>
        </div>
      ) : (
        <>
          {/* VIEW: DASHBOARD */}
          {activeNav === 'dashboard' && (
            <div 
              className="fade-in animate-slide-up mod-overview-container"
              onClick={() => {
                if (pinnedPoint) {
                  setPinnedPoint(null);
                  setHoveredPoint(null);
                }
              }}
            >
              {/* Welcome Header */}
              <div className="mod-welcome-card">
                <div className="mod-welcome-text">
                  <h1>Welcome back, Moderator!</h1>
                  <p>
                    System is running smoothly. There are currently <strong>{submissions.filter(s => s.status === 'pending').length}</strong> reviews pending and <strong>{forumThreads.filter(t => t.isReported).length}</strong> open forum reports.
                  </p>
                </div>
              </div>

              {/* Core Metrics Grid */}
              <div className="mod-core-metrics-grid">
                {/* Pending Reviews */}
                <div className="mod-core-card" style={{ borderLeft: '4px solid var(--mod-purple)' }}>
                  <div className="mod-core-header">
                    <span className="mod-core-title">Pending Reviews</span>
                    <span className="mod-core-icon" style={{ background: 'rgba(168, 85, 247, 0.12)', color: 'var(--mod-purple)' }}>⏳</span>
                  </div>
                  <div className="mod-core-body">
                    <div className="mod-core-value-group">
                      <div className="mod-core-value">{submissions.filter(s => s.status === 'pending').length}</div>
                      <span className="mod-core-trend">Awaiting review queue</span>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="mod-core-sparkline" viewBox="0 0 100 35">
                      <path d="M0,25 Q15,5 30,20 T60,8 T90,20" fill="none" stroke="var(--mod-purple)" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>

                {/* Total Comics */}
                <div className="mod-core-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                  <div className="mod-core-header">
                    <span className="mod-core-title">Total Comics</span>
                    <span className="mod-core-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>📚</span>
                  </div>
                  <div className="mod-core-body">
                    <div className="mod-core-value-group">
                      <div className="mod-core-value">{comics.length}</div>
                      <span className="mod-core-trend">Titles in system</span>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="mod-core-sparkline" viewBox="0 0 100 35">
                      <path d="M0,18 Q15,28 30,10 T60,22 T90,5" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>

                {/* Active Teams */}
                <div className="mod-core-card" style={{ borderLeft: '4px solid var(--mod-green)' }}>
                  <div className="mod-core-header">
                    <span className="mod-core-title">Active Teams</span>
                    <span className="mod-core-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--mod-green)' }}>⚡</span>
                  </div>
                  <div className="mod-core-body">
                    <div className="mod-core-value-group">
                      <div className="mod-core-value">{projectTeams.filter(t => t.status?.toUpperCase() === 'ACTIVE').length}</div>
                      <span className="mod-core-trend">Groups translating</span>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="mod-core-sparkline" viewBox="0 0 100 35">
                      <path d="M0,25 Q15,10 30,22 T60,5 T90,12" fill="none" stroke="var(--mod-green)" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>

                {/* Flagged Messages */}
                <div className="mod-core-card" style={{ borderLeft: '4px solid var(--mod-red)' }}>
                  <div className="mod-core-header">
                    <span className="mod-core-title">Flagged Chats</span>
                    <span className="mod-core-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--mod-red)' }}>💬</span>
                  </div>
                  <div className="mod-core-body">
                    <div className="mod-core-value-group">
                      <div className="mod-core-value">{chatFlags.length}</div>
                      <span className="mod-core-trend">Reported messages</span>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="mod-core-sparkline" viewBox="0 0 100 35">
                      <path d="M0,10 Q15,22 30,5 T60,18 T90,25" fill="none" stroke="var(--mod-red)" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Secondary Metrics Row */}
              <div className="mod-sec-metrics-grid">
                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">🏢</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">{projectTeams.length}</span>
                    <span className="mod-sec-title">Project Teams</span>
                  </div>
                </div>

                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">📖</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">{comics.reduce((acc, c) => acc + (c.chapterCount || 0), 0)}</span>
                    <span className="mod-sec-title">Total Chapters</span>
                  </div>
                </div>

                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">📈</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">{comics.filter(c => c.publicationStatus?.toUpperCase() === 'ONGOING').length}</span>
                    <span className="mod-sec-title">Ongoing</span>
                  </div>
                </div>

                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">🏁</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">{comics.filter(c => c.publicationStatus?.toUpperCase() === 'COMPLETED').length}</span>
                    <span className="mod-sec-title">Completed</span>
                  </div>
                </div>

                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">🚩</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">{forumThreads.filter(t => t.isReported).length}</span>
                    <span className="mod-sec-title">Open Reports</span>
                  </div>
                </div>

                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">✨</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">
                      {(() => {
                        try {
                          const todayStr = new Date().toDateString();
                          return submissions.filter(s => s.status === 'approved' && s.timestamp && new Date(s.timestamp).toDateString() === todayStr).length;
                        } catch (e) {
                          return 0;
                        }
                      })()}
                    </span>
                    <span className="mod-sec-title">Approved Today</span>
                  </div>
                </div>
              </div>

              {/* Data Visualization Section */}
              <div className="mod-charts-grid">
                {/* Area Curve Line Chart (7 Day Submissions Trend) */}
                <div className="mod-chart-card">
                  <div className="mod-chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 className="mod-chart-title">Submission Activity</h3>
                      <span className="mod-chart-subtitle">
                        {chartTimeframe === 'week' ? 'Daily chapter uploads volume over the last 7 days' : 'Daily chapter uploads volume over the last 30 days'}
                      </span>
                    </div>
                    <div className="timeframe-toggles">
                      <button 
                        onClick={() => { setChartTimeframe('week'); setPinnedPoint(null); setHoveredPoint(null); }}
                        className={`timeframe-btn ${chartTimeframe === 'week' ? 'active' : ''}`}
                      >
                        Week
                      </button>
                      <button 
                        onClick={() => { setChartTimeframe('month'); setPinnedPoint(null); setHoveredPoint(null); }}
                        className={`timeframe-btn ${chartTimeframe === 'month' ? 'active' : ''}`}
                      >
                        Month
                      </button>
                    </div>
                  </div>
                  <div className="mod-chart-svg-container">
                    {(() => {
                      const trend = (() => {
                        const days = [];
                        const counts = [];
                        const details = [];
                        const numDays = chartTimeframe === 'week' ? 7 : 30;
                        for (let i = numDays - 1; i >= 0; i--) {
                          const d = new Date();
                          d.setDate(d.getDate() - i);
                          const dateStr = d.toDateString();
                          
                          // Get matching submissions
                          const items = submissions.filter(s => {
                            if (!s.timestamp) return false;
                            return new Date(s.timestamp).toDateString() === dateStr;
                          });
                          
                          const label = chartTimeframe === 'week' 
                            ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          days.push(label);
                          counts.push(items.length);
                          details.push(items);
                        }
                        return { days, counts, details };
                      })();
                      
                      const width = 580;
                      const height = 140;
                      const maxVal = Math.max(...trend.counts, 4);
                      const divisor = trend.counts.length > 1 ? trend.counts.length - 1 : 1;
                      const points = trend.counts.map((c, i) => {
                        const x = 50 + i * (width - 70) / divisor;
                        const y = 110 - (c / maxVal) * 90;
                        return { x, y, count: c, label: trend.days[i], items: trend.details[i] };
                      });
                      
                      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const areaPath = points.length ? `${linePath} L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z` : '';
                      
                      return (
                        <>
                          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
                            <defs>
                              <linearGradient id="chart-gradient-line" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="50%" stopColor="#ec4899" />
                                <stop offset="100%" stopColor="#3b82f6" />
                              </linearGradient>
                              <linearGradient id="chart-gradient-area" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            
                            {/* Grid Lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => (
                              <line 
                                key={idx} 
                                x1="40" 
                                y1={20 + val * 90} 
                                x2={width - 20} 
                                y2={20 + val * 90} 
                                className="mod-chart-gridline" 
                              />
                            ))}
                            
                            {/* Area & Line */}
                            {areaPath && <path d={areaPath} className="mod-chart-path-area" />}
                            {linePath && <path d={linePath} className="mod-chart-path-line" />}
                            
                             {/* Data points & labels */}
                             {points.map((p, idx) => {
                               const isActive = hoveredPoint?.label === p.label || pinnedPoint?.label === p.label;
                               return (
                                 <g key={idx}>
                                   {isActive && (
                                     <line 
                                       x1={p.x} 
                                       y1={p.y} 
                                       x2={p.x} 
                                       y2="110" 
                                       stroke="rgba(236, 72, 153, 0.45)" 
                                       strokeWidth="1.5" 
                                       strokeDasharray="3,3" 
                                       className="mod-chart-guideline-active"
                                     />
                                   )}
                                   {isActive && (
                                     <circle
                                       cx={p.x}
                                       cy={p.y}
                                       r="12"
                                       className="mod-chart-dot-pulse"
                                     />
                                   )}
                                   <circle 
                                     cx={p.x} 
                                     cy={p.y} 
                                     r={isActive ? "6" : "4"} 
                                     className={`mod-chart-dot ${isActive ? 'active' : ''}`} 
                                   />
                                   <circle 
                                     cx={p.x} 
                                     cy={p.y} 
                                     r="16" 
                                     fill="transparent" 
                                     style={{ cursor: 'pointer' }}
                                     onMouseEnter={() => {
                                       if (!pinnedPoint) {
                                         setHoveredPoint({
                                           xPct: (p.x / width) * 100,
                                           yPct: (p.y / height) * 100,
                                           label: p.label,
                                           count: p.count,
                                           items: p.items
                                         });
                                       }
                                     }}
                                     onMouseLeave={() => {
                                       if (!pinnedPoint) {
                                         setHoveredPoint(null);
                                       }
                                     }}
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       const pointData = {
                                         xPct: (p.x / width) * 100,
                                         yPct: (p.y / height) * 100,
                                         label: p.label,
                                         count: p.count,
                                         items: p.items
                                       };
                                       if (pinnedPoint?.label === p.label) {
                                         setPinnedPoint(null);
                                         setHoveredPoint(null);
                                       } else {
                                         setPinnedPoint(pointData);
                                         setHoveredPoint(pointData);
                                       }
                                     }}
                                   />
                                   {(p.count > 0 && (chartTimeframe === 'week' || isActive)) && (
                                     <text 
                                       x={p.x} 
                                       y={isActive ? p.y - 14 : p.y - 10} 
                                       textAnchor="middle" 
                                       className={`mod-chart-value-text ${isActive ? 'active' : ''}`} 
                                       fontSize={isActive ? "11" : "10"} 
                                       fontWeight="700"
                                     >
                                       {p.count}
                                     </text>
                                   )}
                                   {(chartTimeframe === 'week' || idx % 5 === 0 || idx === points.length - 1) && (
                                     <text 
                                       x={p.x} 
                                       y="130" 
                                       textAnchor="middle" 
                                       className={`mod-chart-axis-text ${isActive ? 'active' : ''}`}
                                     >
                                       {p.label.split(',')[0]}
                                     </text>
                                   )}
                                 </g>
                               );
                             })}
                          </svg>

                          {hoveredPoint && (
                            <div 
                              className="mod-chart-tooltip" 
                              style={{ 
                                position: 'absolute',
                                left: `${hoveredPoint.xPct}%`,
                                top: `${hoveredPoint.yPct}%`,
                                transform: 'translate(-50%, -100%)',
                                marginTop: '-12px',
                                zIndex: 10000
                              }}
                            >
                              <div className="tooltip-header">
                                <span className="tooltip-title">{hoveredPoint.label}</span>
                                <span className="tooltip-count">{hoveredPoint.count} items</span>
                                {pinnedPoint && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPinnedPoint(null);
                                      setHoveredPoint(null);
                                    }}
                                    className="tooltip-close-btn"
                                    title="Unpin"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--mod-text-muted)',
                                      cursor: 'pointer',
                                      fontSize: '16px',
                                      lineHeight: 1,
                                      padding: '0 4px',
                                      marginLeft: '8px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    &times;
                                  </button>
                                )}
                              </div>
                              <div className="tooltip-body">
                                {hoveredPoint.items && hoveredPoint.items.length > 0 ? (
                                  <ul className="tooltip-items-list">
                                    {hoveredPoint.items.slice(0, 3).map((item, idx) => (
                                      <li key={idx} className="tooltip-item-row">
                                        <span className="tooltip-bullet"></span>
                                        <div className="tooltip-item-details">
                                          <div className="tooltip-item-title">{item.title}</div>
                                          <div className="tooltip-item-meta">
                                            {item.queueType === 'author' ? 'New Story Upload' : `Chapter ${item.chapter}`}
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                    {hoveredPoint.items.length > 3 && (
                                      <li className="tooltip-item-more">
                                        and {hoveredPoint.items.length - 3} more...
                                      </li>
                                    )}
                                  </ul>
                                ) : (
                                  <div className="tooltip-empty">No submissions this day</div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Genre Breakdown Bar Chart */}
                <div className="mod-chart-card">
                  <div className="mod-chart-header">
                    <div>
                      <h3 className="mod-chart-title">Top Genres</h3>
                      <span className="mod-chart-subtitle">Comic distribution by registered category</span>
                    </div>
                  </div>
                  <div className="mod-genre-chart-list">
                    {(() => {
                      const counts = {};
                      comics.forEach(c => {
                        if (c.genres) {
                          c.genres.forEach(g => {
                            const name = typeof g === 'object' && g !== null ? g.name : g;
                            if (name) counts[name] = (counts[name] || 0) + 1;
                          });
                        }
                      });
                      const genreData = Object.entries(counts)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 4);
                      
                      const maxVal = Math.max(...genreData.map(g => g.count), 1);
                      const colors = ['#a855f7', '#ec4899', '#3b82f6', '#10b981'];
                      
                       return genreData.map((g, idx) => {
                         const pct = (g.count / maxVal) * 100;
                         const themeColor = colors[idx % colors.length];
                         return (
                           <div 
                             key={idx} 
                             className="mod-genre-chart-item"
                           >
                             <div className="mod-genre-chart-label-row">
                               <span className="mod-genre-name" style={{ '--genre-theme': themeColor }}>{g.name}</span>
                               <span className="mod-genre-count">{g.count} titles</span>
                             </div>
                             <div className="mod-genre-bar-bg">
                               <div 
                                 className="mod-genre-bar-fill" 
                                 style={{ 
                                   width: `${pct}%`, 
                                   background: themeColor,
                                   '--genre-theme': themeColor
                                 }}
                               ></div>
                             </div>
                           </div>
                         );
                       });
                    })()}
                    {comics.length === 0 && (
                      <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--mod-text-muted)', margin: 0 }}>No genre stats available.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 1: Recent Submissions & Forum Reports */}
              <div className="mod-overview-row">
                <div className="mod-overview-col">
                  <div className="mod-overview-card">
                    <div className="mod-overview-card-header">
                      <h3 className="mod-overview-card-title">Recent Submissions</h3>
                      <span className="mod-overview-link" onClick={() => setActiveNav('review-queue')}>View all</span>
                    </div>
                    <div className="mod-submission-list">
                      {submissions.filter(s => s.status === 'pending').slice(0, 4).map(s => {
                        const isAuthor = s.queueType === 'author';
                        return (
                          <div key={s.id} className="mod-submission-item">
                            <div className="mod-sub-thumb">
                              {s.title.toLowerCase().includes('sword') ? '⚔️' : s.title.toLowerCase().includes('spirit') ? '🔮' : s.title.toLowerCase().includes('demon') ? '👑' : '📚'}
                            </div>
                            <div className="mod-sub-details">
                              <div className="mod-sub-title" title={s.title}>{s.title}</div>
                              <div className="mod-sub-meta">
                                {isAuthor ? 'New Comic Upload' : `Chapter ${s.chapter}`} · {s.submittedBy || 'Author'}
                              </div>
                            </div>
                            <span className={`priority-badge ${(s.priority || 'Medium').toLowerCase()}`}>
                              {s.priority || 'Medium'}
                            </span>
                          </div>
                        );
                      })}
                      {submissions.filter(s => s.status === 'pending').length === 0 && (
                        <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--mod-text-muted)', margin: 0 }}>No pending submissions.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mod-overview-col">
                  <div className="mod-overview-card">
                    <div className="mod-overview-card-header">
                      <h3 className="mod-overview-card-title">Forum Reports</h3>
                      <span className="mod-overview-link" onClick={() => setActiveNav('forum')}>View all</span>
                    </div>
                    <div className="mod-report-list">
                      {forumThreads.filter(t => t.isReported).slice(0, 3).map(t => {
                        const reason = t.reportReason || 'Violation of community guidelines';
                        const level = reason.toLowerCase().includes('hate') || reason.toLowerCase().includes('harassment') ? 'high' : reason.toLowerCase().includes('spoiler') ? 'low' : 'medium';
                        return (
                          <div key={t.id} className={`mod-report-item ${level}`}>
                            <h4 className="mod-report-title">{t.title}</h4>
                            <span className="mod-report-reason">{reason}</span>
                            <span className="mod-report-time">{formatTimeAgo(t.createdAt || t.timestamp)}</span>
                          </div>
                        );
                      })}
                      {forumThreads.filter(t => t.isReported).length === 0 && (
                        <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--mod-text-muted)', margin: 0 }}>No reported forum threads.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Project Teams & Top Performing Comics */}
              <div className="mod-overview-row">
                <div className="mod-overview-col">
                  <div className="mod-overview-card">
                    <div className="mod-overview-card-header">
                      <h3 className="mod-overview-card-title">Project Teams</h3>
                      <span className="mod-overview-link" onClick={() => setActiveNav('project-teams')}>Manage teams</span>
                    </div>
                    <div className="mod-team-cards-row">
                      {projectTeams.slice().sort((a, b) => {
                        const scoreA = (a.tasksToday || 0) * 100 + (a.tasksWeek || 0) * 10 + (a.tasksMonth || 0);
                        const scoreB = (b.tasksToday || 0) * 100 + (b.tasksWeek || 0) * 10 + (b.tasksMonth || 0);
                        return scoreB - scoreA;
                      }).slice(0, 3).map(t => (
                        <div key={t.id} className="mod-team-dashboard-card">
                          <div className="mod-team-card-header">
                            <h4 className="mod-team-card-title" title={t.title}>{t.title}</h4>
                            <span className={`team-status-badge ${(t.status || 'Active').toLowerCase()}`}>{t.status || 'Active'}</span>
                          </div>
                          
                          <div className="team-stats-wrapper" style={{ marginTop: '12px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--mod-text-muted)' }}>
                              <span>Completed Tasks</span>
                              <span style={{ fontSize: '10px' }}>(Day / Wk / Mo)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px' }}>
                              <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '15px', fontWeight: '700', color: '#c084fc' }}>{t.tasksToday || 0}</div>
                              </div>
                              <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '15px', fontWeight: '700', color: '#a855f7' }}>{t.tasksWeek || 0}</div>
                              </div>
                              <div style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: '700', color: '#8b5cf6' }}>{t.tasksMonth || 0}</div>
                              </div>
                            </div>
                          </div>

                          <div className="team-card-footer">
                            <span className="team-members-count">{t.membersCount || 1} members</span>
                            <div className="team-leader-info">
                              <span className="team-leader-avatar">
                                {t.leaderInitials || (t.leaderName ? t.leaderName[0] : 'U')}
                              </span>
                              <span>{t.leaderName || 'No leader'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {projectTeams.length === 0 && (
                        <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--mod-text-muted)', margin: 0 }}>No project teams available.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mod-overview-col">
                  <div className="mod-overview-card">
                    <div className="mod-overview-card-header">
                      <h3 className="mod-overview-card-title">Top Performing Comics</h3>
                      <span className="mod-overview-link" onClick={() => setActiveNav('comic-management')}>View all</span>
                    </div>
                    <div className="mod-rank-list">
                      {(topComics.length > 0 ? topComics : comics).slice().sort((a, b) => {
                        const getV = x => {
                          let v = x.viewCount || x.views || x.totalViews || 0;
                          if (typeof v === 'string') {
                            let num = parseFloat(v.replace(/[^0-9.]/g, '')) || 0;
                            if (v.toUpperCase().includes('M')) num *= 1000000;
                            if (v.toUpperCase().includes('K')) num *= 1000;
                            return num;
                          }
                          return v;
                        };
                        return getV(b) - getV(a);
                      }).slice(0, 4).map((c, idx) => {
                        const getV = x => {
                          let v = x.viewCount || x.views || x.totalViews || 0;
                          if (typeof v === 'string') {
                            let num = parseFloat(v.replace(/[^0-9.]/g, '')) || 0;
                            if (v.toUpperCase().includes('M')) num *= 1000000;
                            if (v.toUpperCase().includes('K')) num *= 1000;
                            return num;
                          }
                          return v;
                        };
                        const numViews = getV(c);
                        const viewFormatted = numViews >= 1000000 ? `${(numViews / 1000000).toFixed(1)}M` : numViews >= 1000 ? `${(numViews / 1000).toFixed(1)}K` : numViews;
                        
                        const rating = parseFloat(c.ratingAverage || c.rating || c.score || 0);
                        const chaps = c.chapterCount || c.chapters || c.chaptersCount || 0;

                        return (
                          <div key={c.id} className="mod-rank-item">
                            <div className="mod-rank-left">
                              <span className="mod-rank-number">#{idx + 1}</span>
                              <div className="mod-rank-details">
                                <div className="mod-rank-title" style={{ maxWidth: '240px' }} title={c.title}>{c.title}</div>
                                <div className="mod-rank-meta">
                                  {chaps} chapters · {viewFormatted} views
                                </div>
                              </div>
                            </div>
                            <span className="mod-rank-rating">★ {rating > 0 ? rating.toFixed(1) : '0.0'}</span>
                          </div>
                        );
                      })}
                      {comics.length === 0 && (
                        <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--mod-text-muted)', margin: 0 }}>No comics available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>



            </div>
          )}

          {/* VIEW: REVIEW QUEUE */}
          {activeNav === 'review-queue' && (
            <ReviewQueue 
              submissions={submissions} 
              comics={comics}
              handleApprove={handleApprove} 
              handleConfirmReject={handleConfirmReject} 
              handleApproveAndCreateProject={handleApproveAndCreateProject}
              handleChapterApprove={handleChapterApprove}
              handleChapterReject={handleChapterReject}
            />
          )}

          {/* VIEW: COMIC MANAGEMENT */}
          {activeNav === 'comic-management' && (
            <ComicManagement 
              comics={comics} 
              projectTeams={projectTeams}
              genres={genres}
              handleSaveEditComic={handleSaveEditComic} 
              handleSuspendComic={handleSuspendComic} 
              handleRestoreComic={handleRestoreComic}
              handleTriggerAssignTeam={handleTriggerAssignTeam} 
              fetchAllData={fetchComicsAndTeams}
            />
          )}

          {/* VIEW: GENRE MANAGEMENT */}
          {activeNav === 'genre-management' && (
            <GenreManagement comics={comics} />
          )}

          {/* VIEW: PROJECT TEAMS */}
          {activeNav === 'project-teams' && (
            <ProjectTeams 
              projectTeams={projectTeams}
              setProjectTeams={setProjectTeams}
              genres={genres}
              submissions={submissions}
              comics={comics
                .filter(c => !submissions.some(s => s.queueType === 'author' && s.status === 'pending' && s.title === c.title))
                .filter((value, index, self) => self.findIndex(t => t.title === value.title) === index)
                .filter(c => {
                  const currentUser = getAuth()?.user;
                  const modLangs = Array.isArray(currentUser?.assignedLanguages) && currentUser.assignedLanguages.length > 0
                    ? currentUser.assignedLanguages
                    : ['Japanese', 'Korean'];
                  return modLangs.includes('All') || modLangs.length >= 7 || modLangs.some(l => l.toLowerCase() === (c.language || 'Japanese').toLowerCase());
                })
              }
              showCreateTeamModal={showCreateTeamModal}
              setShowCreateTeamModal={setShowCreateTeamModal}
              createTeamStep={createTeamStep}
              setCreateTeamStep={setCreateTeamStep}
              createTeamForm={createTeamForm}
              setCreateTeamForm={setCreateTeamForm}
              handleCreateProjectTeam={handleCreateProjectTeam}
            />
          )}

          {/* VIEW: CHAT MONITOR */}
          {activeNav === 'chat-monitor' && (
            <ChatMonitor fetchAllData={fetchChatFlagsData} />
          )}

          {/* VIEW: FORUM */}
          {activeNav === 'forum' && (
            <ForumModeration fetchAllData={fetchForumThreadsData} />
          )}

          {/* VIEW: VIOLATION REPORTS */}
          {activeNav === 'reports' && (
            <ModeratorReports />
          )}

          {/* VIEW: REPORT CATEGORIES */}
          {activeNav === 'report-categories' && (
            <ReportCategories roleScope="MODERATOR" />
          )}
        </>
      )}
    </ModeratorLayout>
  )
}

export default ModeratorDashboard
