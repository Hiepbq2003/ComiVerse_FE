import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import '../../assets/style/common/modern-pagination.css';

export const ModernPagination = ({
  currentPage = 1,
  totalPages = 5,
  onPageChange = () => {},
  variant = 'classic',
  maxClickablePage = null,
  hasMore = false
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
            pages.map((p) => {
              const isDisabled = maxClickablePage !== null && p > maxClickablePage;
              return (
                <div 
                  key={p} 
                  className={`pag-item ${currentPage === p ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => !isDisabled && onPageChange(p)}
                  style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  {p}
                </div>
              );
            })
          ) : (
            <>
              <div className={`pag-item ${currentPage === 1 ? 'active' : ''}`} onClick={() => onPageChange(1)}>1</div>
              {currentPage > 3 && <span className="pag__ellipsis">...</span>}
              
              {pages.filter(p => p > 1 && p < totalPages && Math.abs(p - currentPage) <= 1).map(p => {
                const isDisabled = maxClickablePage !== null && p > maxClickablePage;
                return (
                  <div 
                    key={p} 
                    className={`pag-item ${currentPage === p ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => !isDisabled && onPageChange(p)}
                    style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    {p}
                  </div>
                );
              })}
              
              {currentPage < totalPages - 2 && <span className="pag__ellipsis">...</span>}
              {(() => {
                const isDisabled = maxClickablePage !== null && totalPages > maxClickablePage;
                return (
                  <div 
                    className={`pag-item ${currentPage === totalPages ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`} 
                    onClick={() => !isDisabled && onPageChange(totalPages)}
                    style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    {totalPages}
                  </div>
                );
              })()}
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

      {/* 3. Cursor Pagination (for Explore API) */}
      {variant === 'cursor' && (
        <nav className="pag--pills" aria-label="Cursor pagination">
          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={handlePrev} 
            disabled={currentPage === 1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          {(() => {
            let totalRendered = maxClickablePage || 1;
            
            // Force at least 3 numbers to show if there's more data
            if (totalRendered < 3 && hasMore) {
              totalRendered = 3;
            }
            
            // If total rendered is small, just show all
            if (totalRendered <= 5) {
              return Array.from({ length: totalRendered }, (_, i) => i + 1).map(p => {
                return (
                  <div 
                    key={p} 
                    className={`pag-item ${currentPage === p ? 'active' : ''}`}
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </div>
                );
              });
            }
            
            // If large, show 1 ... window ... totalRendered
            const windowStart = Math.max(2, currentPage - 1);
            const windowEnd = Math.min(totalRendered - 1, currentPage + 1);
            
            const elements = [];
            
            // Page 1
            elements.push(
              <div key={1} className={`pag-item ${currentPage === 1 ? 'active' : ''}`} onClick={() => onPageChange(1)}>1</div>
            );
            
            if (windowStart > 2) {
              elements.push(<span key="ell-1" className="pag__ellipsis">...</span>);
            }
            
            for (let p = windowStart; p <= windowEnd; p++) {
              elements.push(
                <div 
                  key={p} 
                  className={`pag-item ${currentPage === p ? 'active' : ''}`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </div>
              );
            }
            
            if (windowEnd < totalRendered - 1) {
              elements.push(<span key="ell-2" className="pag__ellipsis">...</span>);
            }
            
            // Last page
            elements.push(
              <div 
                key={totalRendered} 
                className={`pag-item ${currentPage === totalRendered ? 'active' : ''}`}
                onClick={() => onPageChange(totalRendered)}
              >
                {totalRendered}
              </div>
            );
            
            return elements;
          })()}

          <button 
            type="button" 
            className="pag-nav-btn" 
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage >= maxClickablePage && !hasMore}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </nav>
      )}

      {/* 4. Dots Pagination */}
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
