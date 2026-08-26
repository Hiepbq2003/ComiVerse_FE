import { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import '../../assets/style/moderator/comic-management.css'
import ModernButton from '../../components/common/ModernButton'
import CustomDatePicker from '../../components/common/CustomDatePicker'
import ModernPagination from '../../components/common/ModernPagination'
import { SkeletonLoader } from '../../components/common/SkeletonLoader'
import { createTranslationRequestApi } from '../../services/api/TranslationPoolApi'
import { toast } from 'react-toastify'
import { exportToCsv } from '../../utils/exportToCsv'
import { updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { getChaptersByComicIdApi, deleteChapterApi } from '../../services/api/ChapterApi'
import { getComicByIdApi } from '../../services/api/ComicApi'
import { getAuthorComicChaptersApi } from '../../services/api/AuthorComicApi'
import { getAuth } from '../../utils/Auth'
import { isLanguageInModeratorScope } from '../../utils/moderatorScope'
import { COMIC_LANGUAGE_OPTIONS } from '../../constants/comicLanguages'
import React from 'react'

const CustomDropdown = ({ value, onChange, options, minWidth = '160px' }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || { value, label: value };

  return (
    <div className="mod-custom-dropdown" ref={dropdownRef} style={{ minWidth, flex: 1 }}>
      <button 
        className={`mod-dropdown-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', justifyContent: 'space-between', padding: '0 12px' }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedOption.label}</span>
        <span style={{ marginLeft: '8px', opacity: 0.5, fontSize: '10px', flexShrink: 0 }}>▼</span>
      </button>
      
      {isOpen && (
        <div className="mod-dropdown-menu">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`mod-dropdown-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function ComicManagement({ loading = false, comics, projectTeams, genres, handleSaveEditComic, handleSuspendComic, handleRestoreComic, handleTriggerAssignTeam, fetchAllData }) {
  const navigate = useNavigate()

  // Search & Filters local states
  const [comicSearch, setComicSearch] = useState('')
  const deferredSearch = useDeferredValue(comicSearch)
  const [comicStatusFilter, setComicStatusFilter] = useState('All Status')
  const [comicGenreFilter, setComicGenreFilter] = useState('All Genres')
  const [comicAuthorFilter, setComicAuthorFilter] = useState('All Authors')
  const [comicTeamFilter, setComicTeamFilter] = useState('All Project Teams')
  const [comicLanguageFilter, setComicLanguageFilter] = useState('All Languages')
  const [viewsSort, setViewsSort] = useState('All Views')
  const [comicTimeFilter, setComicTimeFilter] = useState('All Time')
  const [chapterUpdateSort, setChapterUpdateSort] = useState('Sort by Update Time')

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, comicStatusFilter, comicGenreFilter, comicAuthorFilter, comicTeamFilter, comicLanguageFilter, viewsSort, comicTimeFilter, chapterUpdateSort]);

  const filteredAndSortedComics = useMemo(() => {
    const authUser = getAuth()?.user;
    return (comics || [])
      .filter(c => {
        const searchLower = (deferredSearch || '').toLowerCase().trim();
        const matchesSearch = !searchLower || c.title.toLowerCase().includes(searchLower) ||
          (c.authorName || '').toLowerCase().includes(searchLower) ||
          (c.author || '').toLowerCase().includes(searchLower) ||
          (c.projectTeam || '').toLowerCase().includes(searchLower);
        
        // Exclude comics that are not yet published (i.e. still in Review Queue)
        if (c.moderationStatus === 'REJECTED' || c.moderationStatus === 'SUBMITTED_FOR_REVIEW') {
           return false;
        }

        let effectiveStatus = (c.publicationStatus || 'ONGOING').toUpperCase();
        if (c.moderationStatus === 'UNPUBLISHED') {
          effectiveStatus = 'SUSPENDED';
        }

        const matchesStatus = comicStatusFilter === 'All Status' || 
          effectiveStatus === comicStatusFilter.toUpperCase();
        const matchesGenre = comicGenreFilter === 'All Genres' || (c.genres || []).some(g => (typeof g === 'object' && g !== null ? g.name : g) === comicGenreFilter);
        const matchesAuthor = comicAuthorFilter === 'All Authors' || c.authorName === comicAuthorFilter || c.author === comicAuthorFilter;
        const matchesTeam = comicTeamFilter === 'All Project Teams' || c.projectTeam === comicTeamFilter;
        
        const cLang = c.language || c.originalLanguage || c.rawLanguage || 'Japanese';
        const matchesLang = comicLanguageFilter === 'All Languages' || cLang.toLowerCase() === comicLanguageFilter.toLowerCase();

        let matchesTime = true;
        if (comicTimeFilter !== 'All Time') {
          const targetTime = c.lastChapterUpdatedAt || c.createdAt || c.timestamp;
          if (targetTime) {
            const updateDate = new Date(targetTime);
            const now = new Date();
            if (comicTimeFilter === 'Updated Today') {
              const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              matchesTime = updateDate >= startOfToday;
            } else if (comicTimeFilter === 'Updated Last 7 Days') {
              const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              matchesTime = updateDate >= sevenDaysAgo;
            } else if (comicTimeFilter === 'Updated Last 30 Days') {
              const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              matchesTime = updateDate >= thirtyDaysAgo;
            }
          } else {
            matchesTime = false;
          }
        }

        return matchesSearch && matchesStatus && matchesGenre && matchesAuthor && matchesTeam && matchesLang && matchesTime;
      })
      .sort((a, b) => {
        if (chapterUpdateSort === 'Newest Chapters First') {
          const tA = new Date(a.lastChapterUpdatedAt || a.createdAt || a.timestamp || 0).getTime();
          const tB = new Date(b.lastChapterUpdatedAt || b.createdAt || b.timestamp || 0).getTime();
          return tB - tA;
        } else if (chapterUpdateSort === 'Oldest Chapters First') {
          const tA = new Date(a.lastChapterUpdatedAt || a.createdAt || a.timestamp || 0).getTime();
          const tB = new Date(b.lastChapterUpdatedAt || b.createdAt || b.timestamp || 0).getTime();
          return tA - tB;
        }

        const aViews = a.viewCount !== undefined ? a.viewCount : (a.views || 0);
        const bViews = b.viewCount !== undefined ? b.viewCount : (b.views || 0);
        if (viewsSort === 'Most Viewed') {
          return bViews - aViews;
        } else if (viewsSort === 'Least Viewed') {
          return aViews - bViews;
        }
        return 0;
      });
  }, [comics, deferredSearch, comicStatusFilter, comicGenreFilter, comicAuthorFilter, comicTeamFilter, comicTimeFilter, chapterUpdateSort, viewsSort]);

  const totalPages = Math.ceil(filteredAndSortedComics.length / ITEMS_PER_PAGE);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));

  const paginatedComics = useMemo(() => {
    return filteredAndSortedComics.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);
  }, [filteredAndSortedComics, activePage]);

  // Archive/Suspend confirmation modal states
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [comicToArchive, setComicToArchive] = useState(null)
  const [isRestoreMode, setIsRestoreMode] = useState(false)

  // Edit modal local states
  const [editingComic, setEditingComic] = useState(null)
  const [editComicForm, setEditComicForm] = useState({
    title: '',
    author: '',
    publicationStatus: 'ONGOING',
    language: '',
    genres: '',
    reason: ''
  })

  // Translation Request modal states
  const AVAILABLE_LANGUAGES = COMIC_LANGUAGE_OPTIONS
  const [showTransReqModal, setShowTransReqModal] = useState(false)
  const [transReqComic, setTransReqComic] = useState(null)
  const [transReqForm, setTransReqForm] = useState({
    targetLanguages: [],
    priority: 'Medium',
    deadline: '',
    notes: ''
  })
  const [isSubmittingTrans, setIsSubmittingTrans] = useState(false)

  // Direct Assignment modal states
  const [showDirectAssignModal, setShowDirectAssignModal] = useState(false)
  const [directAssignComic, setDirectAssignComic] = useState(null)
  const [directAssignForm, setDirectAssignForm] = useState({
    targetLang: '',
    deadline: ''
  })
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState('')

  // Chapter Management modal states
  const [showChaptersModal, setShowChaptersModal] = useState(false)
  const [chaptersComic, setChaptersComic] = useState(null)
  const [chaptersList, setChaptersList] = useState([])
  const [chaptersLoading, setChaptersLoading] = useState(false)

  const openChaptersModal = (comic) => {
    navigate(`/moderator/comic/${comic.id}`, { state: { comic } })
  }

  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm('Are you sure you want to delete this chapter? This action cannot be undone.')) {
      return
    }
    try {
      await deleteChapterApi(chapterId)
      toast.success('Chapter deleted successfully!')
      // Refresh the chapters list
      if (chaptersComic) {
        const response = await getChaptersByComicIdApi(chaptersComic.id)
        const data = response?.data?.data || response?.data || response || []
        setChaptersList(Array.isArray(data) ? data : [])
      }
      // Refresh the main comics table to update the chapter count!
      if (fetchAllData) {
        fetchAllData()
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete chapter.'
      toast.error(message)
    }
  }

  const openTranslationRequestModal = (comic) => {
    setTransReqComic(comic)
    setTransReqForm({
      targetLanguages: [],
      priority: 'Medium',
      deadline: '',
      notes: ''
    })
    setShowTransReqModal(true)
  }

  const toggleTargetLang = (lang) => {
    setTransReqForm(prev => ({
      ...prev,
      targetLanguages: prev.targetLanguages.includes(lang)
        ? prev.targetLanguages.filter(l => l !== lang)
        : [...prev.targetLanguages, lang]
    }))
  }

  const handleSubmitTranslationRequest = async () => {
    if (!transReqComic?.language || transReqComic.language === 'Unknown') {
      toast.warn('Configure the comic original language before requesting translation.')
      return
    }
    if (transReqForm.targetLanguages.length === 0) {
      toast.warn('Please select at least one target language.')
      return
    }
    if (isSubmittingTrans) return;
    try {
      setIsSubmittingTrans(true);
      await createTranslationRequestApi({
        comicId: transReqComic.id,
        targetLanguages: transReqForm.targetLanguages,
        priority: transReqForm.priority,
        deadline: transReqForm.deadline || null,
        notes: transReqForm.notes.trim() || null
      })
      toast.success(`Translation request submitted for ${transReqForm.targetLanguages.length} language(s)!`)
      setShowTransReqModal(false)
      if (fetchAllData) {
        await fetchAllData()
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit translation request.')
    } finally {
      setIsSubmittingTrans(false);
    }
  }

  const openDirectAssignModal = (comic) => {
    const existing = projectTeams
      ? projectTeams.filter(t => t.comicName && t.comicName.toLowerCase() === comic.title.toLowerCase())
      : [];
    const availableLangs = AVAILABLE_LANGUAGES.filter(lang => 
      !existing.some(t => t.targetLang && t.targetLang.toLowerCase() === lang.toLowerCase())
    );

    setDirectAssignComic(comic)
    setDirectAssignForm({
      targetLang: availableLangs[0] || '',
      deadline: ''
    })
    setSelectedTeamId('')
    setShowDirectAssignModal(true)
  }

  const handleSubmitDirectAssignment = async () => {
    if (!directAssignComic?.language || directAssignComic.language === 'Unknown') {
      toast.warn('Configure the comic original language before assigning a translation team.')
      return
    }
    if (!directAssignForm.targetLang) {
      toast.warn('Please select a target language.')
      return
    }

    if (!selectedTeamId) {
      toast.warn('Please select a project team.')
      return
    }

    const selectedTeamObj = projectTeams.find(t => t.id === selectedTeamId)
    if (!selectedTeamObj) return

    if (isSubmittingAssign) return;
    try {
      setIsSubmittingAssign(true);
      await updateProjectTeamApi(selectedTeamId, {
        ...selectedTeamObj,
        comicName: directAssignComic.title,
        sourceLang: directAssignComic.language,
        targetLang: directAssignForm.targetLang,
        status: 'PENDING',
        deadline: directAssignForm.deadline || 'unspecified'
      })


      toast.success(`Successfully assigned team ${selectedTeamObj.title} for ${directAssignForm.targetLang} (pending leader approval)!`)
      setShowDirectAssignModal(false)
      if (fetchAllData) {
        await fetchAllData()
      } else {
        window.location.reload()
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to assign project team.')
    } finally {
      setIsSubmittingAssign(false);
    }
  }

  const openEditModal = (comic) => {
    setEditingComic(comic)
    setEditComicForm({
      title: comic.title,
      author: comic.authorName || comic.author || '',
      publicationStatus: comic.publicationStatus || 'ONGOING',
      language: comic.language && comic.language !== 'Unknown' ? comic.language : '',
      genres: comic.genres.map(g => typeof g === 'object' && g !== null ? g.name : g).join(', '),
      reason: ''
    })
  }

  const saveEditModal = () => {
    if (!editingComic) return
    if (!editComicForm.language.trim()) {
      toast.warn('Comic original language is required.')
      return
    }
    if (!editComicForm.reason || !editComicForm.reason.trim()) {
      toast.warn('Please provide a reason for the modification. This is required for transparency.')
      return
    }
    const inputGenreNames = editComicForm.genres.split(',').map(g => g.trim().toLowerCase()).filter(Boolean)
    const matchedGenreIds = []
    const invalidGenres = []
    
    inputGenreNames.forEach(inputName => {
      const found = (genres || []).find(g => (g.name || '').toLowerCase() === inputName)
      if (found) {
        matchedGenreIds.push(found.id)
      } else {
        invalidGenres.push(inputName)
      }
    })

    if (invalidGenres.length > 0) {
      toast.warn(`Invalid genres: ${invalidGenres.join(', ')}. Please click on the registered genres below.`)
      return
    }

    const updatedData = {
      title: editComicForm.title.trim(),
      language: editComicForm.language.trim(),
      publicationStatus: editComicForm.publicationStatus?.toUpperCase(),
      status: editComicForm.publicationStatus?.toUpperCase(),
      genreIds: matchedGenreIds,
      rejectionReason: editComicForm.reason.trim()
    }
    handleSaveEditComic(editingComic.id, updatedData)
    setEditingComic(null)
  }

  const handleExportComicCatalog = () => {
    try {
      const itemsToExport = filteredComics && filteredComics.length > 0 ? filteredComics : comics;
      const headers = [
        'Comic ID',
        'Title',
        'Author',
        'Original Language',
        'Publication Status',
        'Moderation Status',
        'Total Chapters',
        'Genres',
        'Assigned Team',
        'Views',
        'Rating'
      ];
      const rows = itemsToExport.map(c => {
        const cGenres = Array.isArray(c.genres) 
          ? c.genres.map(g => g.name || g.title || g).join(', ') 
          : (typeof c.genres === 'string' ? c.genres : '');
        const chapsCount = c.chaptersCount || c.chapterCount || c.chapters?.length || 0;
        
        return [
          c.id || 'N/A',
          c.title || 'Untitled',
          c.authorName || c.author || 'N/A',
          c.language || 'Japanese',
          c.publicationStatus || 'ONGOING',
          c.moderationStatus || 'PUBLISHED',
          chapsCount,
          cGenres || 'None',
          c.projectTeam || c.teamName || 'None',
          c.views || 0,
          c.rating || 0
        ];
      });

      exportToCsv('ComiVerse_Moderator_Comic_Catalog', headers, rows);
      toast.success('📥 Comic catalog exported successfully!');
    } catch (err) {
      console.error('Failed to export comic catalog:', err);
      toast.error('Failed to export catalog: ' + err.message);
    }
  };

  return (
    <div className="fade-in">
      <div className="comic-mgmt-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div className="moderator-page-header">
          <h1>Comic Management</h1>
          <p>Browse catalog comics, edit details, archive, or assign translator teams.</p>
        </div>
        <button
          type="button"
          className="mod-export-btn"
          onClick={handleExportComicCatalog}
          title="Export current comic catalog as CSV"
        >
          <span>📥 Export Catalog (CSV)</span>
        </button>
      </div>

      {/* Statistics overview cards row */}
      <div className="mod-stats-cards-row" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="mod-stat-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Total Comics</span>
            <svg viewBox="0 0 100 30" className="stat-sparkline" style={{ width: '50px', height: '18px', color: 'var(--mod-purple)', opacity: 0.7 }}>
              <path d="M0 20 Q 25 5, 50 15 T 100 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stat-value">{comics.filter(c => c.moderationStatus !== 'REJECTED' && c.moderationStatus !== 'SUBMITTED_FOR_REVIEW').length}</span>
        </div>
        <div className="mod-stat-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Ongoing</span>
            <svg viewBox="0 0 100 30" className="stat-sparkline" style={{ width: '50px', height: '18px', color: 'var(--mod-green)', opacity: 0.7 }}>
              <path d="M0 25 C 20 25, 40 5, 60 10 C 80 15, 90 2, 100 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stat-value active-count">{comics.filter(c => c.moderationStatus !== 'UNPUBLISHED' && (!c.publicationStatus || c.publicationStatus.toUpperCase() === 'ONGOING')).length}</span>
        </div>
        <div className="mod-stat-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Completed</span>
            <svg viewBox="0 0 100 30" className="stat-sparkline" style={{ width: '50px', height: '18px', color: '#3b82f6', opacity: 0.7 }}>
              <path d="M0 25 C 30 25, 50 20, 70 8 C 85 2, 95 10, 100 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stat-value" style={{ color: '#3b82f6' }}>{comics.filter(c => c.moderationStatus !== 'UNPUBLISHED' && c.publicationStatus?.toUpperCase() === 'COMPLETED').length}</span>
        </div>
        <div className="mod-stat-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Hiatus</span>
            <svg viewBox="0 0 100 30" className="stat-sparkline" style={{ width: '50px', height: '18px', color: '#d97706', opacity: 0.7 }}>
              <path d="M0 10 C 20 10, 40 25, 60 20 C 80 15, 90 25, 100 25" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stat-value paused-count">{comics.filter(c => c.moderationStatus !== 'UNPUBLISHED' && c.publicationStatus?.toUpperCase() === 'HIATUS').length}</span>
        </div>
        <div className="mod-stat-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Suspended</span>
            <svg viewBox="0 0 100 30" className="stat-sparkline" style={{ width: '50px', height: '18px', color: '#ef4444', opacity: 0.7 }}>
              <path d="M0 15 C 20 25, 40 25, 60 15 C 80 5, 90 5, 100 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stat-value" style={{ color: '#ef4444' }}>{comics.filter(c => c.moderationStatus === 'UNPUBLISHED').length}</span>
        </div>
      </div>

      <div className="comic-search-filter-row">
        <div className="mod-search-wrapper" style={{ width: '100%', maxWidth: 'none' }}>
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            className="mod-search-input" 
            placeholder="Search comics, authors, project teams..." 
            value={comicSearch}
            onChange={(e) => setComicSearch(e.target.value)}
          />
        </div>
        
        <div className="comic-filters-group" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <CustomDropdown 
            value={comicStatusFilter} 
            onChange={setComicStatusFilter} 
            options={[
              {value: 'All Status', label: 'All Status'}, 
              {value: 'Ongoing', label: 'Ongoing'}, 
              {value: 'Hiatus', label: 'Hiatus'}, 
              {value: 'Completed', label: 'Completed'}, 
              {value: 'Suspended', label: 'Suspended'}
            ]} 
          />
          <CustomDropdown 
            value={comicGenreFilter} 
            onChange={setComicGenreFilter} 
            options={[
              {value: 'All Genres', label: 'All Genres'}, 
              ...(genres || []).map(g => ({ value: g.name, label: g.name }))
            ]} 
          />
          <CustomDropdown 
            value={comicAuthorFilter} 
            onChange={setComicAuthorFilter} 
            options={[
              {value: 'All Authors', label: 'All Authors'}, 
              ...Array.from(new Set(comics.map(c => c.authorName || c.author).filter(Boolean))).map(author => ({ value: author, label: author }))
            ]} 
          />
          <CustomDropdown 
            value={comicTeamFilter} 
            onChange={setComicTeamFilter} 
            options={[
              {value: 'All Project Teams', label: 'All Project Teams'}, 
              ...Array.from(new Set(comics.map(c => c.projectTeam).filter(t => t !== '-'))).map(team => ({ value: team, label: team }))
            ]} 
          />
          <CustomDropdown 
            value={comicLanguageFilter} 
            onChange={setComicLanguageFilter} 
            options={[
              {value: 'All Languages', label: 'All Languages'}, 
              {value: 'Japanese', label: 'Japanese'}, 
              {value: 'Korean', label: 'Korean'}, 
              {value: 'Chinese', label: 'Chinese'}, 
              {value: 'English', label: 'English'}
            ]}
          />
          <CustomDropdown 
            value={viewsSort} 
            onChange={setViewsSort} 
            options={[
              {value: 'All Views', label: 'All Views'}, 
              {value: 'Most Viewed', label: 'Most Viewed'}, 
              {value: 'Least Viewed', label: 'Least Viewed'}
            ]} 
          />
          <CustomDropdown 
            value={comicTimeFilter} 
            onChange={setComicTimeFilter} 
            options={[
              {value: 'All Time', label: 'All Time'}, 
              {value: 'Updated Today', label: 'Updated Today'}, 
              {value: 'Updated Last 7 Days', label: 'Updated Last 7 Days'}, 
              {value: 'Updated Last 30 Days', label: 'Updated Last 30 Days'}
            ]} 
          />
          <CustomDropdown 
            value={chapterUpdateSort} 
            onChange={setChapterUpdateSort} 
            options={[
              {value: 'Sort by Update Time', label: 'Sort by Update Time'}, 
              {value: 'Newest Chapters First', label: 'Newest Chapters First'}, 
              {value: 'Oldest Chapters First', label: 'Oldest Chapters First'}
            ]} 
          />
        </div>
      </div>

      <div className="comic-table-card">
        <table className="comic-table">
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>#</th>
              <th>Comic</th>
              <th>Author</th>
              <th>Chapters</th>
              <th>Views</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(Math.min(ITEMS_PER_PAGE, filteredAndSortedComics.length || ITEMS_PER_PAGE))].map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td style={{ textAlign: 'center' }}><div className="skeleton-line skeleton-shimmer short" style={{ height: '16px', width: '24px', margin: '0 auto' }}></div></td>
                  <td>
                    <div className="comic-cell-info">
                      <div className="skeleton-img skeleton-shimmer" style={{ width: '48px', height: '64px', borderRadius: '4px' }}></div>
                      <div className="comic-cell-details" style={{ flex: 1, gap: '8px', paddingLeft: '12px' }}>
                        <div className="skeleton-line skeleton-shimmer long" style={{ height: '16px', margin: 0 }}></div>
                        <div className="skeleton-line skeleton-shimmer short" style={{ height: '14px', margin: 0, width: '120px' }}></div>
                      </div>
                    </div>
                  </td>
                  <td><div className="skeleton-line skeleton-shimmer short" style={{ height: '16px', width: '100px' }}></div></td>
                  <td><div className="skeleton-line skeleton-shimmer short" style={{ height: '16px', width: '40px' }}></div></td>
                  <td><div className="skeleton-line skeleton-shimmer short" style={{ height: '16px', width: '60px' }}></div></td>
                  <td><div className="skeleton-line skeleton-shimmer short" style={{ height: '16px', width: '50px' }}></div></td>
                  <td><div className="skeleton-line skeleton-shimmer short" style={{ height: '24px', width: '70px', borderRadius: '12px' }}></div></td>
                  <td>
                    <div className="comic-actions-cell" style={{ display: 'flex', gap: '8px' }}>
                      <div className="skeleton-img skeleton-shimmer" style={{ width: '90px', height: '32px', borderRadius: '8px' }}></div>
                      <div className="skeleton-img skeleton-shimmer" style={{ width: '90px', height: '32px', borderRadius: '8px' }}></div>
                    </div>
                  </td>
                </tr>
              ))
            ) : paginatedComics.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--mod-text-secondary)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📚</div>
                  <p style={{ margin: 0, fontWeight: '500' }}>No comics found matching the current filters.</p>
                </td>
              </tr>
            ) : (
              paginatedComics.map((comic, idx) => {
                const hasPermission = isLanguageInModeratorScope(comic.language || comic.rawLanguage || comic.originalLanguage || comic.targetLanguage, getAuth()?.user);
                return (
                <tr key={comic.id || idx}>
                  <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--mod-text-secondary)', fontSize: '13px' }}>
                    {(activePage - 1) * ITEMS_PER_PAGE + idx + 1}
                  </td>
                  <td>
                    <div className="comic-cell-info">
                      <div className="comic-cell-thumbnail">
                        {(comic.cover || comic.coverImage || comic.coverImageUrl || comic.coverUrl || comic.cover_url || comic.imageUrl) ? (
                          <img 
                            src={comic.cover || comic.coverImage || comic.coverImageUrl || comic.coverUrl || comic.cover_url || comic.imageUrl} 
                            alt={comic.title} 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML = comic.title.toLowerCase().includes('sword') ? '⚔️' : comic.title.toLowerCase().includes('spirit') ? '🔮' : comic.title.toLowerCase().includes('demon') ? '👑' : '📚';
                            }}
                          />
                        ) : (
                          comic.title.toLowerCase().includes('sword') ? '⚔️' : comic.title.toLowerCase().includes('spirit') ? '🔮' : comic.title.toLowerCase().includes('demon') ? '👑' : '📚'
                        )}
                      </div>
                      <div className="comic-cell-details">
                        <span 
                          className="comic-cell-title" 
                          style={{ cursor: 'pointer' }} 
                          onClick={() => navigate(`/moderator/comic/${comic.id}`, { state: { comic } })}
                          title="Click to view comic details & chapters"
                        >
                          {comic.title}
                        </span>
                        <div className="comic-cell-genres">
                          {(comic.genres || []).map((g, gIdx) => (
                            <span key={gIdx} className="comic-genre-tag">
                              {typeof g === 'object' && g !== null ? g.name : g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{comic.authorName || (typeof comic.author === 'object' ? (comic.author?.displayName || comic.author?.fullName || comic.author?.username) : comic.author) || (typeof comic.user === 'object' ? (comic.user?.fullName || comic.user?.username) : comic.user) || comic.creatorName || (typeof comic.creator === 'object' ? (comic.creator?.fullName || comic.creator?.username) : comic.creator) || comic.submittedBy || comic.createdByName || 'Original Author'}</td>
                  <td>
                    <strong>{comic.chapterCount !== undefined ? comic.chapterCount : (comic.chapters || 0)}</strong>
                    {comic.lastChapterUpdatedAt && (
                      <div style={{ fontSize: '11px', color: 'var(--mod-text-secondary)', marginTop: '4px' }}>
                        🕒 {new Date(comic.lastChapterUpdatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </td>
                  <td>
                    {comic.viewCount || comic.totalViews || comic.views || comic.view || 0}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#f59e0b' }}>
                      <span style={{ fontSize: '15px' }}>★</span>
                      <span>{Number(comic.ratingAverage || comic.averageRating || comic.rating || 0).toFixed(1)}</span>
                      <span style={{ fontSize: '11px', color: 'var(--mod-text-secondary)', fontWeight: 'normal' }}>
                        ({comic.ratingCount || comic.totalRatings || comic.ratings || 0})
                      </span>
                    </div>
                  </td>
                  <td>
                    {comic.moderationStatus === 'REJECTED' ? (
                      <span className="comic-status-badge rejected" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
                        REJECTED
                      </span>
                    ) : comic.moderationStatus === 'SUBMITTED_FOR_REVIEW' || comic.moderationStatus === 'PENDING' || comic.moderationStatus === 'PENDING_REVIEW' ? (
                      <span className="comic-status-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                        PENDING REVIEW
                      </span>
                    ) : comic.moderationStatus === 'UNPUBLISHED' ? (
                      <span className="comic-status-badge rejected">
                        SUSPENDED
                      </span>
                    ) : (
                      <span className={`comic-status-badge ${(comic.publicationStatus || 'ONGOING').toLowerCase()}`}>
                        {comic.publicationStatus || 'ONGOING'}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="comic-actions-cell">
                      <ModernButton 
                        variant={2} 
                        label="👁️ View Detail" 
                        className="btn-view"
                        onClick={() => navigate(`/moderator/comic/${comic.id}`, { state: { comic } })} 
                      />
                      {comic.moderationStatus === 'UNPUBLISHED' ? (
                        <ModernButton 
                          variant={2} 
                          label="🔄 Restore" 
                          className="btn-restore"
                          onClick={() => { setComicToArchive(comic); setIsRestoreMode(true); setShowArchiveModal(true); }} 
                          disabled={!hasPermission}
                          title={!hasPermission ? "Out of scope" : "Restore this comic (Make visible to readers)"}
                        />
                      ) : (
                        <ModernButton 
                          variant={2} 
                          label="⏸ Suspend" 
                          className="btn-suspend"
                          onClick={() => { setComicToArchive(comic); setIsRestoreMode(false); setShowArchiveModal(true); }} 
                          disabled={!hasPermission}
                          title={!hasPermission ? "Out of scope" : "Suspend this comic (Hide from readers)"}
                        />
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <ModernPagination 
            currentPage={activePage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
            variant="pills"
          />
        </div>
      )}

      {/* ── MODAL: EDIT COMIC INFO ─────────────────── */}
      {editingComic && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card">
            <div className="mod-modal-header">
              <h3>Edit Comic Information</h3>
              <button className="mod-modal-close-btn" onClick={() => setEditingComic(null)}>×</button>
            </div>

            <div className="mod-modal-body">
              <div className="mod-form-group">
                <label className="mod-label">Comic Title *</label>
                <input 
                  type="text" 
                  className="mod-input" 
                  value={editComicForm.title}
                  onChange={(e) => setEditComicForm({ ...editComicForm, title: e.target.value })}
                />
              </div>

              <div className="mod-form-group">
                <label className="mod-label">Author Name</label>
                <input 
                  type="text" 
                  className="mod-input" 
                  value={editComicForm.author}
                  readOnly
                  title="Author name is resolved from the author account and cannot be changed from Comic Management."
                />
              </div>

              <div className="mod-form-row">
                <div className="mod-form-group">
                  <label className="mod-label">Original Language</label>
                  <select
                    className="mod-select-field"
                    value={editComicForm.language}
                    onChange={(e) => setEditComicForm({ ...editComicForm, language: e.target.value })}
                    required
                  >
                    <option value="" disabled>Select original language</option>
                    {AVAILABLE_LANGUAGES.map((language) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </select>
                </div>

                <div className="mod-form-group">
                  <label className="mod-label">Status</label>
                  <select 
                    className="mod-select-field"
                    value={editComicForm.publicationStatus}
                    onChange={(e) => setEditComicForm({ ...editComicForm, publicationStatus: e.target.value })}
                  >
                    <option value="ONGOING">Ongoing</option>
                    <option value="HIATUS">Hiatus</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div className="mod-form-group">
                <label className="mod-label">Genres (Comma separated)</label>
                <input 
                  type="text" 
                  className="mod-input" 
                  placeholder="e.g. Action, Fantasy, Cultivation"
                  value={editComicForm.genres}
                  onChange={(e) => setEditComicForm({ ...editComicForm, genres: e.target.value })}
                />
                {genres && genres.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <label className="mod-label" style={{ fontSize: '12px', color: 'var(--mod-text-secondary)', marginBottom: '6px', display: 'block' }}>
                       Or select from registered genres (Click to toggle):
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {genres.map((g) => {
                        const activeGenres = editComicForm.genres
                          .split(',')
                          .map((item) => item.trim().toLowerCase())
                          .filter(Boolean);
                        const isActive = activeGenres.includes(g.name.toLowerCase());
                        return (
                          <span
                            key={g.id}
                            onClick={() => {
                              const currentList = editComicForm.genres
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean);
                              
                              let newList;
                              if (isActive) {
                                newList = currentList.filter(
                                  (item) => item.toLowerCase() !== g.name.toLowerCase()
                                );
                              } else {
                                newList = [...currentList, g.name];
                              }
                              setEditComicForm({
                                ...editComicForm,
                                genres: newList.join(', ')
                              });
                            }}
                            style={{
                              background: isActive
                                ? 'rgba(168, 85, 247, 0.2)'
                                : 'rgba(255, 255, 255, 0.03)',
                              border: isActive
                                ? '1px solid #c084fc'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                              color: isActive ? '#c084fc' : '#cbd5e1',
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {g.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reason for Modification (Required) */}
            <div className="mod-form-group">
              <label className="mod-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Reason for Modification
                <span style={{
                  fontSize: '10px', fontWeight: '600', color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px',
                  letterSpacing: '0.5px'
                }}>REQUIRED</span>
              </label>
              <textarea
                className="mod-input"
                rows={3}
                value={editComicForm.reason || ''}
                onChange={(e) => setEditComicForm({ ...editComicForm, reason: e.target.value })}
                placeholder="e.g. Adjusted age rating to 18+ due to graphic violence in Chapter 3, Updated genres for better discoverability..."
                style={{ resize: 'vertical', minHeight: '72px', fontFamily: 'inherit', lineHeight: '1.5' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--mod-text-secondary, #64748b)', marginTop: '4px', display: 'block' }}>
                This reason will be included in the notification sent to the Author.
              </span>
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={2} 
                label="Cancel" 
                className="btn-cancel"
                onClick={() => setEditingComic(null)} 
                style={{ width: '130px' }}
              />
              <ModernButton 
                variant={2} 
                label="Save Changes" 
                onClick={saveEditModal}
                disabled={!editComicForm.title.trim()}
                style={{ width: '130px' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: REQUEST TRANSLATION ─────────────── */}
      {showTransReqModal && transReqComic && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card" style={{ maxWidth: '560px' }}>
            <div className="mod-modal-header">
              <h3>🌐 Request Translation</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowTransReqModal(false)}>×</button>
            </div>

            <div className="mod-modal-body">
              {/* Comic info */}
              <div className="mod-form-group">
                <label className="mod-label">Comic</label>
                <div className="trans-req-comic-name">{transReqComic.title}</div>
              </div>

              {/* Source language belongs to Comic and is read-only in this request. */}
              <div className="mod-form-group">
                <label className="mod-label">Source Language</label>
                <div className="trans-req-comic-name">{transReqComic.language || 'Not configured'}</div>
              </div>

              {/* Target Languages - Checkbox Grid */}
              <div className="mod-form-group">
                <label className="mod-label">Target Languages <span style={{ fontSize: '11px', color: 'var(--mod-text-secondary)' }}>(select one or more)</span></label>
                <div className="lang-checkbox-grid">
                  {AVAILABLE_LANGUAGES
                    .filter(lang => lang.toLowerCase() !== (transReqComic.language || '').toLowerCase())
                    .filter(lang => {
                      const existing = projectTeams
                        ? projectTeams.filter(t => t.comicName && transReqComic && t.comicName.toLowerCase() === transReqComic.title.toLowerCase())
                        : [];
                      const isAlreadyTranslated = existing.some(t => t.targetLang && t.targetLang.toLowerCase() === lang.toLowerCase());
                      return !isAlreadyTranslated;
                    })
                    .map(lang => (
                      <button
                        key={lang}
                        type="button"
                        className={`lang-checkbox-item ${transReqForm.targetLanguages.includes(lang) ? 'checked' : ''}`}
                        onClick={() => toggleTargetLang(lang)}
                      >
                        <span className="lang-checkbox-tick">{transReqForm.targetLanguages.includes(lang) ? '✓' : ''}</span>
                        {lang}
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Priority & Deadline row */}
              <div className="mod-form-row">
                <div className="mod-form-group">
                  <label className="mod-label">Priority</label>
                  <select 
                    className="mod-select-field"
                    value={transReqForm.priority}
                    onChange={(e) => setTransReqForm({ ...transReqForm, priority: e.target.value })}
                  >
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🟢 Low</option>
                  </select>
                </div>
                <div className="mod-form-group">
                  <label className="mod-label">Deadline</label>
                  <CustomDatePicker 
                    value={transReqForm.deadline}
                    onChange={(val) => setTransReqForm({ ...transReqForm, deadline: val })}
                    placeholder="Select deadline"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="mod-form-group">
                <label className="mod-label">Notes for Translator (optional)</label>
                <textarea 
                  className="mod-textarea"
                  rows="3"
                  placeholder="Any special instructions, terminology guides, or context..."
                  value={transReqForm.notes}
                  onChange={(e) => setTransReqForm({ ...transReqForm, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={5} 
                label="Cancel" 
                disabled={isSubmittingTrans}
                onClick={() => setShowTransReqModal(false)} 
              />
              <ModernButton 
                variant={2} 
                label={isSubmittingTrans ? 'Submitting...' : `Submit Request (${transReqForm.targetLanguages.length} language${transReqForm.targetLanguages.length !== 1 ? 's' : ''})`} 
                onClick={handleSubmitTranslationRequest}
                disabled={isSubmittingTrans || transReqForm.targetLanguages.length === 0}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: DIRECT ASSIGN TEAM ────────────────── */}
      {showDirectAssignModal && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card" style={{ maxWidth: '520px' }}>
            <div className="mod-modal-header">
              <h3>🔗 Assign Translation Team</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowDirectAssignModal(false)}>×</button>
            </div>

            <div className="mod-modal-body">
              <div className="mod-form-group">
                <label className="mod-label">Comic / Series Name</label>
                <input 
                  type="text" 
                  className="mod-input" 
                  value={directAssignComic?.title || ''} 
                  disabled 
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>

              {/* Target Language */}
              <div className="mod-form-group">
                <label className="mod-label">Target Language *</label>
                {AVAILABLE_LANGUAGES.filter(lang => {
                  const existing = projectTeams
                    ? projectTeams.filter(t => t.comicName && directAssignComic && t.comicName.toLowerCase() === directAssignComic.title.toLowerCase())
                    : [];
                  return !existing.some(t => t.targetLang && t.targetLang.toLowerCase() === lang.toLowerCase());
                }).length === 0 ? (
                  <p style={{ color: 'var(--mod-red)', fontSize: '13px', margin: '4px 0 0' }}>
                    ⚠️ This comic has already been assigned/requested in all available target languages.
                  </p>
                ) : (
                  <select 
                    className="mod-select-field"
                    value={directAssignForm.targetLang}
                    onChange={(e) => setDirectAssignForm({ ...directAssignForm, targetLang: e.target.value })}
                  >
                    {AVAILABLE_LANGUAGES.filter(lang => {
                      const existing = projectTeams
                        ? projectTeams.filter(t => t.comicName && directAssignComic && t.comicName.toLowerCase() === directAssignComic.title.toLowerCase())
                        : [];
                      return !existing.some(t => t.targetLang && t.targetLang.toLowerCase() === lang.toLowerCase());
                    }).map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Deadline */}
              <div className="mod-form-group">
                <label className="mod-label">Deadline</label>
                <CustomDatePicker 
                  value={directAssignForm.deadline}
                  onChange={(val) => setDirectAssignForm({ ...directAssignForm, deadline: val })}
                  placeholder="Select deadline"
                />
              </div>

              {/* EXISTING TEAM SELECTION */}
              <div className="mod-form-group">
                <label className="mod-label">Select Existing Project Team *</label>
                {projectTeams && projectTeams.length === 0 ? (
                  <p style={{ color: 'var(--mod-text-secondary)', fontSize: '13px' }}>No teams available.</p>
                ) : (
                  <select
                    className="mod-select-field"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
                    <option value="">-- Choose a Project Team --</option>
                    {projectTeams && projectTeams
                      .filter(t => !t.status || t.status.toUpperCase() !== 'UNCLAIMED')
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.title} {t.leaderName ? `(Leader: ${t.leaderName})` : '(No Leader)'} {t.comicName && t.comicName !== '-' ? `[translating ${t.comicName}]` : '[Idle]'}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={5} 
                label="Cancel" 
                disabled={isSubmittingAssign}
                onClick={() => setShowDirectAssignModal(false)} 
              />
              <ModernButton 
                variant={2} 
                label={isSubmittingAssign ? 'Assigning...' : 'Assign Team'} 
                onClick={handleSubmitDirectAssignment}
                disabled={isSubmittingAssign || !selectedTeamId || !directAssignForm.targetLang}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* ── MODAL: MANAGE CHAPTERS ─────────────── */}
      {showChaptersModal && chaptersComic && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="mod-modal-header">
              <h3>📖 Chapters of {chaptersComic.title}</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowChaptersModal(false)}>×</button>
            </div>

            <div className="mod-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {chaptersLoading ? (
                <SkeletonLoader count={5} height={40} style={{ marginBottom: '10px' }} />
              ) : chaptersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mod-text-secondary)' }}>
                  No chapters found for this comic.
                </div>
              ) : (
                <table className="mod-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--mod-border)' }}>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Chapter #</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Title</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Created Date</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Moderator</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Views</th>
                      <th style={{ textAlign: 'right', padding: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chaptersList.map((chap) => (
                      <tr key={chap.id} style={{ borderBottom: '1px solid var(--mod-border)' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>Chapter {chap.chapterNumber}</td>
                        <td style={{ padding: '12px' }}>
                          {chap.title || chap.manuscriptTitle || chap.chapterTitle || chap.chapter || chap.name || `Chapter ${chap.chapterNumber || chap.number || 1}`}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className={`comic-status-badge ${chap.isPremium ? 'paused' : 'ongoing'}`} style={{ fontSize: '11px', padding: '2px 6px' }}>
                            {chap.isPremium ? 'Premium' : 'Free'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {chap.createdAt ? new Date(chap.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {(chap.approvedBy || chap.moderatorName) ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                              <span style={{ fontWeight: '600', color: '#10b981' }}>✓ {chap.approvedBy || chap.moderatorName}</span>
                              {chap.approvedAt && (
                                <span style={{ fontSize: '11px', color: 'var(--mod-text-secondary)' }}>
                                  {new Date(chap.approvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontStyle: 'italic', color: 'var(--mod-text-secondary)' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>{chap.viewCount || 0}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <ModernButton 
                            variant={2} 
                            label="🗑️ Delete" 
                            className="btn-archive"
                            onClick={() => handleDeleteChapter(chap.id)}
                            style={{ height: '30px', minHeight: '30px', minWidth: '70px', padding: '0 10px', fontSize: '12px' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 0' }}>
              <ModernButton 
                variant={2} 
                label="Close" 
                className="btn-cancel"
                onClick={() => setShowChaptersModal(false)}
                style={{ width: '100px' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* 🛑 MODAL: SUSPEND/RESTORE COMIC CONFIRMATION 🛑🛑🛑🛑🛑🛑🛑🛑 */}
      {showArchiveModal && comicToArchive && createPortal(
        <div className="mod-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="mod-modal-card" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className="mod-modal-body" style={{ padding: '28px 20px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                {isRestoreMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <polyline points="23 20 23 14 17 14"></polyline>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                )}
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: 'white' }}>{isRestoreMode ? 'Restore Comic' : 'Suspend Comic'}</h3>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--mod-text-secondary)', lineHeight: '1.5' }}>
                {isRestoreMode ? (
                  <>Are you sure you want to restore <strong style={{ color: 'white' }}>"{comicToArchive.title}"</strong>?<br/>This will publish the comic back to readers.</>
                ) : (
                  <>Are you sure you want to suspend <strong style={{ color: 'white' }}>"{comicToArchive.title}"</strong>?<br/>This will hide the comic from readers across the platform.</>
                )}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center' }}>
                 <ModernButton 
                   variant={2} 
                   label="Cancel" 
                   className="btn-cancel"
                   onClick={() => {
                     setShowArchiveModal(false)
                     setComicToArchive(null)
                   }} 
                 />
                 <ModernButton 
                   variant={2} 
                   label={isRestoreMode ? "Restore" : "Suspend"} 
                   className={isRestoreMode ? "btn-restore" : "btn-suspend"}
                   onClick={() => {
                     if (isRestoreMode) {
                       handleRestoreComic(comicToArchive.id)
                     } else {
                       handleSuspendComic(comicToArchive.id)
                     }
                     setShowArchiveModal(false)
                     setComicToArchive(null)
                   }} 
                   
                 />
               </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ComicManagement
