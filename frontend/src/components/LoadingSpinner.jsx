import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  return (
    <div className="loading-container">
      <div className={`spinner spinner-${size}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export const CardSkeleton = ({ count = 3 }) => (
  <div className="skeleton-grid">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton-card">
        <div className="skeleton skeleton-avatar"></div>
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text short"></div>
      </div>
    ))}
  </div>
);

export default LoadingSpinner;
