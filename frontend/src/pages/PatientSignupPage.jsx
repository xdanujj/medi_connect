import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Mail, Lock, User, Phone, AlertCircle, CheckCircle, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import './AuthPages.css';

const PatientSignupPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    age: '',
    gender: '',
  });
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

    if (!form.name || !form.email || !form.password || !form.phone || !form.age || !form.gender) {
      setError('Please fill in all fields');
      return;
    }

    if (!profilePhoto) {
      setError('Profile photo is required');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      formData.append('profilePhoto', profilePhoto);

      await api.post('/auth/signup/patient', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Account created successfully!');
      toast.success('Account created! Please login.');
      setTimeout(() => navigate('/login'), 1500);
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
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Sign up as a patient</p>
          </div>

          <div className="auth-role-tabs">
            <div className="auth-role-tab active">Patient</div>
            <Link to="/signup/doctor" className="auth-role-tab">Doctor</Link>
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
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="patient-name">Full Name</label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input id="patient-name" type="text" name="name" className="form-input" placeholder="John Doe" value={form.name} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="patient-email">Email</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input id="patient-email" type="email" name="email" className="form-input" placeholder="john@email.com" value={form.email} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="patient-password">Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input id="patient-password" type="password" name="password" className="form-input" placeholder="••••••••" value={form.password} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="patient-phone">Phone</label>
                <div className="input-with-icon">
                  <Phone size={16} className="input-icon" />
                  <input id="patient-phone" type="text" name="phone" className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="patient-age">Age</label>
                <input id="patient-age" type="number" name="age" className="form-input" placeholder="25" value={form.age} onChange={handleChange} min="1" max="120" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="patient-gender">Gender</label>
                <select id="patient-gender" name="gender" className="form-select" value={form.gender} onChange={handleChange}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="patient-photo">Profile Photo</label>
              <input
                id="patient-photo"
                type="file"
                accept="image/*"
                className="form-file-input"
                onChange={(e) => setProfilePhoto(e.target.files[0])}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
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

export default PatientSignupPage;
