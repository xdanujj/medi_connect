import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  Shield,
  Clock,
  CreditCard,
  Stethoscope,
  CalendarCheck,
  Users,
  ArrowRight,
  Star,
  Zap,
} from 'lucide-react';
import './LandingPage.css';

const features = [
  {
    icon: Stethoscope,
    title: 'Verified Doctors',
    description: 'Every doctor is admin-verified with license checks before they can accept appointments.',
  },
  {
    icon: Clock,
    title: 'Real-Time Slots',
    description: 'See live availability and book instantly. Smart slot locking prevents double bookings.',
  },
  {
    icon: CreditCard,
    title: 'Secure Payments',
    description: 'Pay via Razorpay with UPI, cards, or net banking. Signature-verified transactions.',
  },
  {
    icon: Shield,
    title: 'Data Privacy',
    description: 'JWT-based authentication with refresh tokens. Your health data stays protected.',
  },
  {
    icon: CalendarCheck,
    title: 'Smart Scheduling',
    description: 'Doctors set flexible availability with breaks. Auto-generated 15-minute slots.',
  },
  {
    icon: Users,
    title: 'For Everyone',
    description: 'Separate dashboards for patients and doctors, each tailored to their workflow.',
  },
];

const stats = [
  { value: '50+', label: 'Specializations' },
  { value: '24/7', label: 'Online Booking' },
  { value: '100%', label: 'Verified Doctors' },
  { value: '₹0', label: 'Platform Fee' },
];

const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();

  const dashboardLink = user?.role === 'doctor' ? '/doctor/dashboard' : '/doctors';

  return (
    <div className="landing-page">
      <Navbar />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg-effects">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
        </div>

        <div className="hero-content animate-fade-in-up">
          <div className="hero-badge">
            <Zap size={14} />
            <span>Now with instant slot booking</span>
          </div>

          <h1 className="hero-title">
            Your Health,
            <br />
            <span className="hero-title-accent">One Click Away</span>
          </h1>

          <p className="hero-subtitle">
            Find verified doctors, pick a time that works, and book your appointment 
            in seconds — with secure online payments.
          </p>

          <div className="hero-actions">
            {isAuthenticated ? (
              <Link to={dashboardLink} className="btn btn-primary btn-lg">
                Go to Dashboard
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link to="/signup/patient" className="btn btn-primary btn-lg">
                  Book Appointment
                  <ArrowRight size={18} />
                </Link>
                <Link to="/signup/doctor" className="btn btn-secondary btn-lg">
                  Join as Doctor
                </Link>
              </>
            )}
          </div>

          <div className="hero-stats stagger-children">
            {stats.map((stat, i) => (
              <div key={i} className="hero-stat">
                <span className="hero-stat-value">{stat.value}</span>
                <span className="hero-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-header animate-fade-in-up">
          <h2 className="features-title">Why MediConnect?</h2>
          <p className="features-subtitle">
            Everything you need for a seamless healthcare experience
          </p>
        </div>

        <div className="features-grid stagger-children">
          {features.map((feature, i) => (
            <div key={i} className="feature-card glass-card">
              <div className="feature-icon">
                <feature.icon size={24} />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-card glass-card-static animate-fade-in-up">
          <div className="cta-content">
            <h2 className="cta-title">Ready to get started?</h2>
            <p className="cta-text">
              Join thousands of patients who trust MediConnect for their healthcare needs.
            </p>
            <div className="cta-actions">
              <Link to="/signup/patient" className="btn btn-primary btn-lg">
                Create Free Account
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 MediConnect. Built with ❤️ for better healthcare.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
