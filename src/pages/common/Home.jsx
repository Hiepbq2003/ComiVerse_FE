import HomeLayout from '../../components/layout/HomeLayout'
import { useNavigate } from 'react-router-dom'
import ComicCard from '../../components/common/ComicCard'

// Import assets
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'

function Home() {
  const navigate = useNavigate()

  // High-fidelity Mock Data matching local assets
  const featuredComic = {
    title: 'Battle Chronicles',
    tagline: 'An epic fantasy action-adventure following the legacy of the legendary warrior who shattered the heavens. Forces of darkness emerge, and a young apprentice must unlock the ancient power within.',
    cover: comicAction,
    genre: 'Action',
    chapters: '184',
    views: '1.2M',
    rating: '4.9',
    tags: ['Action', 'Fantasy', 'Adventure']
  }

  const recommendedComics = [
    { id: 1, title: 'Battle Chronicles', cover: comicAction, genre: 'Action', badgeClass: 'action', chapters: '184', views: '1.2M', rating: '4.9' },
    { id: 2, title: 'Dragon Legacy', cover: comicAdventure, genre: 'Adventure', badgeClass: 'adventure', chapters: '372', views: '2.4M', rating: '4.8' },
    { id: 3, title: 'Neon Genesis', cover: comicScifi, genre: 'Sci-Fi', badgeClass: 'scifi', chapters: '95', views: '850K', rating: '4.7' },
    { id: 4, title: 'Infinite Journey', cover: comicAdventure, genre: 'Adventure', badgeClass: 'adventure', chapters: '120', views: '1.1M', rating: '4.8' },
    { id: 5, title: 'Solo Adventure', cover: comicAction, genre: 'Action', badgeClass: 'action', chapters: '45', views: '400K', rating: '4.6' },
    { id: 6, title: 'Cyber Odyssey', cover: comicScifi, genre: 'Sci-Fi', badgeClass: 'scifi', chapters: '62', views: '320K', rating: '4.5' }
  ]

  const hotComics = [
    { id: 2, title: 'Dragon Legacy', cover: comicAdventure, genre: 'Adventure', tagline: 'The last dragon rider rises to save the kingdom from ancient ashes.', chapters: '372', views: '2.4M', rating: '4.9' },
    { id: 1, title: 'Battle Chronicles', cover: comicAction, genre: 'Action', chapters: '184', views: '1.2M', rating: '4.9' },
    { id: 4, title: 'Infinite Journey', cover: comicAdventure, genre: 'Adventure', chapters: '120', views: '1.1M', rating: '4.8' },
    { id: 3, title: 'Neon Genesis', cover: comicScifi, genre: 'Sci-Fi', chapters: '95', views: '850K', rating: '4.7' },
    { id: 5, title: 'Solo Adventure', cover: comicAction, genre: 'Action', chapters: '45', views: '400K', rating: '4.6' }
  ]

  const newUpdates = [
    {
      id: 1,
      title: 'Battle Chronicles',
      cover: comicAction,
      genre: 'Action',
      chapters: [
        { num: 'Ch. 184', time: '2 hours ago' },
        { num: 'Ch. 183', time: '1 day ago' }
      ]
    },
    {
      id: 3,
      title: 'Neon Genesis',
      cover: comicScifi,
      genre: 'Sci-Fi',
      chapters: [
        { num: 'Ch. 95', time: '5 hours ago' },
        { num: 'Ch. 94', time: '2 days ago' }
      ]
    },
    {
      id: 5,
      title: 'Solo Adventure',
      cover: comicAction,
      genre: 'Action',
      chapters: [
        { num: 'Ch. 45', time: '8 hours ago' },
        { num: 'Ch. 44', time: '3 days ago' }
      ]
    },
    {
      id: 2,
      title: 'Dragon Legacy',
      cover: comicAdventure,
      genre: 'Adventure',
      chapters: [
        { num: 'Ch. 372', time: '12 hours ago' },
        { num: 'Ch. 371', time: '2 days ago' }
      ]
    },
    {
      id: 4,
      title: 'Infinite Journey',
      cover: comicAdventure,
      genre: 'Adventure',
      chapters: [
        { num: 'Ch. 120', time: '1 day ago' },
        { num: 'Ch. 119', time: '4 days ago' }
      ]
    },
    {
      id: 6,
      title: 'Cyber Odyssey',
      cover: comicScifi,
      genre: 'Sci-Fi',
      chapters: [
        { num: 'Ch. 62', time: '1 day ago' },
        { num: 'Ch. 61', time: '4 days ago' }
      ]
    },
    {
      id: 7,
      title: 'Shadow Legend',
      cover: comicAction,
      genre: 'Action',
      chapters: [
        { num: 'Ch. 88', time: '2 days ago' },
        { num: 'Ch. 87', time: '5 days ago' }
      ]
    },
    {
      id: 8,
      title: 'Sky Realm',
      cover: comicAdventure,
      genre: 'Adventure',
      chapters: [
        { num: 'Ch. 104', time: '2 days ago' },
        { num: 'Ch. 103', time: '5 days ago' }
      ]
    }
  ]

  return (
    <HomeLayout>
      {/* HERO SECTION */}
      <section className="home-hero-section">
        <div className="hero-banner-bg" style={{ backgroundImage: `url(${featuredComic.cover})` }} />
        <div className="hero-banner-overlay" />
        <div className="hero-content">
          <div className="hero-text-area">
            <div className="hero-badge-hot">
              <span>🔥 Spotlight</span>
            </div>
            <h1 className="hero-title">{featuredComic.title}</h1>

            <div className="hero-meta-row">
              {featuredComic.tags.map((tag, idx) => (
                <span key={idx} className="hero-genre-tag">{tag}</span>
              ))}
              <div className="hero-meta-item rating">
                <span>⭐</span> {featuredComic.rating}
              </div>
              <div className="hero-meta-item">
                <span>👁️</span> {featuredComic.views} Views
              </div>
              <div className="hero-meta-item">
                <span>📖</span> {featuredComic.chapters} Chapters
              </div>
            </div>

            <p className="hero-tagline">{featuredComic.tagline}</p>

            <div className="hero-buttons-row">
              <button
                onClick={() => navigate('/comic/1')}
                className="btn-home-primary"
                style={{ padding: '12px 28px', fontSize: '15px' }}
              >
                Read Chapter {featuredComic.chapters}
              </button>
              <button onClick={() => navigate('/comic/1')} className="btn-hero-outline">
                + Add to Library
              </button>
            </div>
          </div>

          <div className="hero-cover-area">
            <div className="hero-glow-card" onClick={() => navigate('/comic/1')}>
              <img src={featuredComic.cover} alt={featuredComic.title} />
            </div>
          </div>
        </div>
      </section>

      {/* SECTIONS WRAPPER */}
      <div className="home-sections-container">

        {/* SECTION 1: RECOMMENDED COMICS */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-title-group">
              <h2 className="section-title">Recommended for You</h2>
              <span className="section-subtitle">Specially curated series based on your interests</span>
            </div>
            <span style={{ cursor: 'pointer' }} className="section-view-all">
              View All <span>›</span>
            </span>
          </div>

          <div className="recommended-grid">
            {recommendedComics.map((comic) => (
              <ComicCard key={comic.id} comic={comic} />
            ))}
          </div>
        </section>

        {/* SECTION 2: HOT COMICS (SPLIT VIEW) */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-title-group">
              <h2 className="section-title">Trending Comics</h2>
              <span className="section-subtitle">Most read and discussed series this week</span>
            </div>
            <span style={{ cursor: 'pointer' }} className="section-view-all" onClick={() => navigate('/ranking')}>
              Full Leaderboard <span>›</span>
            </span>
          </div>

          <div className="hot-section-split">
            {/* Left Column: #1 Hot Comic Feature Card */}
            <div className="hot-featured-wrapper">
              <div
                className="hot-featured-card"
                onClick={() => navigate(`/comic/${hotComics[0].id}`)}
              >
                <div className="hot-featured-cover">
                  <img src={hotComics[0].cover} alt={hotComics[0].title} />
                  <div className="hot-rank-pill-featured">
                    <span>🏆</span> RANK #1
                  </div>
                </div>
                <div className="hot-featured-info">
                  <h3 className="hot-featured-title">{hotComics[0].title}</h3>
                  <p className="hot-featured-tagline">{hotComics[0].tagline}</p>
                  <div className="hot-featured-meta">
                    <span style={{ color: '#ec4899', fontWeight: '600' }}>{hotComics[0].genre}</span>
                    <span>⭐ {hotComics[0].rating} ({hotComics[0].views} views)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Rank list 2 to 5 */}
            <div className="hot-ranking-list">
              {hotComics.slice(1).map((comic, index) => (
                <div
                  key={comic.id}
                  className="ranking-item"
                  onClick={() => navigate(`/comic/${comic.id}`)}
                >
                  <span className={`rank-number top-${index + 2}`}>
                    0{index + 2}
                  </span>
                  <div className="rank-item-thumb">
                    <img src={comic.cover} alt={comic.title} />
                  </div>
                  <div className="rank-item-details">
                    <h4 className="rank-item-title">{comic.title}</h4>
                    <span className="rank-item-genre">{comic.genre}</span>
                  </div>
                  <div className="rank-item-meta">
                    <div className="rank-item-meta-item" style={{ color: '#fbbf24' }}>
                      <span>⭐</span> {comic.rating}
                    </div>
                    <div className="rank-item-meta-item">
                      <span>👁️</span> {comic.views}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: NEWLY UPDATED COMICS */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-title-group">
              <h2 className="section-title">New Chapters</h2>
              <span className="section-subtitle">Freshly updated series from our creators</span>
            </div>
            <span style={{ cursor: 'pointer' }} className="section-view-all" onClick={() => navigate('/new-releases')}>
              Release Calendar <span>›</span>
            </span>
          </div>

          <div className="updates-grid">
            {newUpdates.map((comic) => (
              <div
                key={comic.id}
                className="update-card"
              >
                <div className="update-thumb" onClick={() => navigate(`/comic/${comic.id}`)}>
                  <img src={comic.cover} alt={comic.title} />
                  <span className="update-badge-new">NEW</span>
                </div>
                <div className="update-info">
                  <div className="update-title-block">
                    <h3 className="update-title" onClick={() => navigate(`/comic/${comic.id}`)}>{comic.title}</h3>
                    <span className="update-genre">{comic.genre}</span>
                  </div>

                  <div className="update-chapters-list">
                    {comic.chapters.map((ch, idx) => (
                      <span
                        key={idx}
                        className="update-chapter-row"
                        onClick={() => navigate('/auth')}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="update-chapter-num">{ch.num}</span>
                        <span className="update-chapter-time">{ch.time}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </HomeLayout>
  )
}

export default Home
