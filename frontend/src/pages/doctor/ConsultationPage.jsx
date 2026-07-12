import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Mic, MicOff, CheckCircle, FileText, Plus, Trash2,
  ArrowRight, Download, RotateCcw, Stethoscope, Pill,
  ClipboardList, User, FlaskConical, Calendar, MessageSquare,
} from 'lucide-react';
import '../ConsultationPages.css';
import '../DoctorPages.css';

const STEPS = ['Record', 'Transcript', 'Review', 'Done'];

const emptyMedicine = () => ({ name: '', dosage: '', frequency: '', duration: '' });

const defaultForm = () => ({
  patientName: '',
  age: '',
  gender: '',
  chiefComplaint: '',
  diagnosis: '',
  medicalHistory: '',
  medicines: [emptyMedicine()],
  tests: '',
  advice: '',
  followUpDate: '',
  actions: '',
  additionalNotes: '',
});

const ConsultationPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0=Record 1=Transcript 2=Form 3=Done
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [translatedTranscript, setTranslatedTranscript] = useState('');
  const [formData, setFormData] = useState(defaultForm());
  const [prescription, setPrescription] = useState(null);
  const [loadingTranscribe, setLoadingTranscribe] = useState(false);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const formatTimer = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // ── Start Recording ──
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecording(true);
      setTimer(0);
    } catch {
      toast.error('Microphone access denied. Please allow microphone permission.');
    }
  }, []);

  // ── Stop Recording & Transcribe ──
  const stopRecordingAndTranscribe = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());

      setStep(1);
      setLoadingTranscribe(true);
      try {
        const formDataObj = new FormData();
        formDataObj.append('audio', audioBlob, 'recording.webm');
        const res = await api.post('/doctor/consultation/transcribe', formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setTranscript(res.data.data.transcript);
        setTranslatedTranscript(res.data.data.translatedTranscript);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Transcription failed');
        setStep(0);
      } finally {
        setLoadingTranscribe(false);
      }
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }, []);

  // ── Extract Medical Data ──
  const handleExtract = async () => {
    setLoadingExtract(true);
    try {
      const res = await api.post('/doctor/consultation/extract', { translatedTranscript });
      const extracted = res.data.data;
      setFormData({
        patientName: extracted.patientName || '',
        age: extracted.age || '',
        gender: extracted.gender || '',
        chiefComplaint: extracted.chiefComplaint || '',
        diagnosis: extracted.diagnosis || '',
        medicalHistory: extracted.medicalHistory || '',
        medicines: extracted.medicines?.length ? extracted.medicines : [emptyMedicine()],
        tests: extracted.tests || '',
        advice: extracted.advice || '',
        followUpDate: extracted.followUpDate || '',
        actions: extracted.actions || '',
        additionalNotes: extracted.additionalNotes || '',
      });
      setStep(2);
      toast.success('Medical data extracted! Review and confirm below.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Extraction failed');
    } finally {
      setLoadingExtract(false);
    }
  };

  // ── Form Field Handlers ──
  const handleField = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleMedicine = (index, field, value) =>
    setFormData((prev) => {
      const meds = [...prev.medicines];
      meds[index] = { ...meds[index], [field]: value };
      return { ...prev, medicines: meds };
    });

  const addMedicine = () =>
    setFormData((prev) => ({ ...prev, medicines: [...prev.medicines, emptyMedicine()] }));

  const removeMedicine = (index) =>
    setFormData((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index),
    }));

  // ── Generate Prescription ──
  const handleGeneratePrescription = async () => {
    setLoadingGenerate(true);
    try {
      const res = await api.post('/doctor/consultation/generate-prescription', {
        appointmentId,
        transcript,
        translatedTranscript,
        verifiedData: formData,
      });
      setPrescription(res.data.data);
      setStep(3);
      toast.success('Prescription generated & sent to patient!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate prescription');
    } finally {
      setLoadingGenerate(false);
    }
  };

  return (
    <div className="consultation-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Consultation Workspace</h1>
        <p className="page-subtitle">
          Record the consultation, review the AI-extracted prescription, and generate the PDF.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="consultation-steps glass-card-static" style={{ padding: 'var(--space-5) var(--space-6)', marginBottom: 'var(--space-8)' }}>
        {STEPS.map((label, idx) => (
          <div
            key={label}
            className={`step-item${step === idx ? ' active' : ''}${step > idx ? ' completed' : ''}`}
          >
            <div className="step-dot">
              {step > idx ? <CheckCircle size={16} /> : idx + 1}
            </div>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ── STEP 0: RECORD ── */}
      {step === 0 && (
        <div className="recording-panel">
          <div className="recording-info">
            <h2>Ready to Record</h2>
            <p>
              Press the microphone and speak naturally. Sarvam AI will auto-detect the language
              and transcribe the consultation.
            </p>
          </div>

          <div className="mic-button-wrapper">
            {isRecording && (
              <>
                <div className="mic-pulse-ring" />
                <div className="mic-pulse-ring" />
                <div className="mic-pulse-ring" />
              </>
            )}
            <button
              className={`mic-button${isRecording ? ' recording' : ''}`}
              onClick={isRecording ? undefined : startRecording}
              title={isRecording ? 'Recording…' : 'Start Recording'}
            >
              {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
            </button>
          </div>

          {isRecording ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div className="recording-label">
                <span className="rec-dot" /> Recording
              </div>
              <div className="recording-timer">{formatTimer(timer)}</div>
              <button
                className="btn btn-danger"
                onClick={stopRecordingAndTranscribe}
              >
                <MicOff size={16} /> Stop & Transcribe
              </button>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
              Click the mic to begin
            </p>
          )}
        </div>
      )}

      {/* ── STEP 1: TRANSCRIPT ── */}
      {step === 1 && (
        <div className="transcript-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
              Consultation Transcript
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep(0)}>
              <RotateCcw size={14} /> Re-record
            </button>
          </div>

          {loadingTranscribe ? (
            <div className="text-center mt-8" style={{ padding: 'var(--space-12) 0' }}>
              <div className="spinner-large" />
              <p className="mt-4">Transcribing audio via Sarvam AI…</p>
            </div>
          ) : (
            <>
              <div className="transcript-columns">
                <div className="transcript-col">
                  <h4>🎙️ Original Language</h4>
                  <div className="transcript-text-box">{transcript || 'No transcript received.'}</div>
                </div>
                <div className="transcript-col">
                  <h4>🌐 English Translation</h4>
                  <div className="transcript-text-box">{translatedTranscript || 'Translation unavailable.'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleExtract}
                  disabled={loadingExtract || !translatedTranscript}
                >
                  {loadingExtract ? (
                    'Extracting data…'
                  ) : (
                    <><ArrowRight size={16} /> Extract Medical Data</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STEP 2: PRESCRIPTION FORM ── */}
      {step === 2 && (
        <>
          <div className="prescription-form-panel">
            <h3>
              <ClipboardList size={18} style={{ display: 'inline', marginRight: 8, color: 'var(--accent-primary-light)' }} />
              Prescription Details
            </h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              All fields have been pre-filled by AI from the consultation transcript. Review, edit, and confirm before generating.
            </p>

            {/* Patient Info */}
            <div className="form-section-title"><User size={13} /> Patient Information</div>
            <div className="prescription-3col">
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input className="form-input" value={formData.patientName} onChange={(e) => handleField('patientName', e.target.value)} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input className="form-input" value={formData.age} onChange={(e) => handleField('age', e.target.value)} placeholder="e.g. 35 years" />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-select" value={formData.gender} onChange={(e) => handleField('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Clinical */}
            <div className="form-section-title"><Stethoscope size={13} /> Clinical Details</div>
            <div className="form-group mb-4">
              <label className="form-label">Chief Complaint / Symptoms</label>
              <textarea className="form-textarea" value={formData.chiefComplaint} onChange={(e) => handleField('chiefComplaint', e.target.value)} placeholder="Primary symptoms reported by patient" />
            </div>
            <div className="form-group mb-4">
              <label className="form-label">Diagnosis</label>
              <textarea className="form-textarea" value={formData.diagnosis} onChange={(e) => handleField('diagnosis', e.target.value)} placeholder="Clinical diagnosis" />
            </div>
            <div className="form-group">
              <label className="form-label">Medical History</label>
              <textarea className="form-textarea" value={formData.medicalHistory} onChange={(e) => handleField('medicalHistory', e.target.value)} placeholder="Relevant past medical history" />
            </div>

            {/* Medicines */}
            <div className="form-section-title"><Pill size={13} /> Medicines Prescribed</div>
            <div className="medicines-list">
              {formData.medicines.map((med, i) => (
                <div key={i} className="medicine-row">
                  <div className="medicine-row-num">Medicine {i + 1}</div>
                  <div className="form-group">
                    <label className="form-label">Medicine Name</label>
                    <input className="form-input" value={med.name} onChange={(e) => handleMedicine(i, 'name', e.target.value)} placeholder="e.g. Paracetamol 500mg" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dosage</label>
                    <input className="form-input" value={med.dosage} onChange={(e) => handleMedicine(i, 'dosage', e.target.value)} placeholder="e.g. 1 tablet" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Frequency</label>
                    <input className="form-input" value={med.frequency} onChange={(e) => handleMedicine(i, 'frequency', e.target.value)} placeholder="e.g. Twice daily" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <input className="form-input" value={med.duration} onChange={(e) => handleMedicine(i, 'duration', e.target.value)} placeholder="e.g. 5 days" />
                  </div>
                  <button className="remove-med-btn" onClick={() => removeMedicine(i)} title="Remove">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button className="add-medicine-btn" onClick={addMedicine}>
                <Plus size={15} /> Add Medicine
              </button>
            </div>

            {/* Tests & Advice */}
            <div className="form-section-title"><FlaskConical size={13} /> Tests & Advice</div>
            <div className="form-group mb-4">
              <label className="form-label">Tests Recommended</label>
              <textarea className="form-textarea" value={formData.tests} onChange={(e) => handleField('tests', e.target.value)} placeholder="e.g. CBC, Blood sugar, X-Ray" />
            </div>
            <div className="form-group mb-4">
              <label className="form-label">Advice / Precautions</label>
              <textarea className="form-textarea" value={formData.advice} onChange={(e) => handleField('advice', e.target.value)} placeholder="Dietary advice, rest, etc." />
            </div>
            <div className="form-group mb-4">
              <label className="form-label">Actions to be Taken</label>
              <textarea className="form-textarea" value={formData.actions} onChange={(e) => handleField('actions', e.target.value)} placeholder="Specific actions for the patient" />
            </div>

            {/* Follow-up */}
            <div className="form-section-title"><Calendar size={13} /> Follow-up</div>
            <div className="prescription-3col">
              <div className="form-group">
                <label className="form-label">Follow-up Date</label>
                <input className="form-input" value={formData.followUpDate} onChange={(e) => handleField('followUpDate', e.target.value)} placeholder="e.g. After 7 days" />
              </div>
            </div>

            {/* Additional Notes */}
            <div className="form-section-title"><MessageSquare size={13} /> Additional Notes</div>
            <div className="form-group">
              <label className="form-label">Additional Notes</label>
              <textarea className="form-textarea" style={{ minHeight: 80 }} value={formData.additionalNotes} onChange={(e) => handleField('additionalNotes', e.target.value)} placeholder="Any extra notes for the patient" />
            </div>
          </div>

          <div className="generate-action-bar">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              ← Back to Transcript
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleGeneratePrescription}
              disabled={loadingGenerate}
            >
              <FileText size={18} />
              {loadingGenerate ? 'Generating PDF…' : 'Generate Prescription'}
            </button>
          </div>
        </>
      )}

      {/* ── STEP 3: SUCCESS ── */}
      {step === 3 && prescription && (
        <div className="prescription-success-screen">
          <div className="success-icon-wrapper">
            <CheckCircle size={40} />
          </div>
          <div className="success-info">
            <h2>Prescription Generated!</h2>
            <p>
              The prescription PDF has been saved and the patient has been notified via push notification.
            </p>
          </div>
          <div className="success-actions">
            {prescription.pdfUrl && (
              <a
                href={prescription.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <Download size={16} /> Download PDF
              </a>
            )}
            <button className="btn btn-secondary" onClick={() => navigate('/doctor/prescriptions')}>
              <FileText size={16} /> My Prescriptions
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/doctor/appointments')}>
              Back to Appointments
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationPage;
