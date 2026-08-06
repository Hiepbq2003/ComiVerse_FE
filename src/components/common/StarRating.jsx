import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { rateComicApi, deleteComicRatingApi, getComicRatingApi } from '../../services/api/RatingApi';
import ConfirmModal from './ConfirmModal';
import '../../assets/style/common/star-rating.css';

const STAR_LABELS = {
  1: '1 - Poor',
  2: '2 - Fair',
  3: '3 - Good',
  4: '4 - Very Good',
  5: '5 - Excellent'
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
    <div className="comic-star-rating-container">
      {/* Top row: Summary */}
      <div className="star-rating-header">
        <div className="star-rating-summary">
          <span className="star-rating-score-num">
            ⭐ {ratingAverage > 0 ? ratingAverage.toFixed(1) : '0.0'}
          </span>
          <span className="star-rating-muted-text">
            / 5 ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
          </span>
        </div>

        {userScore && (
          <span className="star-rating-badge-user">
            Your rating: {userScore} ⭐
          </span>
        )}
      </div>

      {/* Stars Interactive Row */}
      <div className="star-rating-stars-row">
        <div className="star-rating-stars-group" onMouseLeave={() => setHoverScore(0)}>
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const isFilled = starIndex <= activeDisplayScore;
            return (
              <button
                key={starIndex}
                type="button"
                disabled={loading}
                onClick={() => handleRate(starIndex)}
                onMouseEnter={() => setHoverScore(starIndex)}
                className={`star-button ${isFilled ? 'filled' : 'empty'}`}
                style={{
                  transform: hoverScore === starIndex ? 'scale(1.25)' : 'scale(1)'
                }}
                title={STAR_LABELS[starIndex]}
              >
                ★
              </button>
            );
          })}
        </div>

        {/* Hover label hint */}
        <span className="star-rating-hint-text">
          {hoverScore ? STAR_LABELS[hoverScore] : userScore ? `(Selected ${userScore} stars)` : '(Click star to rate)'}
        </span>
      </div>

      {/* Reset Rating Button */}
      {userScore && (
        <div className="star-rating-action-row">
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowConfirmModal(true)}
            className="star-rating-remove-btn"
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
