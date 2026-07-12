import { useState } from 'react';
import api from '../../services/api';
import { Calendar, Clock, Plus, Trash2, Save, Info, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import '../DoctorPages.css';

const AvailabilityPage = () => {
  const [date, setDate] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breaks, setBreaks] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleAddBreak = () => {
    setBreaks([...breaks, { startTime: '13:00', endTime: '14:00' }]);
  };

  const handleRemoveBreak = (idx) => {
    setBreaks(breaks.filter((_, i) => i !== idx));
  };

  const handleBreakTimeChange = (idx, field, value) => {
    const updated = [...breaks];
    updated[idx] = { ...updated[idx], [field]: value };
    setBreaks(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      toast.error('Please select a date');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date,
        isAvailable,
        ...(isAvailable && {
          startTime,
          endTime,
          breaks: breaks.map((b) => ({
            startTime: b.startTime,
            endTime: b.endTime,
          })),
        }),
      };

      const res = await api.post('/doctor/set-availability', payload);
      toast.success(res.data?.message || 'Availability slots set successfully!');
      
      // Reset if desired, or keep current
      setBreaks([]);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to configure availability');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="doctor-page availability-page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Manage Availability</h1>
        <p className="page-subtitle">Set your practice hours, overnight shifts, and breaks for specific dates</p>
      </div>

      <div className="availability-layout">
        
        {/* Form Container */}
        <form onSubmit={handleSubmit} className="availability-form-card glass-card-static">
          
          {/* Step 1: Select Date */}
          <div className="form-section">
            <h3 className="section-title">
              <Calendar size={18} />
              <span>Select Target Date</span>
            </h3>
            <div className="form-group mt-3">
              <label className="form-label" htmlFor="availability-date">Date</label>
              <input
                id="availability-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="form-divider"></div>

          {/* Step 2: Toggle Availability */}
          <div className="form-section">
            <div className="availability-toggle-row">
              <div>
                <h3 className="section-title">Toggle Clinic Availability</h3>
                <p className="section-desc mt-1">Check to mark yourself active. Uncheck to mark a holiday/leave.</p>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                />
                <span className="slider-round"></span>
              </label>
            </div>
          </div>

          {isAvailable && (
            <>
              <div className="form-divider"></div>

              {/* Step 3: Hours Selection */}
              <div className="form-section">
                <h3 className="section-title">
                  <Clock size={18} />
                  <span>Configure Shift Hours</span>
                </h3>
                <p className="section-desc mt-1">Specify your check-in and check-out times in 24-hour format.</p>
                
                <div className="form-row mt-4">
                  <div className="form-group">
                    <label className="form-label" htmlFor="shift-start">Start Time</label>
                    <input
                      id="shift-start"
                      type="time"
                      className="form-input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="shift-end">End Time</label>
                    <input
                      id="shift-end"
                      type="time"
                      className="form-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-divider"></div>

              {/* Step 4: Breaks Configuration */}
              <div className="form-section">
                <div className="section-header-row">
                  <div>
                    <h3 className="section-title">Configure Breaks (Optional)</h3>
                    <p className="section-desc mt-1">Add lunch, rounds, or rest windows. Breaks must fit inside shift hours.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBreak}
                    className="btn btn-secondary btn-sm"
                  >
                    <Plus size={14} />
                    <span>Add Break</span>
                  </button>
                </div>

                {breaks.length === 0 ? (
                  <div className="empty-breaks-box mt-3 text-center">
                    <Info size={16} />
                    <span>No breaks configured. You will consult continuously.</span>
                  </div>
                ) : (
                  <div className="breaks-list mt-3">
                    {breaks.map((br, idx) => (
                      <div key={idx} className="break-item-row animate-scale-in">
                        <div className="break-index">Break #{idx + 1}</div>
                        <div className="break-times">
                          <div className="form-group">
                            <label className="form-label">Starts</label>
                            <input
                              type="time"
                              className="form-input"
                              value={br.startTime}
                              onChange={(e) => handleBreakTimeChange(idx, 'startTime', e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Ends</label>
                            <input
                              type="time"
                              className="form-input"
                              value={br.endTime}
                              onChange={(e) => handleBreakTimeChange(idx, 'endTime', e.target.value)}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBreak(idx)}
                          className="btn btn-danger btn-icon btn-sm remove-break-btn"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!isAvailable && (
            <div className="leave-warning-banner mt-4">
              <AlertTriangle size={20} className="warning-icon" />
              <div>
                <h4>Unavailable Shift Settings</h4>
                <p>Checking this option will cancel/remove all available appointment slots on this date.</p>
              </div>
            </div>
          )}

          <div className="form-divider"></div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full submit-btn"
            disabled={submitting}
          >
            <Save size={18} />
            <span>{submitting ? 'Updating Slots...' : 'Generate Available Slots'}</span>
          </button>

        </form>

        {/* Info Panel Sidebar */}
        <div className="availability-info-sidebar">
          <div className="info-card glass-card-static">
            <h3>Availability Rules</h3>
            <ul>
              <li>
                <strong>Overnight Shifts:</strong> You can configure overnight shifts (e.g. 22:00 to 06:00).
              </li>
              <li>
                <strong>Break Validation:</strong> Breaks must reside fully within your start and end hours.
              </li>
              <li>
                <strong>Time Splits:</strong> Break times cannot overlap each other.
              </li>
              <li>
                <strong>Auto Slot Generation:</strong> Slot templates (e.g. 15 or 30-minute intervals) are generated automatically by the backend system based on your settings.
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AvailabilityPage;
