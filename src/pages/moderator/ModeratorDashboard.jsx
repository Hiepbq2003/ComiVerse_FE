import { useState } from 'react'
import '../../assets/style/moderator.css'
import ReviewQueue from './ReviewQueue'
import ComicManagement from './ComicManagement'
import GenreManagement from './GenreManagement'
import ProjectTeams from './ProjectTeams'
import ChatMonitor from './ChatMonitor'
import ForumModeration from './ForumModeration'

const INITIAL_SUBMISSIONS = [
  // Translator Queue (Group submissions)
  {
    id: 'trans-1',
    title: 'Invincible Sword God',
    chapter: 'Chapter 46',
    submittedBy: 'Dragon Group',
    queueType: 'translator',
    timeLabel: '2 hours ago',
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    words: '3,200 words',
    priority: 'High',
    flags: 0,
    status: 'pending',
    cover: '⚔️',
    content: `Chapter 46: The Sword Sect's Challenge\n\nIn the depths of the Sword Sect, the sword Qi raged like a tempest. Xiao Chen stood at the center, holding his rusted blade. The disciples around him laughed, whispering about his lack of talent.\n\n"You think you can challenge the first disciple with that garbage?" one mocked.\n\nXiao Chen didn't answer. Slowly, he unsheathed his sword. In an instant, a blinding light filled the courtyard, and the laughter ceased...`
  },
  {
    id: 'trans-2',
    title: 'Spirit Recovery',
    chapter: 'Chapter 33',
    submittedBy: 'Jade Group',
    queueType: 'translator',
    timeLabel: '5 hours ago',
    timestamp: Date.now() - 5 * 60 * 60 * 1000,
    words: '2,800 words',
    priority: 'Medium',
    flags: 0,
    status: 'pending',
    cover: '🔮',
    content: `Chapter 33: Unleashing the Seal\n\nThe ancient seal on the cavern wall began to crack. A dark violet aura leaked through, filling the cave with a suffocating chill. Ye Fan braced himself, chanting the spiritual purification mantra.\n\n"Hold the line!" he shouted to his team. The spirit beasts were waking up, and there was no turning back...`
  },
  {
    id: 'trans-3',
    title: 'Demon King Reborn',
    chapter: 'Chapter 19',
    submittedBy: 'Phoenix Group',
    queueType: 'translator',
    timeLabel: '1 day ago',
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    words: '3,500 words',
    priority: 'Low',
    flags: 2,
    status: 'pending',
    cover: '👑',
    content: `Chapter 19: Whispers of Treason\n\nLord Kael sat on the iron throne, staring at the empty hall. His shadow guards reported that the southern dukes were secretly gathering troops. The rebel army was forming.\n\n"Let them come," the Demon King whispered. "They forgot who ruled this continent for a thousand years..."`
  },
  {
    id: 'trans-approved-1',
    title: 'Apotheosis',
    chapter: 'Chapter 800',
    submittedBy: 'Valkyrie Scans',
    queueType: 'translator',
    timeLabel: '12 hours ago',
    timestamp: Date.now() - 12 * 60 * 60 * 1000,
    words: '4,100 words',
    priority: 'High',
    flags: 0,
    status: 'approved',
    cover: '⚡',
    content: `Chapter 800: Ascending the Divine Realm...`
  },
  {
    id: 'trans-rejected-1',
    title: 'Trash Novel Hero',
    chapter: 'Chapter 3',
    submittedBy: 'MangaMinds',
    queueType: 'translator',
    timeLabel: '3 days ago',
    timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
    words: '1,900 words',
    priority: 'Medium',
    flags: 5,
    status: 'rejected',
    cover: '🗑️',
    rejectionReason: 'Machine translation with multiple grammar violations and illegible formatting.',
    content: `Chapter 3: System Awakening...`
  },

  // Author Queue (Original Creator submissions)
  {
    id: 'auth-1',
    title: 'Martial Emperor',
    chapter: 'Chapter 110',
    submittedBy: 'Author: SwordMaster',
    queueType: 'author',
    timeLabel: '1 hour ago',
    timestamp: Date.now() - 1 * 60 * 60 * 1000,
    words: '4,200 words',
    priority: 'High',
    flags: 0,
    status: 'pending',
    cover: '☯️',
    content: `Chapter 110: Grand Cultivation Stage\n\nThe sky split open, revealing a celestial gate. The thunder tribulation descended upon Lin Feng. Six lightning strikes had already hit, leaving his body charred but his resolve unshaken.\n\n"Is this the limit of the heavens?" Lin Feng roared, raising both fists to meet the final thunderbolt...`
  },
  {
    id: 'auth-2',
    title: 'Rebirth of the Urban Immortal',
    chapter: 'Chapter 14',
    submittedBy: 'Author: CultivatorFan',
    queueType: 'author',
    timeLabel: '3 hours ago',
    timestamp: Date.now() - 3 * 60 * 60 * 1000,
    words: '3,100 words',
    priority: 'Medium',
    flags: 0,
    status: 'pending',
    cover: '🏢',
    content: `Chapter 14: Confronting the Young Master\n\nIn the luxury VIP room of the Dragon Club, Young Master Zhao sneered as he tapped his fingers. "A poor student like you dares to talk back to me?"\n\nChen Fan smiled faintly. "In my eyes, you and your family are nothing more than dust on the road..."`
  },
  {
    id: 'auth-3',
    title: 'Supreme God Domain',
    chapter: 'Chapter 5',
    submittedBy: 'Author: GodRealm',
    queueType: 'author',
    timeLabel: '2 days ago',
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    words: '2,500 words',
    priority: 'Low',
    flags: 1,
    status: 'pending',
    cover: '🛡️',
    content: `Chapter 5: The Forbidden Zone\n\nEntering the valley of skeletons, the air smelled of ash and copper. Every step Ye Chen took echoed through the silent rocks. A dragon skull lay half-buried in the sand...`
  },
  {
    id: 'auth-approved-1',
    title: 'Peerless Battle God',
    chapter: 'Chapter 5',
    submittedBy: 'Author: BattleKing',
    queueType: 'author',
    timeLabel: '2 days ago',
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    words: '2,200 words',
    priority: 'Medium',
    flags: 0,
    status: 'approved',
    cover: '🔥',
    content: `Chapter 5: Gathering Power...`
  }
]

