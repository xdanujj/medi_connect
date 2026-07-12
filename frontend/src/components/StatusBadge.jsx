const STATUS_STYLES = {
  // Appointment statuses
  pending: 'badge-warning',
  confirmed: 'badge-success',
  'reschedule-required': 'badge-info',
  cancelled: 'badge-danger',
  attended: 'badge-success',
  'no-show': 'badge-danger',
  expired: 'badge-neutral',
  // Payment statuses
  paid: 'badge-success',
  failed: 'badge-danger',
  refunded: 'badge-info',
  // Slot statuses
  available: 'badge-success',
  locked: 'badge-warning',
  booked: 'badge-info',
  unavailable: 'badge-neutral',
  // Generic
  completed: 'badge-success',
  processing: 'badge-warning',
};

const StatusBadge = ({ status }) => {
  const className = STATUS_STYLES[status] || 'badge-neutral';

  return (
    <span className={`badge ${className}`}>
      {status?.replace(/-/g, ' ') || 'unknown'}
    </span>
  );
};

export default StatusBadge;
