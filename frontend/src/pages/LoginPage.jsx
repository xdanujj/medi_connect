import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Mail, Lock, AlertCircle, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import './AuthPages.css';

const LoginPage = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }

    const result = await login(form.email, form.password);

    if (result.success) {
      toast.success('Welcome back!');
      const role = result.user?.role;
      navigate(role === 'doctor' ? '/doctor/dashboard' : '/doctors');
    } else {
      if (result.data?.approved === false) {
        setError('Your profile is under verification. Please wait for admin approval.');
      } else {
        setError(result.message);
      }
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

        <div className="auth-card glass-card-static animate-scale-in">
          <div className="auth-header">
            <div className="auth-logo">
              <Heart size={24} />
            </div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your MediConnect account</p>
          </div>

          {error && (
            <div className="auth-error animate-fade-in">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="doctor@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/signup/patient">Sign up as Patient</Link>
              {' or '}
              <Link to="/signup/doctor">as Doctor</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
