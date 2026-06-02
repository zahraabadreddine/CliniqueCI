import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Icon from '../components/Icon';

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const STATUS_STYLE = {
  pending:    { bg: 'var(--gold-soft)', text: 'var(--gold)', border: 'rgba(200,168,75,0.3)' },
  confirmed:  { bg: 'var(--green-paler)', text: 'var(--green)', border: 'var(--green-pale)' },
  waiting:    { bg: 'var(--blue-soft)', text: 'var(--blue)', border: 'rgba(47,107,214,0.2)' },
  'in-room':  { bg: 'var(--blue-soft)', text: 'var(--blue)', border: 'rgba(47,107,214,0.2)' },
  completed:  { bg: 'var(--cream-2)', text: 'var(--muted)', border: 'var(--border)' },
  cancelled:  { bg: 'var(--red-soft)', text: 'var(--red)', border: 'var(--red-border)' },
};
const STATUS_LABEL = {
  pending: 'En attente', confirmed: 'Confirmé', waiting: 'Arrivé',
  'in-room': 'En salle', completed: 'Terminé', cancelled: 'Annulé',
};

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  // 0=Sun → go back 6, 1=Mon → 0, 2=Tue → 1, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatWeekRange(start) {
  const end = addDays(start, 5);
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return `${s.getDate()} – ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

function getHourSlot(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

export default function WeeklyPlanningPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const navigate = useNavigate();

  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const { data: weekAppointments = [], isLoading } = useQuery({
    queryKey: ['appointments-week', weekStart],
    queryFn: async () => {
      const results = await Promise.all(days.map(d => api.get(`/appointments?date=${d}`)));
      return results.flat();
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/users'),
  });

  const doctors = users.filter(u => u.role === 'doctor');

  const filtered = selectedDoctor
    ? weekAppointments.filter(a => String(a.doctor_id) === String(selectedDoctor))
    : weekAppointments;

  // Build slot map: { 'YYYY-MM-DD|HH:00': [appt, ...] }
  const slotMap = {};
  for (const appt of filtered) {
    if (!appt.scheduled_at) continue;
    const dateKey = new Date(appt.scheduled_at).toISOString().slice(0, 10);
    const hourKey = getHourSlot(appt.scheduled_at);
    const key = `${dateKey}|${hourKey}`;
    if (!slotMap[key]) slotMap[key] = [];
    slotMap[key].push(appt);
  }

  const isToday = (dateStr) => dateStr === today;

  return (
    <div className="page-content" style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Planning de la semaine</h1>
          <p className="subtitle">{formatWeekRange(weekStart)}</p>
        </div>

        <div className="page-header-actions">
          {/* Doctor filter */}
          <select
            className="select"
            value={selectedDoctor}
            onChange={e => setSelectedDoctor(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="">Tous les médecins</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                Dr. {d.first_name} {d.last_name}
              </option>
            ))}
          </select>

          {/* Week navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
            <button
              className="icon-btn"
              onClick={() => setWeekStart(w => addDays(w, -7))}
              title="Semaine précédente"
            >
              <Icon name="chevronDown" size={16} style={{ transform: 'rotate(90deg)' }} />
            </button>
            <button
              className="btn"
              style={{ fontSize: '.8rem', padding: '.35rem .75rem' }}
              onClick={() => setWeekStart(getWeekStart(today))}
            >
              Aujourd'hui
            </button>
            <button
              className="icon-btn"
              onClick={() => setWeekStart(w => addDays(w, 7))}
              title="Semaine suivante"
            >
              <Icon name="chevronDown" size={16} style={{ transform: 'rotate(-90deg)' }} />
            </button>
          </div>

          <button
            className="btn btn-primary"
            style={{ fontSize: '.85rem' }}
            onClick={() => navigate('/new-appointment')}
          >
            <Icon name="plus" size={14} /> Nouveau RDV
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Chargement du planning…</div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ background: 'var(--cream-2)' }}>
                  <th style={{ width: 64, padding: '.65rem .75rem', borderRight: '1px solid var(--border)', textAlign: 'center', fontSize: '.75rem', color: 'var(--muted)', fontWeight: 600 }}>
                    Heure
                  </th>
                  {days.map((day, i) => (
                    <th key={day} style={{
                      padding: '.65rem .75rem',
                      borderRight: i < 5 ? '1px solid var(--border)' : 'none',
                      textAlign: 'center',
                      background: isToday(day) ? 'var(--green-paler)' : undefined,
                    }}>
                      <div style={{ fontSize: '.8rem', fontWeight: 700, color: isToday(day) ? 'var(--green)' : 'var(--ink)' }}>
                        {DAY_NAMES[i]}
                      </div>
                      <div style={{ fontSize: '.75rem', color: isToday(day) ? 'var(--green)' : 'var(--muted)' }}>
                        {formatDateShort(day)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour, hi) => (
                  <tr key={hour} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{
                      padding: '.45rem .75rem',
                      borderRight: '1px solid var(--border)',
                      textAlign: 'center',
                      fontSize: '.75rem',
                      color: 'var(--muted)',
                      fontWeight: 600,
                      verticalAlign: 'top',
                      background: 'var(--cream-2)',
                      whiteSpace: 'nowrap',
                    }}>
                      {hour}
                    </td>
                    {days.map((day, di) => {
                      const key = `${day}|${hour}`;
                      const appts = slotMap[key] || [];
                      return (
                        <td key={day} style={{
                          padding: '.25rem .3rem',
                          borderRight: di < 5 ? '1px solid var(--border)' : 'none',
                          verticalAlign: 'top',
                          minHeight: 48,
                          background: isToday(day) ? 'var(--green-paler)' : undefined,
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem', minHeight: 44 }}>
                            {appts.map(appt => {
                              const st = STATUS_STYLE[appt.status] || STATUS_STYLE.pending;
                              return (
                                <div key={appt.id} style={{
                                  borderRadius: 6,
                                  background: st.bg,
                                  border: `1px solid ${st.border}`,
                                  padding: '.2rem .4rem',
                                  fontSize: '.72rem',
                                  lineHeight: 1.35,
                                  cursor: 'default',
                                }}>
                                  <div style={{ fontWeight: 700, color: st.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {appt.patient_first_name} {appt.patient_last_name}
                                  </div>
                                  <div style={{ color: st.text, opacity: .8 }}>
                                    {new Date(appt.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    {appt.doctor_last_name && ` · Dr. ${appt.doctor_last_name}`}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '.75rem', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABEL).map(([s, label]) => {
          const st = STATUS_STYLE[s];
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.75rem', color: 'var(--muted)' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: st.bg, border: `1px solid ${st.border}` }} />
              <span style={{ color: st.text }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
