import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import '../../assets/style/common/modern-pagination.css';

export const ModernPagination = ({
  currentPage = 1,
  totalPages = 5,
  onPageChange = () => {},
  variant = 'classic'
}) => {
  const { theme } = useTheme();

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Progress percentage for progress bar
  const progressPct = ((currentPage - 1) / Math.max(1, totalPages - 1)) * 100;

  return (
    <div className={`modern-pagination-container ${theme === 'light' ? 'light' : 'dark'}`}>
      
      {/* 1. Classic Pagination */}
      {variant === 'classic' && (
        <nav className="pag--classic" aria-label="Classic pagination">
          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handlePrev} 
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          
          {pages.map((p) => (
            <div 
              key={p} 
              className={`pag-item ${currentPage === p ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </div>
          ))}

          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handleNext} 
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </nav>
      )}

      {/* 2. Pills Pagination */}
      {variant === 'pills' && (
        <nav className="pag--pills" aria-label="Pills pagination">
          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handlePrev} 
            disabled={currentPage === 1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          {/* Simple smart pagination wrapper for pills to display ellipsis if page count is large */}
          {totalPages <= 6 ? (
            pages.map((p) => (
              <div 
                key={p} 
                className={`pag-item ${currentPage === p ? 'active' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </div>
            ))
          ) : (
            <>
              <div className={`pag-item ${currentPage === 1 ? 'active' : ''}`} onClick={() => onPageChange(1)}>1</div>
              {currentPage > 3 && <span className="pag__ellipsis">...</span>}
              
              {pages.filter(p => p > 1 && p < totalPages && Math.abs(p - currentPage) <= 1).map(p => (
                <div 
                  key={p} 
                  className={`pag-item ${currentPage === p ? 'active' : ''}`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </div>
              ))}
              
              {currentPage < totalPages - 2 && <span className="pag__ellipsis">...</span>}
              <div className={`pag-item ${currentPage === totalPages ? 'active' : ''}`} onClick={() => onPageChange(totalPages)}>{totalPages}</div>
            </>
          )}

          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handleNext} 
            disabled={currentPage === totalPages}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </nav>
      )}

      {/* 3. Dots Pagination */}
      {variant === 'dots' && (
        <nav className="pag--dots" aria-label="Dots pagination">
          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handlePrev} 
            disabled={currentPage === 1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          {pages.map((p) => (
            <div 
              key={p} 
              className={`pag-dot ${currentPage === p ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
            ></div>
          ))}

          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handleNext} 
            disabled={currentPage === totalPages}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </nav>
      )}

      {/* 4. Bordered Pagination */}
      {variant === 'bordered' && (
        <nav className="pag--bordered" aria-label="Bordered pagination">
          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handlePrev} 
            disabled={currentPage === 1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          {pages.map((p) => (
            <div 
              key={p} 
              className={`pag-item ${currentPage === p ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </div>
          ))}

          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handleNext} 
            disabled={currentPage === totalPages}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </nav>
      )}

      {/* 5. Track Pagination */}
      {variant === 'track' && (
        <nav className="pag--track" aria-label="Track pagination">
          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handlePrev} 
            disabled={currentPage === 1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          <div className="pag-track-area">
            <div className="pag-track-line">
              <div className="pag-track-thumb" style={{ width: `${progressPct}%` }}></div>
            </div>
            <div className="pag-track-nodes">
              {pages.map((p) => (
                <div 
                  key={p} 
                  className={`pag-track-node ${p < currentPage ? 'filled' : ''} ${p === currentPage ? 'active' : ''}`}
                  onClick={() => onPageChange(p)}
                  title={`Go to page ${p}`}
                ></div>
              ))}
            </div>
          </div>

          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handleNext} 
            disabled={currentPage === totalPages}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </nav>
      )}

      {/* 6. Compact Pagination */}
      {variant === 'compact' && (
        <nav className="pag--compact" aria-label="Compact pagination">
          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handlePrev} 
            disabled={currentPage === 1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          <span className="pag-counter">
            <span className="pag-current">{currentPage}</span>
            <span className="pag-sep"> / {totalPages}</span>
          </span>

          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handleNext} 
            disabled={currentPage === totalPages}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </nav>
      )}

      {/* 7. Progress Pagination */}
      {variant === 'progress' && (
        <nav className="pag--progress" aria-label="Progress pagination">
          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handlePrev} 
            disabled={currentPage === 1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          <div className="pag-progress-bar">
            <div className="pag-progress-fill" style={{ width: `${progressPct}%` }}></div>
          </div>

          <span className="pag-counter">
            {currentPage} / {totalPages}
          </span>

          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handleNext} 
            disabled={currentPage === totalPages}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </nav>
      )}

    </div>
  );
};

export default ModernPagination;
