import { useNavigate } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import ComicCard from '../../components/common/ComicCard'

// Import assets
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'

function NewReleases() {
  const navigate = useNavigate()

  // Mock data for Brand New Series (New Arrivals)
  const newArrivals = [
    { id: 6, title: 'Cyber Odyssey', cover: comicScifi, genre: 'Sci-Fi', chapters: '62', views: '320K', rating: '4.5' },
    { id: 7, title: 'Shadow Legend', cover: comicAction, genre: 'Action', chapters: '88', views: '180K', rating: '4.4' },
    { id: 8, title: 'Sky Realm', cover: comicAdventure, genre: 'Adventure', chapters: '104', views: '210K', rating: '4.3' },
    { id: 5, title: 'Solo Adventure', cover: comicAction, genre: 'Action', chapters: '45', views: '400K', rating: '4.6' }
  ]

  // Mock data for Latest Chapter Updates
  const latestUpdates = [
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
      <div className="home-sections-container" style={{ paddingTop: '40px' }}>
        
        {/* Section 1: New Arrivals */}
        <section className="home-section" style={{ marginBottom: '50px' }}>
          <div className="section-header" style={{ borderLeftColor: '#06b6d4' }}>
            <div className="section-title-group">
              <h2 className="section-title">New Arrivals</h2>
              <span className="section-subtitle">Brand new series recently launched on ComiVerse</span>
            </div>
          </div>

          <div className="recommended-grid" style={{ marginTop: '24px' }}>
            {newArrivals.map((comic) => (
              <ComicCard key={comic.id} comic={comic} />
            ))}
          </div>
        </section>

        {/* Section 2: Latest Chapter Updates */}
        <section className="home-section">
          <div className="section-header" style={{ borderLeftColor: '#a855f7' }}>
            <div className="section-title-group">
              <h2 className="section-title">Latest Chapters</h2>
              <span className="section-subtitle">Recently uploaded chapters from all series</span>
            </div>
          </div>

          <div className="updates-grid" style={{ marginTop: '24px' }}>
            {latestUpdates.map((comic) => (
              <div key={comic.id} className="update-card">
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
                        onClick={() => navigate(`/comic/${comic.id}`)}
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

export default NewReleases
