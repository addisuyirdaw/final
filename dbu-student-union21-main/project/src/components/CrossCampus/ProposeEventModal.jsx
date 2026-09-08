/** @format */
import React, { useState } from 'react';
import { X, Loader, Calendar, MapPin, Globe } from 'lucide-react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const EVENT_TYPES = ['HACKATHON', 'DEBATE', 'WORKSHOP', 'CULTURAL', 'SPORTS', 'CONFERENCE', 'COMPETITION'];

const UNIVERSITIES = ['DBU', 'AAU', 'BDU', 'JU', 'HU', 'MU', 'WU', 'ASTU'];

const INITIAL_FORM = {
  title: '',
  description: '',
  eventType: 'HACKATHON',
  startDate: '',
  endDate: '',
  location: '',
  leadUniversityCode: 'DBU',
  participatingUniversities: ['DBU'],
  maxParticipants: '',
  prizes: '',
  requirements: '',
};

export function ProposeEventModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleUni = (code) => {
    set('participatingUniversities',
      form.participatingUniversities.includes(code)
        ? form.participatingUniversities.filter(u => u !== code)
        : [...form.participatingUniversities, code]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      toast.error('End date must be after start date');
      return;
    }
    if (form.participatingUniversities.length === 0) {
      toast.error('Select at least one participating university');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : 0,
      };
      const res = await apiService.proposeJointEvent(payload);
      if (res.success) {
        toast.success('Event proposal submitted! An admin will review it shortly.');
        onSuccess?.(res.event);
        onClose?.();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to propose event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Propose a Joint Event</h2>
            <p className="text-sm text-gray-500 mt-0.5">Connect with clubs across Ethiopian universities</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Event Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. National AI Hackathon 2025"
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>

          {/* Type + Lead */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Event Type *</label>
              <select
                value={form.eventType}
                onChange={e => set('eventType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white"
              >
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Lead University *</label>
              <select
                value={form.leadUniversityCode}
                onChange={e => set('leadUniversityCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none bg-white"
              >
                {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description *</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Describe the event goals, agenda, and what participants can expect..."
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none resize-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Start Date *
              </label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> End Date *
              </label>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
          </div>

          {/* Location + Max */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Location
              </label>
              <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                placeholder="e.g. Addis Ababa, Online"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max Participants</label>
              <input type="number" value={form.maxParticipants} onChange={e => set('maxParticipants', e.target.value)}
                placeholder="0 = unlimited" min={0}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
          </div>

          {/* Participating Universities */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Participating Universities *
            </label>
            <div className="flex flex-wrap gap-2">
              {UNIVERSITIES.map(code => {
                const selected = form.participatingUniversities.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleUni(code)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                      selected
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-sky-300'
                    }`}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prizes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prizes / Incentives</label>
            <input type="text" value={form.prizes} onChange={e => set('prizes', e.target.value)}
              placeholder="e.g. 1st place: 50,000 ETB + certificates"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Requirements</label>
            <textarea value={form.requirements} onChange={e => set('requirements', e.target.value)} rows={2}
              placeholder="Any eligibility or participation requirements..."
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none resize-none" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-6 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-70">
              {submitting && <Loader className="w-4 h-4 animate-spin" />}
              {submitting ? 'Submitting...' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
