import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { rateComicApi, deleteComicRatingApi, getComicRatingApi } from '../../services/api/RatingApi';
import ConfirmModal from './ConfirmModal';

const STAR_LABELS = {
  1: '1 - Rất tệ (Poor)',
  2: '2 - Tệ (Fair)',
  3: '3 - Bình thường (Good)',
  4: '4 - Hay (Very Good)',
  5: '5 - Tuyệt vời (Excellent)'
};

function StarRating({ comicId, user, initialRatingAverage = 0, initialRatingCount = 0, initialUserScore = null, onRatingChange }) {
  const navigate = useNavigate();

  const [ratingAverage, setRatingAverage] = useState(Number(initialRatingAverage) || 0);
  const [ratingCount, setRatingCount] = useState(Number(initialRatingCount) || 0);
  const [userScore, setUserScore] = useState(initialUserScore ? Number(initialUserScore) : null);

  const [hoverScore, setHoverScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Sync initial props if changed
  useEffect(() => {
    setRatingAverage(Number(initialRatingAverage) || 0);
    setRatingCount(Number(initialRatingCount) || 0);
    setUserScore(initialUserScore ? Number(initialUserScore) : null);
  }, [initialRatingAverage, initialRatingCount, initialUserScore]);

  // Fetch latest rating details from server
  useEffect(() => {
    if (!comicId) return;

    let isMounted = true;
    const fetchRating = async () => {
      try {
        const res = await getComicRatingApi(comicId);
        const data = res?.data || res || {};
        if (isMounted) {
          if (data.ratingAverage !== undefined) setRatingAverage(Number(data.ratingAverage));
          if (data.ratingCount !== undefined) setRatingCount(Number(data.ratingCount));
          if (data.userScore !== undefined) setUserScore(data.userScore ? Number(data.userScore) : null);
        }
      } catch (err) {
        console.error('Failed to load comic rating:', err);
      }
    };

    fetchRating();

    return () => {
      isMounted = false;
    };
  }, [comicId, user]);

  const handleRate = async (score) => {
    if (!user) {
      toast.info('Please log in to rate this comic!');
      navigate('/auth?mode=signin');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      const res = await rateComicApi(comicId, score);
      const data = res?.data || res || {};

      const newAvg = data.ratingAverage !== undefined ? Number(data.ratingAverage) : ratingAverage;
      const newCount = data.ratingCount !== undefined ? Number(data.ratingCount) : ratingCount;
      const newScore = data.userScore !== undefined ? (data.userScore ? Number(data.userScore) : score) : score;

      setRatingAverage(newAvg);
      setRatingCount(newCount);
      setUserScore(newScore);

      toast.success(`Rated ${score} stars successfully!`);

      if (onRatingChange) {
        onRatingChange({
          ratingAverage: newAvg,
          ratingCount: newCount,
          userScore: newScore
        });
      }
    } catch (err) {
      console.error('Failed to rate comic:', err);
      const errMsg = err.response?.data?.message || 'Failed to rate comic. Please try again!';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeleteRating = async () => {
    setShowConfirmModal(false);
    if (!user || loading || !userScore) return;

    try {
      setLoading(true);
      const res = await deleteComicRatingApi(comicId);
      const data = res?.data || res || {};

      const newAvg = data.ratingAverage !== undefined ? Number(data.ratingAverage) : ratingAverage;
      const newCount = data.ratingCount !== undefined ? Number(data.ratingCount) : Math.max(0, ratingCount - 1);

      setRatingAverage(newAvg);
      setRatingCount(newCount);
      setUserScore(null);

      toast.success('Your rating has been removed.');

      if (onRatingChange) {
        onRatingChange({
          ratingAverage: newAvg,
          ratingCount: newCount,
          userScore: null
        });
      }
    } catch (err) {
      console.error('Failed to delete rating:', err);
      const errMsg = err.response?.data?.message || 'Failed to remove rating!';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const activeDisplayScore = hoverScore || userScore || 0;

  return (
    <div
      className="comic-star-rating-container"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '14px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '420px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
      }}
    >
      {/* Top row: Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '24px', fontWeight: '800', color: '#fbbf24', fontFamily: 'var(--font-serif)' }}>
            ⭐ {ratingAverage > 0 ? ratingAverage.toFixed(1) : '0.0'}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--star-text-muted, #94a3b8)' }}>
            / 5 ({ratingCount} ratings)
          </span>
        </div>

        {userScore && (
          <span
            style={{
              fontSize: '12px',
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              color: '#c084fc',
              fontWeight: '600'
            }}
          >
            Your rating: {userScore} ⭐
          </span>
        )}
      </div>

      {/* Stars Interactive Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '4px' }} onMouseLeave={() => setHoverScore(0)}>
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const isFilled = starIndex <= activeDisplayScore;
            return (
              <button
                key={starIndex}
                type="button"
                disabled={loading}
                onClick={() => handleRate(starIndex)}
                onMouseEnter={() => setHoverScore(starIndex)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: loading ? 'wait' : 'pointer',
                  fontSize: '28px',
                  padding: '2px',
                  lineHeight: '1',
                  transition: 'transform 0.15s ease, color 0.15s ease',
                  transform: hoverScore === starIndex ? 'scale(1.25)' : 'scale(1)',
                  color: isFilled ? '#fbbf24' : 'var(--star-empty, rgba(255, 255, 255, 0.2))'
                }}
                title={STAR_LABELS[starIndex]}
              >
                ★
              </button>
            );
          })}
        </div>

        {/* Hover label hint */}
        <span style={{ fontSize: '13px', color: 'var(--star-text-hint, #cbd5e1)', fontStyle: 'italic', marginLeft: '6px' }}>
          {hoverScore ? STAR_LABELS[hoverScore] : userScore ? `(Selected ${userScore} stars)` : '(Click star to rate)'}
        </span>
      </div>

      {/* Reset Rating Button */}
      {userScore && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowConfirmModal(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              fontSize: '12px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '2px 4px',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => (e.target.style.color = '#f87171')}
            onMouseLeave={(e) => (e.target.style.color = '#ef4444')}
          >
            Remove my rating
          </button>
        </div>
      )}

      {/* Confirm Popup Modal for Rating Deletion */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirm Rating Removal"
        message="Are you sure you want to remove your rating score for this comic?"
        confirmText="Remove Rating"
        cancelText="Keep Rating"
        type="danger"
        onConfirm={handleConfirmDeleteRating}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}

export default StarRating;
