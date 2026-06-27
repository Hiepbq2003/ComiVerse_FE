import AuthorLayout from '../../components/layout/AuthorLayout'
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
function AuthorComics() {
  const comics = [
    {
      id: 1,
      title: 'Infinite Journey',
      tagline: 'An endless quest through dimensions to discover the ultimate truth of magic.',
      chapters: 120,
      views: '1.2M',
      status: 'published',
      cover: comicAction,
    },
    {
      id: 2,
      title: 'Solo Adventure',
      tagline: 'Conquering dungeons alone to protect what matters most.',
      chapters: 45,
      views: '400K',
      status: 'published',
      cover: comicAdventure,
    }
  ]
  return (
    <AuthorLayout activeNav="comics">
      <div className="author-page-header">
        <h1>My Comics</h1>
        <p>Manage your uploaded series, track metrics, and add new chapters.</p>
      </div>
      <div className="comics-grid">
        {comics.map((comic) => (
          <div className="comic-card-premium" key={comic.id}>
            <div className="comic-cover-wrapper">
              <img src={comic.cover} alt={comic.title} className="comic-cover-img" />
            </div>
            <div className="comic-details-area">
              <div className="comic-header-info">
                <div className="comic-title-block">
                  <h3>{comic.title}</h3>
                  <div className="comic-tagline">{comic.tagline}</div>
                </div>
                <span className={`comic-status-badge ${comic.status}`}>
                  {comic.status}
                </span>
              </div>
              <div className="comic-stats-row">
                <div className="comic-mini-stat">
                  <span className="lbl">Chapters</span>
                  <span className="val">{comic.chapters}</span>
                </div>
                <div className="comic-mini-stat">
                  <span className="lbl">Views</span>
                  <span className="val">{comic.views}</span>
                </div>
              </div>
              <div className="comic-actions-row">
                <button className="btn-author-action primary">Manage Chapters</button>
                <button className="btn-author-action">Edit Details</button>
                <button className="btn-author-action">View Analytics</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AuthorLayout>
  )
}
export default AuthorComics