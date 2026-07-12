import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PatientSignupPage from './pages/PatientSignupPage';
import DoctorSignupPage from './pages/DoctorSignupPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

// Patient pages
import DoctorsListPage from './pages/patient/DoctorsListPage';
import BookingPage from './pages/patient/BookingPage';
import PatientAppointmentsPage from './pages/patient/PatientAppointmentsPage';
import PatientPrescriptionsPage from './pages/patient/PatientPrescriptionsPage';

// Doctor pages
import DoctorDashboardPage from './pages/doctor/DoctorDashboardPage';
import AvailabilityPage from './pages/doctor/AvailabilityPage';
import ServicesPage from './pages/doctor/ServicesPage';
import DoctorAppointmentsPage from './pages/doctor/DoctorAppointmentsPage';
import ConsultationPage from './pages/doctor/ConsultationPage';
import DoctorPrescriptionsPage from './pages/doctor/DoctorPrescriptionsPage';

const App = () => {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111827',
            color: '#f1f5f9',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup/patient" element={<PatientSignupPage />} />
        <Route path="/signup/doctor" element={<DoctorSignupPage />} />

        {/* Patient Protected Routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/doctors" element={<DoctorsListPage />} />
          <Route path="/booking/:doctorId" element={<BookingPage />} />
          <Route path="/my-appointments" element={<PatientAppointmentsPage />} />
          <Route path="/my-prescriptions" element={<PatientPrescriptionsPage />} />
        </Route>

        {/* Doctor Protected Routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
          <Route path="/doctor/availability" element={<AvailabilityPage />} />
          <Route path="/doctor/services" element={<ServicesPage />} />
          <Route path="/doctor/appointments" element={<DoctorAppointmentsPage />} />
          <Route path="/doctor/consultation/:appointmentId" element={<ConsultationPage />} />
          <Route path="/doctor/prescriptions" element={<DoctorPrescriptionsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;