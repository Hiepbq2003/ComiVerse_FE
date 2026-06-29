import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getAuth } from '../../utils/Auth'

// Import assets
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'

function ComicDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('chapters')
  const [user, setUser] = useState(null)
  const [inLibrary, setInLibrary] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [comments, setComments] = useState([
    { id: 1, name: 'Alex Johnson', avatar: 'A', date: '2 hours ago', content: 'This series is absolutely stunning! The art style is amazing and the plot keeps getting better.', rating: 5 },
    { id: 2, name: 'Nguyen An', avatar: 'N', date: '1 day ago', content: 'The pacing in the latest chapter is a bit fast, but the fight scene was epic. Can’t wait for the next update.', rating: 4 },
    { id: 3, name: 'Elena Rostova', avatar: 'E', date: '3 days ago', content: 'Simply the best manhwa on this site. I highly recommend it to anyone who loves deep worldbuilding.', rating: 5 }
  ])

  // Get current user on mount
  useEffect(() => {
    const auth = getAuth()
    if (auth && auth.user) {
      setUser(auth.user)
    }
  }, [])

  // All comics data list for detail lookup
  const comicsDb = {
    '1': {
      title: 'Battle Chronicles',
      cover: comicAction,
      genres: ['Action', 'Fantasy', 'Adventure'],
      author: 'Ji-Woo Park',
      artist: 'Studio ComiVerse',
      chaptersCount: 184,
      views: '1.2M',
      bookmarks: '45.2K',
      rating: '4.9',
      status: 'Ongoing',
      tagline: 'An epic fantasy action-adventure following the legacy of the legendary warrior who shattered the heavens. Forces of darkness emerge, and a young apprentice must unlock the ancient power within.'
    },
    '2': {
      title: 'Dragon Legacy',
      cover: comicAdventure,
      genres: ['Adventure', 'Fantasy'],
      author: 'Sarah Jenkins',
      artist: 'Team Dragon',
      chaptersCount: 372,
      views: '2.4M',
      bookmarks: '98.7K',
      rating: '4.8',
      status: 'Ongoing',
      tagline: 'The last dragon rider rises to save the kingdom from ancient ashes. Together with a young dragon hatchling, they must journey to the Edge of the World.'
    },
    '3': {
      title: 'Neon Genesis',
      cover: comicScifi,
      genres: ['Sci-Fi', 'Action'],
      author: 'Kenji Sato',
      artist: 'NeoArt Studio',
      chaptersCount: 95,
      views: '850K',
      bookmarks: '31.4K',
      rating: '4.7',
      status: 'Completed',
      tagline: 'In a dystopian cyberpunk future, a rogue hacker discovers a secret AI that could either save humanity or wipe it out entirely. The neon streets are paved with danger.'
    },
    '4': {
      title: 'Infinite Journey',
      cover: comicAdventure,
      genres: ['Adventure', 'Fantasy'],
      author: 'Marcus Aurelius',
      artist: 'Infinity Labs',
      chaptersCount: 120,
      views: '1.1M',
      bookmarks: '38.5K',
      rating: '4.8',
      status: 'Ongoing',
      tagline: 'An endless quest through dimensions to discover the ultimate truth of magic and science.'
    },
    '5': {
      title: 'Solo Adventure',
      cover: comicAction,
      genres: ['Action', 'Fantasy'],
      author: 'Kim Min-Jae',
      artist: 'Solo Studio',
      chaptersCount: 45,
      views: '400K',
      bookmarks: '18.9K',
      rating: '4.6',
      status: 'Ongoing',
      tagline: 'Conquering dungeons alone to protect what matters most. In a world of guilds, one hunter goes solo.'
    },
    '6': {
      title: 'Cyber Odyssey',
      cover: comicScifi,
      genres: ['Sci-Fi'],
      author: 'Liz Chen',
      artist: 'PixelWave',
      chaptersCount: 62,
      views: '320K',
      bookmarks: '12.4K',
      rating: '4.5',
      status: 'Ongoing',
      tagline: 'A space-opera journey across the galaxy to find the lost cradle of cybernetic life.'
    },
    '7': {
      title: 'Shadow Legend',
      cover: comicAction,
      genres: ['Action', 'Fantasy'],
      author: 'Jin-Woo Sung',
      artist: 'Shadow Studio',
      chaptersCount: 88,
      views: '180K',
      bookmarks: '9.2K',
      rating: '4.4',
      status: 'Ongoing',
      tagline: 'The shadows rise to obey their monarch. Can he keep his humanity while wielding the power of death?'
    },
    '8': {
      title: 'Sky Realm',
      cover: comicAdventure,
      genres: ['Adventure', 'Fantasy'],
      author: 'Aria Vance',
      artist: 'Nimbus',
      chaptersCount: 104,
      views: '210K',
      bookmarks: '11.5K',
      rating: '4.3',
      status: 'Completed',
      tagline: 'Floating islands, sky pirates, and a legendary treasure hidden in the eye of the eternal storm.'
    }
  }

  // Fallback to comic 1 if ID is invalid
  const comic = comicsDb[id] || comicsDb['1']

  // Generate chapters list
  const chaptersList = []
  for (let i = comic.chaptersCount; i >= 1; i--) {
    chaptersList.push({
      num: i,
      title: `Chapter ${i}: ${i === comic.chaptersCount ? 'The Final Confrontation' : `Story Arc Part ${i}`}`,
      date: i === comic.chaptersCount ? '2 hours ago' : `${comic.chaptersCount - i} days ago`,
      views: Math.floor(Math.random() * 20 + 5) + 'K'
    })
  }

  const handleAddToLibrary = () => {
    if (!user) {
      // Redirect to login
      navigate('/auth?mode=signin')
      return
    }
    setInLibrary(!inLibrary)
  }

  const handlePostComment = (e) => {
    e.preventDefault()
    if (!commentInput.trim()) return
    if (!user) {
      navigate('/auth?mode=signin')
      return
    }

    const newComment = {
      id: Date.now(),
      name: user.fullName || user.username || 'You',
      avatar: (user.fullName || user.username || 'Y')[0].toUpperCase(),
      date: 'Just now',
      content: commentInput,
      rating: 5
    }

    setComments([newComment, ...comments])
    setCommentInput('')
  }

  return (
    <HomeLayout>
      {/* BACKGROUND BANNER */}
      <div
        style={{
          position: 'relative',
          minHeight: '380px',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '40px 10%',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${comic.cover})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 25%',
            filter: 'brightness(0.15) blur(10px)',
            transform: 'scale(1.1)',
            zIndex: 0
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #07040d 0%, transparent 100%)',
            zIndex: 1
          }}
        />

        {/* COMIC MAIN METADATA CARD */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            gap: '40px',
            width: '100%',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          {/* Cover */}
          <div
            style={{
              width: '200px',
              height: '280px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              flexShrink: 0
            }}
          >
            <img src={comic.cover} alt={comic.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* Details */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: '#c084fc',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                {comic.status}
              </span>
              {comic.genres.map((genre, idx) => (
                <span
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  {genre}
                </span>
              ))}
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '42px',
                fontWeight: '700',
                margin: '0 0 8px',
                color: 'white',
                lineHeight: '1.2'
              }}
            >
              {comic.title}
            </h1>

            <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: '15px' }}>
              Story by <strong style={{ color: 'white' }}>{comic.author}</strong>  •  Art by <strong style={{ color: 'white' }}>{comic.artist}</strong>
            </p>

            {/* Stats Row */}
            <div
              style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '24px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '12px 20px',
                borderRadius: '12px',
                width: 'max-content',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Rating</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>⭐ {comic.rating}</span>
              </div>
              <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Views</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>👁️ {comic.views}</span>
              </div>
              <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Bookmarks</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>🔖 {comic.bookmarks}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={() => alert('Reading chapter 1! Feature coming soon.')}
                className="btn-home-primary"
                style={{ padding: '12px 30px', fontSize: '15px' }}
              >
                Read Chapter 1
              </button>
              <button
                onClick={handleAddToLibrary}
                className="btn-hero-outline"
                style={{ padding: '12px 24px', fontSize: '15px', borderColor: inLibrary ? '#10b981' : 'rgba(255, 255, 255, 0.15)', color: inLibrary ? '#10b981' : 'white' }}
              >
                {inLibrary ? '✓ Saved to Library' : '🔖 Add to Library'}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* CONTENT BODY */}
      <div className="home-sections-container" style={{ padding: '40px 10%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '40px' }}>

          {/* Left Column: Description + Chapters / Reviews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

            {/* Synopsis */}
            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.03)', padding: '24px', borderRadius: '16px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: 'white' }}>Synopsis</h3>
              <p style={{ margin: 0, fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6' }}>{comic.tagline}</p>
            </div>

            {/* Tabs Selector */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                gap: '24px'
              }}
            >
              <button
                onClick={() => setActiveTab('chapters')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'chapters' ? '2px solid #a855f7' : '2px solid transparent',
                  color: activeTab === 'chapters' ? 'white' : '#94a3b8',
                  padding: '12px 8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Chapters ({comic.chaptersCount})
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'comments' ? '2px solid #a855f7' : '2px solid transparent',
                  color: activeTab === 'comments' ? 'white' : '#94a3b8',
                  padding: '12px 8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Comments ({comments.length})
              </button>
            </div>

            {/* TAB CONTENT: CHAPTERS LIST */}
            {activeTab === 'chapters' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '600px',
                  overflowY: 'auto',
                  paddingRight: '8px'
                }}
              >
                {chaptersList.map((ch) => (
                  <div
                    key={ch.num}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 20px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => alert(`Opening Chapter ${ch.num}! Reading features coming soon.`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(168, 85, 247, 0.05)'
                      e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: '600', color: 'white', display: 'block', fontSize: '14px' }}>{ch.title}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Views: {ch.views}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{ch.date}</span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT: COMMENTS FEED */}
            {activeTab === 'comments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Comment Form */}
                <form onSubmit={handlePostComment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <textarea
                    rows="3"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder={user ? "Share your thoughts about this comic..." : "Please log in to share your thoughts..."}
                    disabled={!user}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: 'white',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {user ? (
                      <button type="submit" className="btn-home-primary" style={{ padding: '8px 20px', fontSize: '13px' }}>
                        Post Comment
                      </button>
                    ) : (
                      <Link to="/auth?mode=signin" className="btn-home-primary" style={{ padding: '8px 20px', fontSize: '13px', textDecoration: 'none' }}>
                        Sign In to Comment
                      </Link>
                    )}
                  </div>
                </form>

                {/* Comments List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        display: 'flex',
                        gap: '16px',
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px'
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'var(--color-primary-grad)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          color: 'white',
                          fontSize: '14px',
                          flexShrink: 0
                        }}
                      >
                        {comment.avatar}
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <strong style={{ color: 'white', fontSize: '14px' }}>{comment.name}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{comment.date}</span>
                        </div>
                        <div style={{ color: '#fbbf24', fontSize: '11px', marginBottom: '6px' }}>
                          {'★'.repeat(comment.rating)}{'☆'.repeat(5 - comment.rating)}
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: '1.5' }}>{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Sidebar (About / Artist / Info) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                background: '#0d0919',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '24px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', color: 'white', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>Comic Info</h3>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Author</span>
                <span style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{comic.author}</span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Artist</span>
                <span style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{comic.artist}</span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Status</span>
                <span style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{comic.status}</span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Publish Date</span>
                <span style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>Jan 12, 2025</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </HomeLayout>
  )
}

export default ComicDetail
