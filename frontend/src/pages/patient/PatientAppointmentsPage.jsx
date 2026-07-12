import { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { Calendar, Clock, MapPin, Stethoscope, IndianRupee, Heart, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import '../PatientPages.css';

const PatientAppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const res = await api.get('/patient/appointments');
        setAppointments(res.data?.data || []);
      } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to fetch appointments');
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  return (
    <div className="patient-page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Appointments</h1>
        <p className="page-subtitle">Track your consult requests, bookings, and medical history</p>
      </div>

      {loading ? (
        <div className="text-center mt-8">
          <div className="spinner-large"></div>
          <p className="mt-4">Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="empty-state glass-card-static text-center">
          <Calendar size={48} className="empty-icon" />
          <h3>No Appointments Found</h3>
          <p>You haven't booked any doctor appointments yet.</p>
        </div>
      ) : (
        <div className="appointments-list stagger-children">
          {appointments.map((appointment) => (
            <div key={appointment._id} className="appointment-item-card glass-card">
              
              {/* Left Column: Doctor Info */}
              <div className="appointment-doctor-info">
                <div className="doctor-avatar-container">
                  {appointment.doctor?.profilePhoto ? (
                    <img
                      src={appointment.doctor.profilePhoto}
                      alt={appointment.doctor.name}
                      className="doctor-avatar"
                      onError={(e) => {
                        e.target.src = 'https://cdn-icons-png.flaticon.com/512/387/387561.png';
                      }}
                    />
                  ) : (
                    <div className="doctor-avatar-placeholder">
                      {appointment.doctor?.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="doctor-meta">
                  <h3>Dr. {appointment.doctor?.name}</h3>
                  <span className="specialization-text">{appointment.doctor?.specialization}</span>
                  <div className="clinic-text">
                    <MapPin size={12} />
                    <span>{appointment.doctor?.clinic?.name}</span>
                  </div>
                </div>
              </div>

              {/* Middle Column: Date, Time & Services */}
              <div className="appointment-details">
                <div className="details-row">
                  <div className="detail-item">
                    <Calendar size={16} className="detail-icon" />
                    <span>{formatDate(appointment.startDateTime)}</span>
                  </div>
                  <div className="detail-item">
                    <Clock size={16} className="detail-icon" />
                    <span>
                      {formatTime(appointment.startDateTime)} - {formatTime(appointment.endDateTime)}
                    </span>
                  </div>
                </div>

                <div className="appointment-services">
                  <Stethoscope size={16} className="detail-icon" />
                  <div className="services-names">
                    <strong>Services:</strong>{' '}
                    {appointment.services?.map((s) => s.name).join(', ') || appointment.service?.name || 'Consultation'}
                  </div>
                </div>
              </div>

              {/* Right Column: Fees and Badges */}
              <div className="appointment-status-pricing">
                <div className="pricing-box">
                  <IndianRupee size={16} />
                  <span className="price-amount">{appointment.service?.fee || 0}</span>
                </div>
                <div className="status-badges-group">
                  <div className="badge-item">
                    <span className="badge-label">Status</span>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <div className="badge-item">
                    <span className="badge-label">Payment</span>
                    <StatusBadge status={appointment.paymentStatus} />
                  </div>
                </div>
              </div>

              {/* Cancel info if applicable */}
              {appointment.status === 'cancelled' && (
                <div className="cancellation-banner">
                  <FileText size={14} />
                  <span>
                    Cancelled by <strong>{appointment.cancelledBy}</strong>. Reason:{' '}
                    <em>{appointment.cancellationReason || 'No reason provided.'}</em>
                  </span>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientAppointmentsPage;
