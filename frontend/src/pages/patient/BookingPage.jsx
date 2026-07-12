import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Clock3,
  Heart,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import '../PatientPages.css';

const BookingPage = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockExpiry, setLockExpiry] = useState(null);
  const [timerText, setTimerText] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    const fetchSlotsAndServices = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/appointment/doctor/${doctorId}/slots`);
        setData(res.data?.data || null);
      } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to load doctor slots and services');
        navigate('/doctors');
      } finally {
        setLoading(false);
      }
    };
    fetchSlotsAndServices();
  }, [doctorId, navigate]);

  // Handle countdown timer for slot lock
  useEffect(() => {
    if (isLocked && lockExpiry) {
      const updateTimer = () => {
        const expiry = new Date(lockExpiry).getTime();
        const now = new Date().getTime();
        const diff = expiry - now;

        if (diff <= 0) {
          clearInterval(timerRef.current);
          setIsLocked(false);
          setLockExpiry(null);
          setSelectedSlot(null);
          setTimerText('');
          toast.error('Slot hold expired. Please select a slot again.');
          return;
        }

        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimerText(
          `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerText('');
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLocked, lockExpiry]);

  if (loading) {
    return (
      <div className="patient-page text-center">
        <div className="spinner-large"></div>
        <p className="mt-4">Loading details, slots, and services...</p>
      </div>
    );
  }

  if (!data) return null;

  const { doctor, services, slots } = data;

  // Group slots by date
  const groupedSlots = slots.reduce((groups, slot) => {
    const dateObj = new Date(slot.startDateTime);
    const dateStr = dateObj.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(slot);
    return groups;
  }, {});

  const toggleService = (serviceId) => {
    if (isLocked) {
      toast.error('Release your selected slot first or wait for the timer to expire to edit services.');
      return;
    }
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const selectedServicesObjects = services.filter((s) => selectedServices.includes(s._id));
  const total = selectedServicesObjects.reduce((sum, s) => sum + s.price, 0);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleHoldSlot = async (slot) => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service before choosing a slot.');
      return;
    }

    try {
      setBookingLoading(true);
      const res = await api.post('/appointment/hold', { slotId: slot._id });
      const holdData = res.data?.data;
      setSelectedSlot(slot);
      setIsLocked(true);
      setLockExpiry(holdData.lockExpiry);
      toast.success('Slot held for booking!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Slot is no longer available. Please select another slot.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleReleaseSlot = () => {
    setIsLocked(false);
    setLockExpiry(null);
    setSelectedSlot(null);
    setTimerText('');
    toast.success('Slot released. You can now change your selection.');
  };

  const handleBook = async () => {
    if (!selectedSlot) return toast.error('Select a slot');
    if (selectedServices.length === 0) return toast.error('Select at least one service');

    setBookingLoading(true);

    try {
      // 1. Create order on server
      const orderRes = await api.post('/appointment/create-order', { amount: total });
      const orderData = orderRes.data?.data;

      // 2. Load Razorpay script
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        setBookingLoading(false);
        return toast.error('Razorpay SDK failed to load. Are you offline?');
      }

      // 3. Open Checkout dialog
      const options = {
        key: 'rzp_test_T20QmFyXwp89m3', // Test Razorpay Key ID
        amount: orderData.amount,
        currency: 'INR',
        name: 'MediConnect',
        description: `Consultation with Dr. ${doctor.name}`,
        order_id: orderData.id,
        handler: async (response) => {
          try {
            setBookingLoading(true);
            const confirmRes = await api.post('/appointment/confirm-booking', {
              slotId: selectedSlot._id,
              serviceIds: selectedServices,
              amount: total,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentMethod: 'card',
            });

            toast.success('Appointment booked successfully!');
            navigate('/my-appointments');
          } catch (confirmErr) {
            console.error(confirmErr);
            toast.error(confirmErr.response?.data?.message || 'Payment confirmed but slot booking failed.');
          } finally {
            setBookingLoading(false);
          }
        },
        prefill: {
          name: 'Patient User',
        },
        theme: {
          color: '#06b6d4',
        },
        modal: {
          ondismiss: () => {
            setBookingLoading(false);
            toast.error('Booking checkout cancelled.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to initialize payment.');
      setBookingLoading(false);
    }
  };

  const formatSlotTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  };

  return (
    <div className="patient-page booking-page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Book an Appointment</h1>
        <p className="page-subtitle">Select services, choose a time slot, and finalize your booking securely.</p>
      </div>

      <div className="booking-layout">
        {/* Left Side: Services & Slots */}
        <div className="booking-main-content">

          {/* Doctor Overview */}
          <div className="doctor-profile-hero glass-card-static">
            <div className="doctor-avatar-container">
              {doctor.profilePhoto ? (
                <img
                  src={doctor.profilePhoto}
                  alt={doctor.name}
                  className="doctor-avatar"
                  onError={(e) => {
                    e.target.src = 'https://cdn-icons-png.flaticon.com/512/387/387561.png';
                  }}
                />
              ) : (
                <div className="doctor-avatar-placeholder">
                  {doctor.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="doctor-meta">
              <h2>Dr. {doctor.name}</h2>
              <span className="doctor-specialty-badge">{doctor.specialization}</span>
              <div className="doctor-clinic-details">
                <MapPin size={16} />
                <span>{doctor.clinic?.name} — {doctor.clinic?.location?.address || doctor.clinic?.location?.city}</span>
              </div>
            </div>
          </div>

          {/* Services Section */}
          <div className="section-card glass-card-static mt-6">
            <h3 className="section-title">1. Select Consultation & Services</h3>
            <p className="section-subtitle">Choose one or more medical services required for this visit.</p>

            {services.length === 0 ? (
              <p className="no-items">No services defined by the doctor yet.</p>
            ) : (
              <div className="services-list-container">
                {services.map((service) => (
                  <div
                    key={service._id}
                    className={`service-item-row ${selectedServices.includes(service._id) ? 'selected' : ''}`}
                    onClick={() => toggleService(service._id)}
                  >
                    <div className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service._id)}
                        onChange={() => { }} // handled by row click
                        disabled={isLocked}
                      />
                    </div>
                    <div className="service-details">
                      <h4>{service.name}</h4>
                      {service.description && <p>{service.description}</p>}
                      <div className="service-sub-meta">
                        {service.duration && (
                          <span className="service-duration">
                            <Clock3 size={12} /> {service.duration} mins
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="service-price">₹{service.price}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Slots Section */}
          <div className="section-card glass-card-static mt-6">
            <h3 className="section-title">2. Select Time Slot</h3>
            <p className="section-subtitle">Select an available appointment slot. This will hold the slot for 10 minutes while you complete payment.</p>

            {isLocked ? (
              <div className="slot-held-banner glass-card-static animate-scale-in">
                <div className="held-info">
                  <ShieldCheck size={24} className="success-icon" />
                  <div>
                    <h4>Slot Locked Successfully</h4>
                    <p>
                      Selected Slot: {new Date(selectedSlot.startDateTime).toLocaleDateString('en-IN')} at{' '}
                      {formatSlotTime(selectedSlot.startDateTime)}
                    </p>
                  </div>
                </div>
                <div className="held-timer">
                  <span>Expires in:</span>
                  <strong className="timer-text">{timerText}</strong>
                  <button onClick={handleReleaseSlot} className="btn btn-ghost btn-sm">
                    Release Slot
                  </button>
                </div>
              </div>
            ) : (
              <>
                {slots.length === 0 ? (
                  <div className="empty-slots-state">
                    <Calendar size={32} />
                    <p>No available slots found for this doctor. Please check back later.</p>
                  </div>
                ) : (
                  <div className="slots-by-date">
                    {Object.entries(groupedSlots).map(([dateStr, dateSlots]) => (
                      <div key={dateStr} className="date-slots-group">
                        <h4 className="date-group-title">{dateStr}</h4>
                        <div className="slots-grid">
                          {dateSlots.map((slot) => (
                            <button
                              key={slot._id}
                              onClick={() => handleHoldSlot(slot)}
                              className="slot-pill-btn"
                              disabled={bookingLoading}
                            >
                              <Clock size={14} />
                              <span>{formatSlotTime(slot.startDateTime)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        {/* Right Side: Sticky Checkout Card */}
        <div className="booking-summary-sidebar">
          <div className="booking-summary-card glass-card-static">
            <h3 className="card-title">Booking Summary</h3>

            <div className="summary-section">
              <div className="summary-label">Selected Services</div>
              {selectedServicesObjects.length === 0 ? (
                <div className="summary-empty">No services selected</div>
              ) : (
                <div className="summary-services-list">
                  {selectedServicesObjects.map((s) => (
                    <div key={s._id} className="summary-service-row">
                      <span>{s.name}</span>
                      <span>₹{s.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="summary-divider"></div>

            <div className="summary-section">
              <div className="summary-label">Selected Date & Time</div>
              {selectedSlot ? (
                <div className="summary-slot-details">
                  <div className="summary-slot-row">
                    <Calendar size={14} />
                    <span>{new Date(selectedSlot.startDateTime).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                  </div>
                  <div className="summary-slot-row">
                    <Clock size={14} />
                    <span>
                      {formatSlotTime(selectedSlot.startDateTime)} - {formatSlotTime(selectedSlot.endDateTime)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="summary-empty">No slot selected</div>
              )}
            </div>

            <div className="summary-divider"></div>

            <div className="summary-total-row">
              <span>Total Payee Amount</span>
              <span className="total-price">₹{total}</span>
            </div>

            <div className="summary-actions">
              <button
                onClick={handleBook}
                className="btn btn-primary btn-lg w-full mt-4"
                disabled={bookingLoading || !selectedSlot || selectedServices.length === 0}
              >
                {bookingLoading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <CreditCard size={18} />
                    <span>Pay & Confirm Booking</span>
                  </>
                )}
              </button>

              {!selectedSlot && selectedServices.length > 0 && (
                <div className="summary-tip">
                  <AlertCircle size={14} />
                  <span>Choose an available time slot above to unlock payment.</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookingPage;
