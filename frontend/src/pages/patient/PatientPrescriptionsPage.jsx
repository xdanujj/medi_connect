import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FileText, Download, Calendar, User, Search, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import '../PatientPages.css';
import '../ConsultationPages.css';

const PatientPrescriptionsPage = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewPdfUrl, setViewPdfUrl] = useState(null);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setLoading(true);
        const res = await api.get('/patient/prescriptions');
        setPrescriptions(res.data?.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load your prescriptions');
      } finally {
        setLoading(false);
      }
    };
    fetchPrescriptions();
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const doctorName = rx.doctor?.name || '';
    const diagnosis = rx.verifiedData?.diagnosis || '';
    return (
      doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="patient-page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Prescriptions</h1>
        <p className="page-subtitle">Access, view, and download all digital prescriptions issued to you</p>
      </div>

      {/* Search Bar */}
      <div className="form-group mb-8 w-full" style={{ maxWidth: '400px' }}>
        <div className="input-with-adornment">
          <Search size={16} className="input-adornment-icon" />
          <input
            type="text"
            className="form-input adornment-left"
            placeholder="Search by doctor name or diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center mt-8">
          <div className="spinner-large"></div>
          <p className="mt-4">Loading prescriptions...</p>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="empty-state glass-card-static text-center">
          <FileText size={48} className="empty-icon" />
          <h3>No Prescriptions Found</h3>
          <p>
            {searchQuery
              ? "No prescriptions match your search query."
              : "No digital prescriptions have been issued to you yet."}
          </p>
        </div>
      ) : (
        <div className="prescriptions-list stagger-children">
          {filteredPrescriptions.map((rx) => {
            const doctorName = rx.doctor?.name ? `Dr. ${rx.doctor.name}` : 'Doctor';
            const diagnosis = rx.verifiedData?.diagnosis || 'General Consultation';
            return (
              <div key={rx._id} className="prescription-card glass-card">
                <div className="rx-icon-col">
                  <FileText size={20} />
                </div>
                <div className="rx-main-info">
                  <h3 className="rx-patient-name">{doctorName}</h3>
                  <p className="rx-diagnosis">Diagnosis: {diagnosis}</p>
                  <span className="rx-date">
                    <Calendar size={12} />
                    {formatDate(rx.generatedAt || rx.createdAt)}
                  </span>
                </div>
                <div className="rx-actions">
                  {rx.pdfUrl && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setViewPdfUrl(rx.pdfUrl)}
                      >
                        <Eye size={14} /> View
                      </button>
                      <a
                        href={rx.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                      >
                        <Download size={14} /> Download
                      </a>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF View Modal */}
      {viewPdfUrl && (
        <div className="pdf-modal-overlay" onClick={() => setViewPdfUrl(null)}>
          <div className="pdf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-modal-header">
              <h3>Prescription PDF Preview</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewPdfUrl(null)}>
                Close
              </button>
            </div>
            <iframe
              src={`${viewPdfUrl}#toolbar=0`}
              title="Prescription PDF Preview"
              className="pdf-viewer-frame"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientPrescriptionsPage;