const INITIAL_COMICS = [
  {
    id: 'comic-1',
    title: 'Invincible Sword God',
    author: 'Wu Xing',
    projectTeam: 'Dragon Group',
    chapters: 45,
    views: '1.2M',
    status: 'Ongoing',
    genres: ['Action', 'Fantasy']
  },
  {
    id: 'comic-2',
    title: 'Spirit Recovery',
    author: 'Chen Wei',
    projectTeam: 'Jade Group',
    chapters: 32,
    views: '890K',
    status: 'Ongoing',
    genres: ['Adventure', 'Mystery']
  },
  {
    id: 'comic-3',
    title: 'Demon King Reborn',
    author: 'Li Ming',
    projectTeam: 'Phoenix Group',
    chapters: 18,
    views: '654K',
    status: 'Paused',
    genres: ['Fantasy', 'Drama']
  },
  {
    id: 'comic-4',
    title: 'Heavenly Dao',
    author: 'Zhang Yu',
    projectTeam: 'Dragon Group',
    chapters: 120,
    views: '2.5M',
    status: 'Completed',
    genres: ['Cultivation', 'Action']
  }
]

const INITIAL_PROJECT_TEAMS = [
  {
    id: 'team-1',
    title: 'Dragon Group',
    comicName: 'Invincible Sword God',
    status: 'Active',
    membersCount: 7,
    chaptersCount: 45,
    progress: 68,
    leaderName: 'John Smith',
    leaderInitials: 'JS',
    deadline: 'Jul 15, 2024',
    sourceLang: 'Japanese',
    targetLang: 'English',
    priority: 'High'
  },
  {
    id: 'team-2',
    title: 'Jade Group',
    comicName: 'Spirit Recovery',
    status: 'Active',
    membersCount: 5,
    chaptersCount: 32,
    progress: 42,
    leaderName: 'Emily Brown',
    leaderInitials: 'EB',
    deadline: 'Aug 1, 2024',
    sourceLang: 'Chinese',
    targetLang: 'English',
    priority: 'Medium'
  },
  {
    id: 'team-3',
    title: 'Phoenix Group',
    comicName: 'Demon King Reborn',
    status: 'Paused',
    membersCount: 4,
    chaptersCount: 18,
    progress: 25,
    leaderName: 'Li Ming',
    leaderInitials: 'LM',
    deadline: 'Sep 10, 2024',
    sourceLang: 'Korean',
    targetLang: 'English',
    priority: 'Low'
  }
]

