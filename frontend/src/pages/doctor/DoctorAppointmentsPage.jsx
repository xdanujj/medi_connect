import { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { Calendar, Clock, User, Stethoscope, IndianRupee, HelpCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import '../DoctorPages.css';

const DoctorAppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const res = await api.get('/doctor/getAppointments');
        setAppointments(res.data?.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load appointments roster');
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
    <div className="doctor-page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Appointment Bookings</h1>
        <p className="page-subtitle">View and monitor consultation requests, schedules, and billing status</p>
      </div>

      {loading ? (
        <div className="text-center mt-8">
          <div className="spinner-large"></div>
          <p className="mt-4">Loading appointments schedule...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="empty-state glass-card-static text-center">
          <Calendar size={48} className="empty-icon" />
          <h3>No Bookings Recorded</h3>
          <p>Your calendar is currently clear. Active patient slots will show up here once booked.</p>
        </div>
      ) : (
        <div className="appointments-list-container stagger-children">
          {appointments.map((appt) => (
            <div key={appt._id} className="appointment-item-card glass-card">
              
              {/* Left Column: Patient Profile */}
              <div className="appointment-patient-info">
                <div className="patient-avatar">
                  <User size={20} />
                </div>
                <div className="patient-meta">
                  <h3>{appt.patient?.name || 'Patient'}</h3>
                  <span className="patient-age">Age: {appt.patient?.age || 'N/A'}</span>
                </div>
              </div>

              {/* Middle Column: Date / Time and Services */}
              <div className="appointment-details">
                <div className="details-row">
                  <div className="detail-item">
                    <Calendar size={16} className="detail-icon" />
                    <span>{formatDate(appt.startDateTime)}</span>
                  </div>
                  <div className="detail-item">
                    <Clock size={16} className="detail-icon" />
                    <span>
                      {formatTime(appt.startDateTime)} - {formatTime(appt.endDateTime)}
                    </span>
                  </div>
                </div>

                <div className="appointment-services">
                  <Stethoscope size={16} className="detail-icon" />
                  <div className="services-names">
                    <strong>Consultation Details:</strong>{' '}
                    {appt.services?.map((s) => s.name).join(', ') || appt.service?.name || 'Regular Checkup'}
                  </div>
                </div>
              </div>

              {/* Right Column: Invoicing and Badges */}
              <div className="appointment-status-pricing">
                <div className="pricing-box">
                  <IndianRupee size={16} />
                  <span className="price-amount">{appt.service?.fee || 0}</span>
                </div>

                <div className="status-badges-group">
                  <div className="badge-item">
                    <span className="badge-label">Visit Status</span>
                    <StatusBadge status={appt.status} />
                  </div>
                  <div className="badge-item">
                    <span className="badge-label">Payment status</span>
                    <StatusBadge status={appt.paymentStatus} />
                  </div>
                </div>
              </div>

              {/* Cancellation Info Banner */}
              {appt.status === 'cancelled' && (
                <div className="cancellation-banner">
                  <FileText size={14} />
                  <span>
                    Cancelled by <strong>{appt.cancelledBy}</strong>. Reason:{' '}
                    <em>{appt.cancellationReason || 'Not stated'}</em>
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

export default DoctorAppointmentsPage;
