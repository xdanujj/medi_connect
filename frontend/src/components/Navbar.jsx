import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X, Heart } from 'lucide-react';
import { useState } from 'react';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo">
            <Heart size={22} />
          </div>
          <span className="navbar-brand-text">MediConnect</span>
        </Link>

        <button
          className="navbar-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className={`navbar-links ${mobileOpen ? 'open' : ''}`}>
          {!isAuthenticated ? (
            <>
              <Link
                to="/login"
                className={`navbar-link ${isActive('/login') ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/signup/patient"
                className="btn btn-primary btn-sm"
                onClick={() => setMobileOpen(false)}
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              <div className="navbar-user">
                <div className="navbar-user-avatar">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="navbar-user-info">
                  <span className="navbar-user-email">{user?.email}</span>
                  <span className="navbar-user-role">{user?.role}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm navbar-logout">
                <LogOut size={16} />
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
