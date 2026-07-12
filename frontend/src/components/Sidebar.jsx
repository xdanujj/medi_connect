import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Stethoscope,
  Users,
  CalendarCheck,
  Heart,
} from 'lucide-react';
import './Sidebar.css';

const patientLinks = [
  { to: '/doctors', icon: Users, label: 'Find Doctors' },
  { to: '/my-appointments', icon: CalendarCheck, label: 'My Appointments' },
];

const doctorLinks = [
  { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/doctor/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/doctor/availability', icon: Clock, label: 'Availability' },
  { to: '/doctor/services', icon: Stethoscope, label: 'Services' },
];

const Sidebar = () => {
  const { user } = useAuth();
  const links = user?.role === 'doctor' ? doctorLinks : patientLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Heart size={20} />
        </div>
        <span className="sidebar-brand">MediConnect</span>
      </div>

      <nav className="sidebar-nav">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-role-badge">
          {user?.role === 'doctor' ? '🩺 Doctor' : '🧑 Patient'} Panel
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
