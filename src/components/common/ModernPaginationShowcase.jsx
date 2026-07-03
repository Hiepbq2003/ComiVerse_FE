import React, { useState } from 'react';
import { ModernPagination } from './ModernPagination';
import '../../assets/style/common/modern-pagination.css';

export const ModernPaginationShowcase = () => {
  const [currentPage, setCurrentPage] = useState(2);
  const totalPages = 5;

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const paginationVariants = [
    { name: 'Classic', value: 'classic' },
    { name: 'Pills', value: 'pills' },
    { name: 'Dots', value: 'dots' },
    { name: 'Bordered', value: 'bordered' },
    { name: 'Track Timeline', value: 'track' },
    { name: 'Compact Digital', value: 'compact' },
    { name: 'Progress Segments', value: 'progress' }
  ];

  return (
    <div className="modern-paginations-showcase">
      <div style={{ marginBottom: '1.5rem' }}>
        <span 
          style={{
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#705CFF'
          }}
        >
          Aesthetic Navigation
        </span>
        <h2>Modern Pagination Styles</h2>
        <p className="title-sub">Select any page or click navigation arrows to see synced state transitions</p>
      </div>

      <div className="paginations-grid">
        {paginationVariants.map((item, index) => (
          <div key={item.value} className="pagination-wrapper">
            <span className="label">{index + 1}. {item.name}</span>
            <ModernPagination 
              variant={item.value}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        ))}
      </div>

      <div 
        style={{
          marginTop: '2rem',
          borderTop: '1px solid #E5E7EB',
          paddingTop: '1rem',
          fontSize: '12px',
          color: '#5B5D72',
          fontStyle: 'italic'
        }}
      >
        Active State: Page <span style={{ color: '#705CFF', fontWeight: '600' }}>{currentPage}</span> of {totalPages}
      </div>
    </div>
  );
};

export default ModernPaginationShowcase;
