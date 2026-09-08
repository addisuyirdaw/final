/** @format */
import React from 'react';
import { Calendar, MapPin, Users, Zap, Award, BookOpen, Mic, Trophy, Globe } from 'lucide-react';

const UNIVERSITY_COLORS = {
  DBU: '#0284c7', AAU: '#7c3aed', BDU: '#059669', JU: '#d97706',
  HU: '#dc2626', MU: '#0891b2', WU: '#be185d', ASTU: '#4f46e5',
};

const EVENT_TYPE_ICONS = {
  HACKATHON: <Zap className="w-4 h-4" />,
  DEBATE: <Mic className="w-4 h-4" />,
  WORKSHOP: <BookOpen className="w-4 h-4" />,
  CULTURAL: <Globe className="w-4 h-4" />,
  SPORTS: <Trophy className="w-4 h-4" />,
  CONFERENCE: <Award className="w-4 h-4" />,
  COMPETITION: <Trophy className="w-4 h-4" />,
};

const EVENT_TYPE_COLORS = {
  HACKATHON: 'bg-violet-50 text-violet-700 border-violet-100',
  DEBATE: 'bg-amber-50 text-amber-700 border-amber-100',
  WORKSHOP: 'bg-sky-50 text-sky-700 border-sky-100',
  CULTURAL: 'bg-pink-50 text-pink-700 border-pink-100',
  SPORTS: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  CONFERENCE: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  COMPETITION: 'bg-orange-50 text-orange-700 border-orange-100',
};

const STATUS_STYLES = {
  proposed:  'bg-yellow-50 text-yellow-700 border-yellow-100',
  approved:  'bg-blue-50 text-blue-700 border-blue-100',
  ongoing:   'bg-emerald-50 text-emerald-700 border-emerald-100',
  completed: 'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-red-50 text-red-600 border-red-100',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function UniBadge({ code }) {
  const color = UNIVERSITY_COLORS[code] || '#6b7280';
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
      style={{ backgroundColor: color }}
    >
      {code}
    </span>
  );
}

export function JointEventCard({ event, currentUserId, onRegister, onCancel, registering }) {
  const isRegistered = event.registeredUsers?.some(
    r => r.user === currentUserId || r.user?._id === currentUserId
  );
  const isFull = event.maxParticipants > 0 && event.registeredUsers?.length >= event.maxParticipants;
  const canRegister = !['cancelled', 'completed'].includes(event.status);

  const typeColor = EVENT_TYPE_COLORS[event.eventType] || 'bg-gray-50 text-gray-600 border-gray-200';
  const typeIcon = EVENT_TYPE_ICONS[event.eventType] || <Globe className="w-4 h-4" />;
  const statusStyle = STATUS_STYLES[event.status] || 'bg-gray-50 text-gray-500 border-gray-200';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Top accent bar */}
      <div
        className="h-1.5 w-full"
        style={{ background: `linear-gradient(90deg, ${UNIVERSITY_COLORS[event.leadUniversityCode] || '#6b7280'}, ${UNIVERSITY_COLORS[event.participatingUniversities?.[1]] || '#94a3b8'})` }}
      />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${typeColor}`}>
                {typeIcon} {event.eventType}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${statusStyle}`}>
                {event.status}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 text-base leading-snug">{event.title}</h3>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{event.description}</p>
        )}

        {/* Universities */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-400 font-medium mr-1">Universities:</span>
          {(event.participatingUniversities || [event.leadUniversityCode]).map(code => (
            <UniBadge key={code} code={code} />
          ))}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span>{formatDate(event.startDate)} – {formatDate(event.endDate)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span>
              {event.registeredUsers?.length || 0} registered
              {event.maxParticipants > 0 && ` / ${event.maxParticipants} max`}
            </span>
          </div>
          {event.createdBy?.name && (
            <div className="text-gray-400 truncate">By {event.createdBy.name}</div>
          )}
        </div>

        {/* Prizes */}
        {event.prizes && (
          <div className="text-xs bg-amber-50 text-amber-700 rounded-lg px-3 py-2 border border-amber-100">
            🏆 {event.prizes}
          </div>
        )}

        {/* Action */}
        {canRegister && currentUserId && (
          <div className="mt-auto pt-3 border-t border-gray-50">
            {isRegistered ? (
              <button
                onClick={() => onCancel?.(event._id)}
                disabled={registering}
                className="w-full py-2 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                {registering ? 'Cancelling...' : 'Cancel Registration'}
              </button>
            ) : (
              <button
                onClick={() => onRegister?.(event._id)}
                disabled={registering || isFull}
                className="w-full py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors disabled:opacity-60"
              >
                {registering ? 'Registering...' : isFull ? 'Event Full' : 'Register & Participate'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
