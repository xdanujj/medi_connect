import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to their appropriate dashboard
    const redirectPath = user?.role === 'doctor' ? '/doctor/dashboard' : '/doctors';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
