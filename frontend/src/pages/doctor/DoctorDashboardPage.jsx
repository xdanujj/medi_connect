import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import {
  Calendar,
  Clock,
  IndianRupee,
  Users,
  CheckCircle,
  Clock3,
  Stethoscope,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import '../DoctorPages.css';

const DoctorDashboardPage = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [apptsRes, servsRes] = await Promise.all([
          api.get('/doctor/getAppointments'),
          api.get('/doctor/services').catch(() => ({ data: { data: [] } })),
        ]);
        setAppointments(apptsRes.data?.data || []);
        setServices(servsRes.data?.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const getStats = () => {
    const total = appointments.length;
    const confirmed = appointments.filter((a) => a.status === 'confirmed').length;
    const completed = appointments.filter((a) => a.status === 'attended').length;
    
    const earnings = appointments
      .filter((a) => a.paymentStatus === 'paid' && a.status !== 'cancelled')
      .reduce((sum, a) => sum + (a.service?.fee || 0), 0);

    const uniquePatients = new Set(appointments.map((a) => String(a.patient?._id))).size;

    return { total, confirmed, completed, earnings, uniquePatients };
  };

  const getTodayAppointments = () => {
    const todayStr = new Date().toDateString();
    return appointments.filter((a) => {
      const apptDateStr = new Date(a.startDateTime).toDateString();
      return apptDateStr === todayStr && a.status !== 'cancelled';
    });
  };

  const stats = getStats();
  const todayAppointments = getTodayAppointments();

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
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

  if (loading) {
    return (
      <div className="doctor-page text-center">
        <div className="spinner-large"></div>
        <p className="mt-4">Loading dashboard stats...</p>
      </div>
    );
  }

  return (
    <div className="doctor-page animate-fade-in">
      {/* Welcome Banner */}
      <div className="welcome-banner glass-card-static">
        <div className="welcome-content">
          <h1>Welcome, Dr. {user?.email?.split('@')[0]}</h1>
          <p>Here is your schedule overview and clinic statistics for today.</p>
        </div>
        <div className="welcome-actions">
          <Link to="/doctor/availability" className="btn btn-primary btn-sm">
            <Clock size={16} />
            <span>Set Today's Hours</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid mt-6">
        
        <div className="stats-card glass-card">
          <div className="stats-icon-wrapper blue">
            <Users size={22} />
          </div>
          <div className="stats-info">
            <span className="stats-label">Total Patients</span>
            <strong className="stats-value">{stats.uniquePatients}</strong>
            <span className="stats-trend positive">
              <TrendingUp size={12} />
              <span>Active unique files</span>
            </span>
          </div>
        </div>

        <div className="stats-card glass-card">
          <div className="stats-icon-wrapper green">
            <Calendar size={22} />
          </div>
          <div className="stats-info">
            <span className="stats-label">Total Appointments</span>
            <strong className="stats-value">{stats.total}</strong>
            <span className="stats-subtext">{stats.confirmed} active bookings</span>
          </div>
        </div>

        <div className="stats-card glass-card">
          <div className="stats-icon-wrapper emerald">
            <IndianRupee size={22} />
          </div>
          <div className="stats-info">
            <span className="stats-label">Total Revenue</span>
            <strong className="stats-value">₹{stats.earnings}</strong>
            <span className="stats-trend positive">
              <TrendingUp size={12} />
              <span>Paid consultations</span>
            </span>
          </div>
        </div>

        <div className="stats-card glass-card">
          <div className="stats-icon-wrapper purple">
            <Stethoscope size={22} />
          </div>
          <div className="stats-info">
            <span className="stats-label">Active Services</span>
            <strong className="stats-value">{services.length}</strong>
            <span className="stats-subtext">Offered treatments</span>
          </div>
        </div>

      </div>

      {/* Main Section */}
      <div className="dashboard-sections-layout mt-6">
        {/* Today's Schedule */}
        <div className="today-schedule-section glass-card-static">
          <div className="section-header">
            <h3>Today's Schedule</h3>
            <Link to="/doctor/appointments" className="view-all-link">
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="no-appointments-today text-center">
              <CheckCircle size={32} className="success-check-icon" />
              <p>You have no active appointments scheduled for today. Take some rest!</p>
            </div>
          ) : (
            <div className="today-appointments-list">
              {todayAppointments.map((appt) => (
                <div key={appt._id} className="today-appointment-item">
                  <div className="appt-time-column">
                    <span className="appt-start-time">{formatTime(appt.startDateTime)}</span>
                    <span className="appt-duration">{appt.service?.duration || 15} min visit</span>
                  </div>
                  <div className="appt-divider-line"></div>
                  <div className="appt-details-column">
                    <h4>{appt.patient?.name || 'Patient'}</h4>
                    <span className="patient-age">Age: {appt.patient?.age || 'N/A'}</span>
                    <p className="appt-service-summary">{appt.service?.name}</p>
                  </div>
                  <div className="appt-badge-column">
                    <StatusBadge status={appt.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Menu Panel */}
        <div className="quick-actions-section glass-card-static">
          <h3>Quick Controls</h3>
          <p className="section-desc">Manage your availability slots and treatments dynamically.</p>

          <div className="controls-grid">
            <Link to="/doctor/availability" className="control-item-card glass-card">
              <Clock3 size={24} className="control-icon" />
              <h4>Clinic Hours</h4>
              <p>Add breaks, set overnight shifts or toggle unavailable days.</p>
            </Link>

            <Link to="/doctor/services" className="control-item-card glass-card">
              <Stethoscope size={24} className="control-icon" />
              <h4>Treatments</h4>
              <p>Update offered medical services, fees, and durations.</p>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DoctorDashboardPage;