const AVAILABLE_TRANSLATORS = [
  { name: 'John Smith', initials: 'JS' },
  { name: 'Emily Brown', initials: 'EB' },
  { name: 'Li Ming', initials: 'LM' },
  { name: 'David Lee', initials: 'DL' },
  { name: 'Sarah Connor', initials: 'SC' }
]

function ModeratorDashboard({ user, onLogout }) {
  const [activeNav, setActiveNav] = useState('review-queue') // 'dashboard' | 'review-queue' | 'comic-management' | etc.
  
  // Decoupled shared states
  const [submissions, setSubmissions] = useState(INITIAL_SUBMISSIONS)
  const [comics, setComics] = useState(INITIAL_COMICS)
  const [projectTeams, setProjectTeams] = useState(INITIAL_PROJECT_TEAMS)

  // Creation Team Modal Shared triggers
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [createTeamStep, setCreateTeamStep] = useState(1)
  const [createTeamForm, setCreateTeamForm] = useState({
    title: '',
    comicName: '',
    deadline: '',
    sourceLang: 'Japanese',
    targetLang: 'English',
    leaderName: 'John Smith',
    priority: 'High'
  })

  const userName = user.fullName || user.username || 'Moderator'

  const getNavBadgeCount = (nav) => {
    if (nav === 'review-queue') {
      return submissions.filter(item => item.status === 'pending').length
    }
    if (nav === 'chat-monitor') return 2
    if (nav === 'forum') return 2
    return 0
  }

  // State setters passed down
  const handleApprove = (id) => {
    let approvedItem = null
    setSubmissions(prev =>
      prev.map(item => {
        if (item.id === id) {
          approvedItem = item
          return { ...item, status: 'approved' }
        }
        return item
      })
    )

    setTimeout(() => {
      const itemToProcess = approvedItem || submissions.find(item => item.id === id)
      if (itemToProcess && itemToProcess.queueType === 'author') {
        setComics(prevComics => {
          const exists = prevComics.find(c => c.title.toLowerCase() === itemToProcess.title.toLowerCase())
          if (exists) {
            return prevComics.map(c =>
              c.title.toLowerCase() === itemToProcess.title.toLowerCase()
                ? { ...c, chapters: c.chapters + 1 }
                : c
            )
          } else {
            return [
              ...prevComics,
              {
                id: `comic-${Date.now()}`,
                title: itemToProcess.title,
                author: itemToProcess.submittedBy.replace('Author: ', ''),
                projectTeam: '-',
                chapters: 1,
                views: '0',
                status: 'Ongoing',
                genres: ['Action', 'Fantasy']
              }
            ]
          }
        })
      }
    }, 50)
  }

  const handleConfirmReject = (id, reason) => {
    setSubmissions(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, status: 'rejected', rejectionReason: reason.trim() || 'No reason provided.' }
          : item
      )
    )
  }

  const handleSaveEditComic = (id, updatedFields) => {
    setComics(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updatedFields } : c))
    )
  }

  const handleArchiveComic = (id) => {
    if (window.confirm('Are you sure you want to archive this comic?')) {
      setComics(prev => prev.filter(c => c.id !== id))
    }
  }

  const handleTriggerAssignTeam = (comic) => {
    setCreateTeamForm({
      title: `${comic.title} Team`,
      comicName: comic.title,
      deadline: '',
      sourceLang: 'Japanese',
      targetLang: 'English',
      leaderName: 'John Smith',
      priority: 'High'
    })
    setCreateTeamStep(1)
    setShowCreateTeamModal(true)
  }

  const handleCreateProjectTeam = () => {
    const leaderObj = AVAILABLE_TRANSLATORS.find(t => t.name === createTeamForm.leaderName) || { name: 'John Smith', initials: 'JS' }
    const newTeam = {
      id: `team-${Date.now()}`,
      title: createTeamForm.title.trim() || `${createTeamForm.comicName} Team`,
      comicName: createTeamForm.comicName,
      status: 'Active',
      membersCount: 1,
      chaptersCount: 0,
      progress: 0,
      leaderName: leaderObj.name,
      leaderInitials: leaderObj.initials,
      deadline: createTeamForm.deadline || 'unspecified',
      sourceLang: createTeamForm.sourceLang,
      targetLang: createTeamForm.targetLang,
      priority: createTeamForm.priority
    }

    setProjectTeams(prev => [newTeam, ...prev])
    
    setComics(prevComics =>
      prevComics.map(c =>
        c.title.toLowerCase() === createTeamForm.comicName.toLowerCase()
          ? { ...c, projectTeam: createTeamForm.title.trim() || `${createTeamForm.comicName} Team` }
          : c
      )
    )

    setShowCreateTeamModal(false)
  }

  const handleRemoveProjectTeam = (id, teamTitle, comicName) => {
    if (window.confirm(`Are you sure you want to remove ${teamTitle}?`)) {
      setProjectTeams(prev => prev.filter(t => t.id !== id))
      setComics(prevComics =>
        prevComics.map(c =>
          c.title === comicName ? { ...c, projectTeam: '-' } : c
        )
      )
    }
  }

  return (
    <div className="moderator-layout">
      {/* ── SIDEBAR ─────────────────────────────────── */}
      <aside className="moderator-sidebar">
        <div className="moderator-sidebar-brand">
          <h2>Moderator Panel</h2>
          <span>Content Management</span>
        </div>

        <nav className="moderator-sidebar-nav">
          <button 
            className={`moderator-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveNav('dashboard')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">📊</span>
              Dashboard
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'review-queue' ? 'active' : ''}`}
            onClick={() => setActiveNav('review-queue')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">📝</span>
              Review Queue
            </span>
            {getNavBadgeCount('review-queue') > 0 && (
              <span className="moderator-nav-badge">{getNavBadgeCount('review-queue')}</span>
            )}
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'comic-management' ? 'active' : ''}`}
            onClick={() => setActiveNav('comic-management')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">📚</span>
              Comic Management
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'genre-management' ? 'active' : ''}`}
            onClick={() => setActiveNav('genre-management')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">🏷️</span>
              Genre Management
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'project-teams' ? 'active' : ''}`}
            onClick={() => setActiveNav('project-teams')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">👥</span>
              Project Teams
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'chat-monitor' ? 'active' : ''}`}
            onClick={() => setActiveNav('chat-monitor')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">💬</span>
              Chat Monitor
            </span>
            <span className="moderator-nav-badge">2</span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'forum' ? 'active' : ''}`}
            onClick={() => setActiveNav('forum')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">#</span>
              Forum
            </span>
            <span className="moderator-nav-badge">2</span>
          </button>
        </nav>

        <div className="moderator-sidebar-footer">
          <button className="moderator-nav-item" onClick={onLogout}>
            <span className="moderator-nav-label-group">
              <span>🚪</span>
              ← Back to Home
            </span>
          </button>
        </div>
      </aside>

      {/* ── MAIN WORKSPACE ──────────────────────────── */}
      <main className="moderator-main">
        {/* Top Navbar */}
        <header className="moderator-topbar">
          <div className="moderator-topbar-left">
            <span>Workspace: Moderator</span>
          </div>

          <div className="moderator-topbar-right">
            <button className="moderator-icon-btn" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </button>

            <div className="topbar-divider" />

            <button className="moderator-profile-btn">
              <span>👤</span> {userName}
            </button>

            <div className="topbar-divider" />

            <button className="moderator-logout-btn" onClick={onLogout}>
              <span>📤</span> Logout
            </button>
          </div>
        </header>

        {/* Content Render Area */}
        <div className="moderator-page-content">
          
          {/* VIEW: DASHBOARD */}
          {activeNav === 'dashboard' && (
            <div className="fade-in animate-slide-up">
              <div className="moderator-page-header">
                <h1>Moderator Control Console</h1>
                <p>Monitor community activities, review chapter translations, and moderate forum topics.</p>
              </div>

              <div className="placeholder-grid" style={{ marginBottom: '24px' }}>
                <div className="placeholder-card" style={{ borderLeft: '4px solid var(--mod-purple)' }}>
                  <h4>Pending Reviews</h4>
                  <p style={{ fontSize: '28px', fontWeight: '700', margin: '10px 0 4px', color: 'var(--mod-purple)' }}>
                    {submissions.filter(i => i.status === 'pending').length} Chapters
                  </p>
                  <p>Author queue: {submissions.filter(i => i.status === 'pending' && i.queueType === 'author').length} | Translator queue: {submissions.filter(i => i.status === 'pending' && i.queueType === 'translator').length}</p>
                </div>
                <div className="placeholder-card" style={{ borderLeft: '4px solid var(--mod-green)' }}>
                  <h4>Active Moderators</h4>
                  <p style={{ fontSize: '28px', fontWeight: '700', margin: '10px 0 4px', color: 'var(--mod-green)' }}>4 Active</p>
                  <p>Monitoring ComiVerse live servers</p>
                </div>
                <div className="placeholder-card" style={{ borderLeft: '4px solid var(--mod-red)' }}>
                  <h4>Reported Items</h4>
                  <p style={{ fontSize: '28px', fontWeight: '700', margin: '10px 0 4px', color: 'var(--mod-red)' }}>4 Flagged</p>
                  <p>2 Chat messages | 2 Forum posts</p>
                </div>
              </div>

              <div className="placeholder-card">
                <h4>Recent Audited Actions</h4>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px', fontSize: '13px' }}>
                    ✅ Approved chapter <strong>Chapter 800</strong> of <em>Apotheosis</em> (12 hours ago)
                  </div>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px', fontSize: '13px' }}>
                    ❌ Rejected chapter <strong>Chapter 3</strong> of <em>Trash Novel Hero</em> (3 days ago)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: REVIEW QUEUE */}
          {activeNav === 'review-queue' && (
            <ReviewQueue 
              submissions={submissions} 
              handleApprove={handleApprove} 
              handleConfirmReject={handleConfirmReject} 
            />
          )}

          {/* VIEW: COMIC MANAGEMENT */}
          {activeNav === 'comic-management' && (
            <ComicManagement 
              comics={comics} 
              handleSaveEditComic={handleSaveEditComic} 
              handleArchiveComic={handleArchiveComic} 
              handleTriggerAssignTeam={handleTriggerAssignTeam} 
            />
          )}

          {/* VIEW: GENRE MANAGEMENT */}
          {activeNav === 'genre-management' && (
            <GenreManagement />
          )}

          {/* VIEW: PROJECT TEAMS */}
          {activeNav === 'project-teams' && (
            <ProjectTeams 
              projectTeams={projectTeams}
              setProjectTeams={setProjectTeams}
              comics={comics}
              availableTranslators={AVAILABLE_TRANSLATORS}
              showCreateTeamModal={showCreateTeamModal}
              setShowCreateTeamModal={setShowCreateTeamModal}
              createTeamStep={createTeamStep}
              setCreateTeamStep={setCreateTeamStep}
              createTeamForm={createTeamForm}
              setCreateTeamForm={setCreateTeamForm}
              handleCreateProjectTeam={handleCreateProjectTeam}
              handleRemoveProjectTeam={handleRemoveProjectTeam}
            />
          )}

          {/* VIEW: CHAT MONITOR */}
          {activeNav === 'chat-monitor' && (
            <ChatMonitor />
          )}

          {/* VIEW: FORUM */}
          {activeNav === 'forum' && (
            <ForumModeration />
          )}

        </div>
      </main>
    </div>
  )
}

export default ModeratorDashboard
