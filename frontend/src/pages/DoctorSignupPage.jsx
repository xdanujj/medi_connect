import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Mail, Lock, User, Phone, AlertCircle, CheckCircle, Heart, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import './AuthPages.css';

const SPECIALIZATIONS = [
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

const DoctorSignupPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    number: '',
    description: '',
    specialization: '',
    clinicName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
  });

  const [licensePdf, setLicensePdf] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name || !form.email || !form.password || !form.number || !form.specialization || !form.clinicName) {
      setError('Please fill in all required fields');
      return;
    }

    if (!licensePdf) {
      setError('Medical license PDF is required');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      formData.append('licensePdf', licensePdf);
      if (profilePhoto) formData.append('profilePhoto', profilePhoto);

      await api.post('/auth/signup/doctor', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Registration submitted! Awaiting admin approval.');
      toast.success('Registration submitted! Please wait for admin approval.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Navbar />

      <div className="auth-container">
        <div className="auth-bg-effects">
          <div className="auth-orb auth-orb-1"></div>
          <div className="auth-orb auth-orb-2"></div>
        </div>

        <div className="auth-card wide glass-card-static animate-scale-in">
          <div className="auth-header">
            <div className="auth-logo">
              <Heart size={24} />
            </div>
            <h1 className="auth-title">Doctor Registration</h1>
            <p className="auth-subtitle">Join MediConnect as a verified doctor</p>
          </div>

          <div className="auth-role-tabs">
            <Link to="/signup/patient" className="auth-role-tab">Patient</Link>
            <div className="auth-role-tab active">Doctor</div>
          </div>

          {error && (
            <div className="auth-error animate-fade-in">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-success animate-fade-in">
              <CheckCircle size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Personal Info */}
            <p className="form-section-title">Personal Information</p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="doc-name">Full Name *</label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input id="doc-name" type="text" name="name" className="form-input" placeholder="Dr. Jane Smith" value={form.name} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="doc-email">Email *</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input id="doc-email" type="email" name="email" className="form-input" placeholder="doctor@hospital.com" value={form.email} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="doc-password">Password *</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input id="doc-password" type="password" name="password" className="form-input" placeholder="••••••••" value={form.password} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="doc-number">Phone Number *</label>
                <div className="input-with-icon">
                  <Phone size={16} className="input-icon" />
                  <input id="doc-number" type="text" name="number" className="form-input" placeholder="9876543210" value={form.number} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="doc-spec">Specialization *</label>
                <select id="doc-spec" name="specialization" className="form-select" value={form.specialization} onChange={handleChange}>
                  <option value="">Select specialization</option>
                  {SPECIALIZATIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="doc-desc">Description</label>
                <input id="doc-desc" type="text" name="description" className="form-input" placeholder="Brief about yourself" value={form.description} onChange={handleChange} />
              </div>
            </div>

            {/* Clinic Info */}
            <p className="form-section-title">Clinic Information</p>

            <div className="form-group">
              <label className="form-label" htmlFor="doc-clinic">Clinic Name *</label>
              <input id="doc-clinic" type="text" name="clinicName" className="form-input" placeholder="HealthCare Clinic" value={form.clinicName} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="doc-address">Address</label>
              <div className="input-with-icon">
                <MapPin size={16} className="input-icon" />
                <input id="doc-address" type="text" name="address" className="form-input" placeholder="123 Medical Street" value={form.address} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="doc-city">City</label>
                <input id="doc-city" type="text" name="city" className="form-input" placeholder="Mumbai" value={form.city} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="doc-state">State</label>
                <input id="doc-state" type="text" name="state" className="form-input" placeholder="Maharashtra" value={form.state} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="doc-pincode">Pincode</label>
              <input id="doc-pincode" type="text" name="pincode" className="form-input" placeholder="400001" value={form.pincode} onChange={handleChange} />
            </div>

            {/* Documents */}
            <p className="form-section-title">Documents</p>

            <div className="form-group">
              <label className="form-label" htmlFor="doc-license">Medical License (PDF) *</label>
              <input
                id="doc-license"
                type="file"
                accept=".pdf"
                className="form-file-input"
                onChange={(e) => setLicensePdf(e.target.files[0])}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="doc-photo">Profile Photo (optional)</label>
              <input
                id="doc-photo"
                type="file"
                accept="image/*"
                className="form-file-input"
                onChange={(e) => setProfilePhoto(e.target.files[0])}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorSignupPage;
