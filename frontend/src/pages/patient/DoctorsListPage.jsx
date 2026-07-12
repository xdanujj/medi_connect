import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Search, MapPin, Calendar, Heart, Shield, Award, Sparkles, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import '../PatientPages.css';

const SPECIALIZATIONS = [
  'All Specializations',
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'Orthopedic',
  'Neurologist',
  'Psychiatrist',
  'ENT Specialist',
  'Gynecologist',
  'Dentist',
  'Ophthalmologist',
  'Other',
];

const DoctorsListPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('All Specializations');
  const [cityFilter, setCityFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const res = await api.get('/appointment/verified-doctors');
        setDoctors(res.data?.data || []);
      } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to load doctors');
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const handleBook = (doctorId) => {
    navigate(`/booking/${doctorId}`);
  };

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch =
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialization =
      selectedSpecialization === 'All Specializations' ||
      doctor.specialization === selectedSpecialization;
    const matchesCity =
      !cityFilter ||
      doctor.clinic?.location?.city?.toLowerCase().includes(cityFilter.toLowerCase());

    return matchesSearch && matchesSpecialization && matchesCity;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  return (
    <div className="patient-page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Find Your Doctor</h1>
        <p className="page-subtitle">Search from our verified medical professionals and book instantly</p>
      </div>

      {/* Filter Bar */}
      <div className="filters-card glass-card-static">
        <div className="filter-item search-input-wrapper">
          <Search size={18} className="filter-icon" />
          <input
            type="text"
            placeholder="Search by doctor name or specialization..."
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group-row">
          <div className="filter-item">
            <Filter size={18} className="filter-icon" />
            <select
              className="form-select"
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
            >
              {SPECIALIZATIONS.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <MapPin size={18} className="filter-icon" />
            <input
              type="text"
              placeholder="Filter by city..."
              className="form-input"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div className="doctors-loading-grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="doctor-card skeleton-card">
              <div className="skeleton skeleton-avatar"></div>
              <div className="skeleton skeleton-title"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text short"></div>
            </div>
          ))}
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="empty-state glass-card-static text-center">
          <Heart size={48} className="empty-icon" />
          <h3>No Available Doctors</h3>
          <p>We couldn't find any verified doctors matching your criteria at this moment.</p>
        </div>
      ) : (
        <div className="doctors-grid stagger-children">
          {filteredDoctors.map((doctor) => (
            <div key={doctor._id} className="doctor-card glass-card">
              <div className="doctor-card-header">
                <div className="doctor-avatar-container">
                  {doctor.profilePhoto ? (
                    <img
                      src={doctor.profilePhoto}
                      alt={doctor.name}
                      className="doctor-avatar"
                      onError={(e) => {
                        e.target.src = 'https://cdn-icons-png.flaticon.com/512/387/387561.png';
                      }}
                    />
                  ) : (
                    <div className="doctor-avatar-placeholder">
                      {doctor.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="verified-badge">
                    <Shield size={12} />
                  </span>
                </div>
                <div className="doctor-meta">
                  <h3 className="doctor-name">Dr. {doctor.name}</h3>
                  <span className="doctor-specialty-badge">{doctor.specialization}</span>
                </div>
              </div>

              <div className="doctor-card-body">
                <p className="doctor-desc">{doctor.description || 'No description provided.'}</p>
                
                <div className="doctor-info-list">
                  <div className="doctor-info-item">
                    <MapPin size={16} />
                    <span>
                      {doctor.clinic?.name}, {doctor.clinic?.location?.city}
                    </span>
                  </div>
                  <div className="doctor-info-item">
                    <Award size={16} />
                    <span>
                      Starting from <strong>₹{doctor.startingFee || 'N/A'}</strong>
                    </span>
                  </div>
                  <div className="doctor-info-item">
                    <Calendar size={16} />
                    <span>
                      Next slot: <strong className="next-slot-time">{formatDate(doctor.nextAvailableSlot)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="doctor-card-footer">
                <div className="slots-badge-container">
                  <Sparkles size={14} className="spark-icon" />
                  <span>{doctor.availableSlotsCount} slots left</span>
                </div>
                <button onClick={() => handleBook(doctor._id)} className="btn btn-primary btn-sm">
                  Book Appointment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorsListPage;
