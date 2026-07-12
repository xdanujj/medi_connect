import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-layout">
      <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            className="topbar-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="topbar-right">
            <div className="topbar-user">
              <div className="topbar-avatar">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="topbar-user-info">
                <span className="topbar-email">{user?.email}</span>
                <span className="topbar-role">{user?.role}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm topbar-logout">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
