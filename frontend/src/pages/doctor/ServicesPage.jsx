import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Stethoscope, Plus, Trash2, Save, Sparkles, DollarSign, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import '../DoctorPages.css';

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const res = await api.get('/doctor/services');
        setServices(res.data?.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load services list');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const handleAddServiceRow = () => {
    setServices([
      ...services,
      { name: '', description: '', price: '', duration: '30' },
    ]);
  };

  const handleRemoveServiceRow = (idx) => {
    setServices(services.filter((_, i) => i !== idx));
  };

  const handleFieldChange = (idx, field, value) => {
    const updated = [...services];
    updated[idx] = { ...updated[idx], [field]: value };
    setServices(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Quick validation
    for (let i = 0; i < services.length; i++) {
      const item = services[i];
      if (!item.name?.trim()) {
        toast.error(`Service #${i + 1} must have a name`);
        return;
      }
      const p = Number(item.price);
      if (isNaN(p) || p <= 0) {
        toast.error(`Service "${item.name}" must have a valid positive price`);
        return;
      }
      if (item.duration) {
        const d = Number(item.duration);
        if (isNaN(d) || !Number.isInteger(d) || d <= 0) {
          toast.error(`Service "${item.name}" duration must be a positive integer`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        services: services.map((s) => ({
          name: s.name.trim(),
          description: s.description?.trim(),
          price: Number(s.price),
          duration: s.duration ? Number(s.duration) : undefined,
        })),
      };

      const res = await api.put('/doctor/services', payload);
      toast.success(res.data?.message || 'Services catalog updated successfully!');
      
      // Update state with normalized data from backend
      setServices(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update services');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="doctor-page services-page animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Manage Services & Fees</h1>
        <p className="page-subtitle">Configure the treatments, consultations, and prices offered to patients</p>
      </div>

      {loading ? (
        <div className="text-center mt-8">
          <div className="spinner-large"></div>
          <p className="mt-4">Loading your service catalog...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="services-form-container">
          
          <div className="services-list-panel glass-card-static">
            <div className="panel-header-row">
              <h3>Services Catalog</h3>
              <button
                type="button"
                onClick={handleAddServiceRow}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={14} />
                <span>Add Service Option</span>
              </button>
            </div>

            {services.length === 0 ? (
              <div className="empty-catalog-state text-center mt-4">
                <Stethoscope size={40} className="empty-icon" />
                <h4>No Services Listed</h4>
                <p>Add at least one service/consultation option to allow patients to book appointments.</p>
              </div>
            ) : (
              <div className="catalog-rows-list">
                {services.map((service, idx) => (
                  <div key={idx} className="catalog-row glass-card-static animate-scale-in">
                    
                    {/* Header: Service Number and delete button */}
                    <div className="catalog-row-header">
                      <span className="service-number">Service Option #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveServiceRow(idx)}
                        className="btn btn-danger btn-icon btn-sm remove-row-btn"
                        title="Remove service"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Inputs */}
                    <div className="catalog-row-fields">
                      <div className="form-group grid-span-2">
                        <label className="form-label">Service / Treatment Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. General Consultation, Root Canal, Heart Screen"
                          value={service.name}
                          onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Fee (INR)</label>
                        <div className="input-with-adornment">
                          <DollarSign size={14} className="input-adornment-icon" />
                          <input
                            type="number"
                            className="form-input adornment-left"
                            placeholder="500"
                            value={service.price}
                            onChange={(e) => handleFieldChange(idx, 'price', e.target.value)}
                            required
                            min="1"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Duration (Mins)</label>
                        <div className="input-with-adornment">
                          <Clock size={14} className="input-adornment-icon" />
                          <input
                            type="number"
                            className="form-input adornment-left"
                            placeholder="30"
                            value={service.duration || ''}
                            onChange={(e) => handleFieldChange(idx, 'duration', e.target.value)}
                            min="1"
                          />
                        </div>
                      </div>

                      <div className="form-group grid-span-4">
                        <label className="form-label">Service Description (Optional)</label>
                        <textarea
                          className="form-textarea"
                          placeholder="Brief description of the consultation process, reports provided, or requirements."
                          value={service.description || ''}
                          onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                        />
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="catalog-actions-bar glass-card-static mt-6">
            <div className="actions-info">
              <Sparkles size={16} className="text-accent" />
              <span>Make sure to click "Save Catalog Changes" to apply your modifications.</span>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg save-catalog-btn"
              disabled={saving || services.length === 0}
            >
              <Save size={18} />
              <span>{saving ? 'Saving Catalog...' : 'Save Catalog Changes'}</span>
            </button>
          </div>

        </form>
      )}
    </div>
  );
};

export default ServicesPage;
