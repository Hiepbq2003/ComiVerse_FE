import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import ComicCard from '../../components/common/ComicCard'
import { getComicsPageApi } from '../../services/api/ComicApi'

function SearchResults() {
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [comics, setComics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('query') || ''
    setQuery(q)
  }, [location])

  useEffect(() => {
    if (!query) {
      setComics([])
      setLoading(false)
      return
    }

    const fetchResults = async () => {
      try {
        setLoading(true)
        const response = await getComicsPageApi(1, 10, query)
        const list = response.data || response || []
        setComics(list)
      } catch (err) {
        console.error(err)
        setComics([])
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query])

  return (
    <HomeLayout>
      <div className="search-results-container">
        <div className="search-results-header">
          <h1 className="search-results-title">
            Search Results for: <span className="search-results-query">"{query}"</span>
          </h1>
          {!loading && (
            <p className="search-results-count">
              Found {comics.length} {comics.length === 1 ? 'comic' : 'comics'}
            </p>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px 0' }}>
            <div className="search-spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
            <span style={{ marginLeft: '12px', color: '#94a3b8', fontSize: '16px' }}>Searching for comics...</span>
          </div>
        ) : comics.length === 0 ? (
          <div className="search-empty-state">
            <div className="search-empty-icon">🔍</div>
            <h2 className="search-empty-title">No results found</h2>
            <p className="search-empty-desc">
              We couldn't find any comics matching "{query}". Try checking your spelling or search for something else.
            </p>
            <Link to="/" className="btn-search-back-home">
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="search-results-grid">
            {comics.map((comic) => (
              <ComicCard key={comic.id || comic._id} comic={comic} />
            ))}
          </div>
        )}
      </div>
    </HomeLayout>
  )
}

export default SearchResults
