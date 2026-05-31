import { useState, useContext, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { QRCodeSVG } from 'qrcode.react';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

/* ─── helpers ──────────────────────────────────────────────────────────── */
function fmtDate(iso, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', opts);
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function fmtAmount(val) {
  const n = Number(val);
  if (isNaN(n)) return '—';
  return n.toLocaleString('fr-FR') + ' FCFA';
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_MAP = {
  confirmed:  { cls: 'green', label: 'Confirmé' },
  pending:    { cls: 'gold',  label: 'En attente' },
  'in-room':  { cls: 'blue',  label: 'En consultation' },
  completed:  { cls: 'muted', label: 'Terminé' },
  cancelled:  { cls: 'red',   label: 'Annulé' },
};

const INVOICE_STATUS = {
  paid:     { label: 'Payé',    color: 'var(--green)',  bg: 'var(--green-pale)' },
  unpaid:   { label: 'Impayé',  color: 'var(--red)',    bg: 'var(--red-soft)'   },
  partial:  { label: 'Partiel', color: 'var(--gold)',   bg: 'var(--gold-soft)'  },
  void:     { label: 'Annulé',  color: 'var(--muted)',  bg: 'var(--cream-2)'    },
};

const PAYMENT_LABELS = {
  cash: 'Espèces', wave: 'Wave',
  orange_money: 'Orange Money', mtn_money: 'MTN Money', moov_money: 'Moov Money',
};

function StatusBadge({ status }) {
  const m = STATUS_MAP[status] || { cls: 'muted', label: status };
  return (
    <span className={`badge ${m.cls}`} style={{ fontSize: 10 }}>
      <span className="dot-mark" />{m.label}
    </span>
  );
}

/* ─── PatientHome ───────────────────────────────────────────────────────── */
function PatientHome({ currentUser, onNavigate }) {
  const { data: appointments = [] } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => api.get('/appointments'),
  });
  const { data: patient } = useQuery({
    queryKey: ['my-patient-record'],
    queryFn: () => api.get('/patients/me'),
  });

  const now = new Date();
  const upcoming = appointments
    .filter(a => new Date(a.scheduled_at) >= now && !['cancelled', 'completed'].includes(a.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const nextRDV = upcoming[0] || null;

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName = patient?.first_name || currentUser?.first_name || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem', paddingBottom: '.5rem' }}>

      {/* ── Hero banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #22a05e 0%, #1a8a4e 60%, #156b3d 100%)',
        borderRadius: 18, padding: '1.2rem 1.15rem',
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', right:-18, top:-18, width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,.07)' }} />
        <div style={{ position:'absolute', right:30, bottom:-28, width:65, height:65, borderRadius:'50%', background:'rgba(255,255,255,.05)' }} />

        <div style={{ fontSize: 10, opacity: .7, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '.3rem' }}>
          Clinique du Plateau · Abidjan
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25 }}>
          {greeting}{firstName ? `, ${firstName}` : ''} 👋
        </div>
        <div style={{ fontSize: 11.5, opacity: .78, marginTop: '.3rem', lineHeight: 1.4 }}>
          Bienvenue dans votre espace santé personnel
        </div>

        {/* CTA button */}
        <button
          onClick={() => onNavigate('book')}
          style={{
            marginTop: '.85rem',
            background: 'rgba(255,255,255,.18)',
            border: '1px solid rgba(255,255,255,.3)',
            borderRadius: 10, padding: '.45rem .9rem',
            color: '#fff', fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '.35rem',
          }}
        >
          <Icon name="plus" size={13} />
          Prendre un rendez-vous
        </button>
      </div>

      {/* ── Prochain RDV ── */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
        Prochain rendez-vous
      </div>

      {nextRDV ? (
        <div
          onClick={() => onNavigate('rdv')}
          style={{
            background: 'var(--surface)', borderRadius: 14,
            padding: '.95rem 1rem', cursor: 'pointer',
            border: '1px solid var(--border)',
            display: 'flex', gap: '.85rem', alignItems: 'center',
          }}
        >
          <div style={{
            width: 44, height: 44, flexShrink: 0,
            background: 'var(--green-pale)', borderRadius: 13,
            display: 'grid', placeItems: 'center', color: 'var(--green)',
          }}>
            <Icon name="calendar" size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
              Dr. {nextRDV.doctor_first_name} {nextRDV.doctor_last_name}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
              {fmtDate(nextRDV.scheduled_at, { weekday: 'short', day: 'numeric', month: 'short' })}
              &nbsp;·&nbsp;{fmtTime(nextRDV.scheduled_at)}
            </div>
          </div>
          <StatusBadge status={nextRDV.status} />
        </div>
      ) : (
        <div
          onClick={() => onNavigate('book')}
          style={{
            background: 'var(--green-pale)', borderRadius: 14,
            padding: '.95rem 1rem', textAlign: 'center',
            border: '1.5px dashed rgba(34,160,94,.22)', cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--green)' }}>Aucun rendez-vous prévu</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Touchez pour en planifier un</div>
        </div>
      )}

      {/* ── Actions rapides ── */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
        Actions rapides
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
        {[
          { icon: 'calendar',      label: 'Nouveau RDV',   sub: 'Prendre rendez-vous',    color: 'var(--green)', bg: 'var(--green-pale)', page: 'book'    },
          { icon: 'pill',          label: 'Ordonnances',   sub: 'Voir mes prescriptions',  color: '#b8860b',     bg: '#fef3d3',          page: 'rx'      },
          { icon: 'stethoscope',   label: 'Mon dossier',   sub: 'Consultations & factures',color: 'var(--blue)', bg: 'var(--blue-soft)', page: 'dossier' },
          { icon: 'user',          label: 'Mon profil',    sub: 'Mes informations',        color: '#22a05e',     bg: '#e2f8ec',          page: 'profil'  },
        ].map(({ icon, label, sub, color, bg, page }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            style={{
              background: bg, borderRadius: 14, padding: '.85rem .8rem',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '.4rem',
              border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,.7)', display: 'grid', placeItems: 'center', color,
            }}>
              <Icon name={icon} size={15} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{label}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1, lineHeight: 1.3 }}>{sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Infos clinique ── */}
      <div style={{
        background: 'var(--surface)', borderRadius: 14,
        border: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <div style={{ padding: '.65rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
          Clinique du Plateau
        </div>
        {[
          { icon: 'clock',   text: 'Lun – Ven : 7h30 – 18h00' },
          { icon: 'clock',   text: 'Samedi : 8h00 – 13h00' },
          { icon: 'mapPin', text: 'Plateau, Abidjan, Côte d\'Ivoire' },
        ].map(({ icon, text }, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '.7rem',
            padding: '.55rem 1rem',
            borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
          }}>
            <Icon name={icon} size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{text}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

/* ─── PatientBooking ────────────────────────────────────────────────────── */
function PatientBooking({ onDone }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [done, setDone] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedSlot, setSelectedSlot] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { doctor_id: '', reason: '' },
  });

  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get('/users'),
  });
  const { data: myRecord, isLoading: loadingMe } = useQuery({
    queryKey: ['my-patient-record'],
    queryFn: () => api.get('/patients/me'),
  });

  const selectedDoctorId = watch('doctor_id');
  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  const { data: slotsData, isLoading: loadingSlots, isFetching: fetchingSlots } = useQuery({
    queryKey: ['booking-slots', selectedDoctorId, selectedDate],
    queryFn: () => api.get(`/appointments/slots?doctor_id=${selectedDoctorId}&date=${selectedDate}`),
    enabled: !!selectedDoctorId && !!selectedDate,
    staleTime: 30_000,
  });
  const availableSlots = slotsData?.slots ?? [];

  const mutation = useMutation({
    mutationFn: (data) => api.post('/appointments', {
      patient_id: myRecord.id,
      doctor_id: data.doctor_id,
      scheduled_at: new Date(`${selectedDate}T${selectedSlot}`).toISOString(),
      reason: data.reason || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['booking-slots'] });
      setDone(true);
    },
    onError: (err) => setServerError(err?.error || 'Erreur lors de la prise de rendez-vous'),
  });

  const specialties = [...new Set(doctors.filter(d => d.role === 'doctor').map(d => d.specialty).filter(Boolean))].sort();
  const filteredDoctors = doctors.filter(d => d.role === 'doctor' && (selectedSpecialty ? d.specialty === selectedSpecialty : true));

  const onSubmit = (data) => {
    if (!selectedSlot) { setServerError('Veuillez choisir un créneau horaire.'); return; }
    setServerError('');
    mutation.mutate(data);
  };

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', padding: '2rem 0' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-pale)', display: 'grid', placeItems: 'center', color: 'var(--green)' }}>
          <Icon name="check" size={30} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Demande envoyée !</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: '.35rem' }}>La clinique va confirmer votre rendez-vous.</div>
        </div>
        <button className="btn btn-primary" style={{ borderRadius: 12, padding: '.7rem 1.5rem' }} onClick={onDone}>
          Voir mes rendez-vous
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '.5rem' }}>
      <div style={{ paddingTop: '.25rem' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Prendre un rendez-vous</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Choisissez un médecin, une date et un créneau disponible</div>
      </div>

      {!myRecord && !loadingMe && (
        <div style={{ padding: '.75rem', background: 'var(--gold-soft)', borderRadius: 10, fontSize: 12, color: 'var(--gold)', border: '1px solid var(--gold)' }}>
          <Icon name="warning" size={13} style={{ marginRight: 4 }} />
          Votre dossier n'a pas encore été créé. Contactez la réception.
        </div>
      )}

      {serverError && (
        <div style={{ padding: '.65rem .85rem', background: 'var(--red-soft)', borderRadius: 10, fontSize: 12, color: 'var(--red)', border: '1px solid var(--red)', display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          <Icon name="warning" size={13} />{serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>

        {specialties.length > 0 && (
          <div className="field">
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Spécialité</label>
            <select className="select" style={{ fontSize: 13, borderRadius: 10 }} value={selectedSpecialty} onChange={e => setSelectedSpecialty(e.target.value)}>
              <option value="">— Toutes les spécialités —</option>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div className="field">
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Médecin</label>
          {loadingDoctors ? (
            <div className="placeholder" style={{ height: 40, borderRadius: 10 }} />
          ) : (
            <select className="select" style={{ fontSize: 13, borderRadius: 10 }} {...register('doctor_id', { required: 'Requis' })} onChange={e => { setSelectedSlot(''); register('doctor_id').onChange(e); }}>
              <option value="">— Choisir un médecin —</option>
              {filteredDoctors.map(d => (
                <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}{d.specialty ? ` · ${d.specialty}` : ''}</option>
              ))}
            </select>
          )}
          {errors.doctor_id && <span className="form-error">{errors.doctor_id.message}</span>}
        </div>

        {selectedDoctor && (
          <div style={{ padding: '.6rem .85rem', background: 'var(--green-paler)', borderRadius: 10, fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <Icon name="user" size={13} />
            <strong>Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</strong>
            {selectedDoctor.specialty && <span style={{ opacity: .7 }}>· {selectedDoctor.specialty}</span>}
          </div>
        )}

        {selectedDoctorId && (
          <div className="field">
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Date</label>
            <input type="date" className="input" style={{ fontSize: 13, borderRadius: 10 }} min={todayStr()} value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(''); }} />
          </div>
        )}

        {selectedDoctorId && selectedDate && (
          <div className="field">
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Créneau disponible{fetchingSlots && <span style={{ fontWeight: 400, marginLeft: 6, color: 'var(--muted)' }}>Chargement…</span>}
            </label>
            {loadingSlots ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.35rem' }}>
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="placeholder" style={{ height: 34, borderRadius: 8 }} />)}
              </div>
            ) : availableSlots.length === 0 ? (
              <div style={{ padding: '.9rem', borderRadius: 10, textAlign: 'center', background: 'var(--cream-2)', border: '1px dashed var(--border)', fontSize: 12, color: 'var(--muted)' }}>
                <Icon name="calendar" size={20} style={{ opacity: .35, marginBottom: '.4rem' }} />
                <div>Aucun créneau disponible ce jour</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>Essayez une autre date</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.35rem' }}>
                {availableSlots.map(slot => {
                  const active = selectedSlot === slot;
                  return (
                    <button type="button" key={slot} onClick={() => setSelectedSlot(slot)} style={{ padding: '.45rem .25rem', borderRadius: 8, border: `1.5px solid ${active ? 'var(--green)' : 'var(--border)'}`, background: active ? 'var(--green-pale)' : 'var(--surface)', color: active ? 'var(--green)' : 'var(--ink)', fontWeight: active ? 700 : 500, fontSize: 12, cursor: 'pointer', transition: 'all .1s', textAlign: 'center' }}>
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Motif (optionnel)</label>
          <input className="input" style={{ fontSize: 13, borderRadius: 10 }} placeholder="Ex : Consultation générale…" {...register('reason')} />
        </div>

        {selectedSlot && (
          <div style={{ padding: '.65rem .9rem', borderRadius: 10, background: 'var(--green-pale)', border: '1px solid rgba(13,122,95,.2)', fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Icon name="check" size={13} />
            <span>
              <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
              {' à '}<strong>{selectedSlot}</strong>
            </span>
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ borderRadius: 12, padding: '.8rem', justifyContent: 'center', fontSize: 14, marginTop: '.25rem' }} disabled={mutation.isPending || !myRecord || loadingMe || !selectedSlot}>
          {mutation.isPending ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Envoi…</> : 'Demander le rendez-vous'}
        </button>
      </form>
    </div>
  );
}

/* ─── PatientRDVList ────────────────────────────────────────────────────── */
function PatientRDVList({ onBook }) {
  const [tab, setTab] = useState('upcoming');
  const [cancelId, setCancelId] = useState(null);
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading, isError } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => api.get('/appointments'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/appointments/${id}/status`, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      setCancelId(null);
    },
  });

  const now = new Date();
  const upcoming = appointments
    .filter(a => new Date(a.scheduled_at) >= now && !['cancelled', 'completed'].includes(a.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const past = appointments
    .filter(a => new Date(a.scheduled_at) < now || ['cancelled', 'completed'].includes(a.status))
    .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

  const list = tab === 'upcoming' ? upcoming : past;

  const borderColor = (status) => {
    const c = STATUS_MAP[status]?.cls;
    return c === 'green' ? 'var(--green)' : c === 'gold' ? 'var(--gold)' : c === 'blue' ? 'var(--blue)' : c === 'red' ? 'var(--red)' : 'var(--muted-light)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '.25rem' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Mes rendez-vous</div>
        <button className="btn btn-primary btn-sm" style={{ borderRadius: 10, fontSize: 11, padding: '.35rem .75rem' }} onClick={onBook}>
          <Icon name="plus" size={12} /> Nouveau
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--cream-2)', borderRadius: 12, padding: 3 }}>
        {[
          { id: 'upcoming', label: `À venir (${upcoming.length})` },
          { id: 'past',     label: `Historique (${past.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '.5rem', borderRadius: 10, fontSize: 12, fontWeight: tab === t.id ? 600 : 500, background: tab === t.id ? 'var(--surface)' : 'transparent', color: tab === t.id ? 'var(--ink)' : 'var(--muted)', boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none', transition: 'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
          {[1, 2, 3].map(i => <div key={i} className="placeholder" style={{ height: 82, borderRadius: 14 }} />)}
        </div>
      ) : isError ? (
        <div style={{ textAlign: 'center', color: 'var(--red)', padding: '2rem 0', fontSize: 13 }}>Erreur lors du chargement</div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem 1rem' }}>
          <Icon name="calendar" size={36} style={{ opacity: .2, marginBottom: '.65rem' }} />
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>
            {tab === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun historique'}
          </div>
          {tab === 'upcoming' && (
            <button onClick={onBook} style={{ marginTop: '.75rem', fontSize: 12, color: 'var(--green)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              Prendre un rendez-vous →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
          {list.map(a => (
            <div key={a.id} style={{ background: 'var(--surface)', borderRadius: 14, padding: '.9rem 1rem', border: '1px solid var(--border)', borderLeft: `3px solid ${borderColor(a.status)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>
                    Dr. {a.doctor_first_name} {a.doctor_last_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    <Icon name="calendar" size={11} style={{ marginRight: 3 }} />
                    {fmtDate(a.scheduled_at, { weekday: 'short', day: 'numeric', month: 'short' })}
                    &nbsp;·&nbsp;{fmtTime(a.scheduled_at)}
                  </div>
                  {a.reason && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, fontStyle: 'italic' }}>
                      {a.reason.slice(0, 50)}{a.reason.length > 50 ? '…' : ''}
                    </div>
                  )}
                </div>
                <StatusBadge status={a.status} />
              </div>

              {/* Cancel button — only for pending appointments in upcoming tab */}
              {tab === 'upcoming' && a.status === 'pending' && (
                <div style={{ marginTop: '.7rem', paddingTop: '.65rem', borderTop: '1px solid var(--border)' }}>
                  {cancelId === a.id ? (
                    <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1 }}>Confirmer l'annulation ?</span>
                      <button
                        onClick={() => cancelMutation.mutate(a.id)}
                        disabled={cancelMutation.isPending}
                        style={{ padding: '.3rem .7rem', borderRadius: 8, background: 'var(--red)', color: '#fff', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                      >
                        {cancelMutation.isPending ? '…' : 'Oui, annuler'}
                      </button>
                      <button
                        onClick={() => setCancelId(null)}
                        style={{ padding: '.3rem .7rem', borderRadius: 8, background: 'var(--cream-2)', color: 'var(--ink)', fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer' }}
                      >
                        Non
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCancelId(a.id)}
                      style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.3rem', opacity: .85 }}
                    >
                      <Icon name="close" size={11} /> Annuler ce rendez-vous
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── RxModal ───────────────────────────────────────────────────────────── */
function RxModal({ prescription: p, onClose }) {
  const [showQR, setShowQR] = useState(false);

  const qrUrl = p.qr_token
    ? `${window.location.origin}/verify/rx/${p.qr_token}`
    : null;

  return (
    <div
      style={{ position: 'absolute', inset: 0, background: 'rgba(15,26,22,.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', borderRadius: 34, overflow: 'hidden' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--surface)', width: '100%', borderRadius: '20px 20px 0 0', padding: '1.25rem', maxHeight: '85%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>Ordonnance</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
              {fmtDate(p.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <button style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cream-2)', display: 'grid', placeItems: 'center' }} onClick={onClose}>
            <Icon name="close" size={14} />
          </button>
        </div>

        {/* QR panel */}
        {showQR && qrUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem', marginBottom: '1rem', padding: '1rem', background: '#fff', borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Code QR — Vérification pharmacie</div>
            <QRCodeSVG value={qrUrl} size={160} level="M" includeMargin />
            <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', maxWidth: 200, lineHeight: 1.4 }}>
              La pharmacie scanne ce code pour vérifier l'authenticité de l'ordonnance
            </div>
            <button onClick={() => setShowQR(false)} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Masquer le QR
            </button>
          </div>
        )}

        {/* Medications */}
        <div className="rx-doc" style={{ marginBottom: '.85rem' }}>
          {(p.medications || []).map((med, i) => (
            <div key={i} className="rx-line">
              <div className="rx-med">{med.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {med.dosage}{med.frequency ? ` · ${med.frequency}` : ''}{med.duration ? ` · ${med.duration}` : ''}
              </div>
              {med.instructions && (
                <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>{med.instructions}</div>
              )}
            </div>
          ))}
        </div>

        {p.notes && (
          <div style={{ padding: '.65rem .85rem', background: 'var(--green-paler)', borderRadius: 10, fontSize: 12, color: 'var(--ink-soft)', border: '1px solid rgba(34,160,94,.15)', marginBottom: '.85rem' }}>
            <Icon name="info" size={12} style={{ marginRight: 4, color: 'var(--green)' }} />
            {p.notes}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button
            onClick={() => {
              const text = [
                `Ordonnance du ${fmtDate(p.created_at)}`,
                '',
                ...(p.medications || []).map(m => `• ${m.name} — ${m.dosage}${m.frequency ? ` ${m.frequency}` : ''}${m.duration ? ` (${m.duration})` : ''}`),
                ...(p.notes ? ['', `Note : ${p.notes}`] : []),
              ].join('\n');
              const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `ordonnance_${p.id?.slice(0, 8) ?? 'rx'}.txt`;
              a.click(); URL.revokeObjectURL(url);
            }}
            style={{ flex: 1, padding: '.65rem', borderRadius: 12, background: 'var(--green-pale)', color: 'var(--green)', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', border: 'none', cursor: 'pointer' }}
          >
            <Icon name="download" size={14} /> Télécharger
          </button>
          <button
            onClick={() => qrUrl && setShowQR(v => !v)}
            disabled={!qrUrl}
            style={{ flex: 1, padding: '.65rem', borderRadius: 12, background: showQR ? 'var(--blue)' : 'var(--blue-soft)', color: showQR ? '#fff' : 'var(--blue)', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', border: 'none', cursor: qrUrl ? 'pointer' : 'not-allowed', opacity: qrUrl ? 1 : .5 }}
          >
            <Icon name="qr" size={14} /> Pharmacie (QR)
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── PatientRxList ─────────────────────────────────────────────────────── */
function PatientRxList() {
  const [selected, setSelected] = useState(null);

  const { data: history, isLoading, isError } = useQuery({
    queryKey: ['my-records'],
    queryFn: () => api.get('/patients/me/history'),
    retry: false,
  });

  const prescriptions = (history?.prescriptions || []).map(p => ({
    ...p,
    medications: typeof p.medications === 'string' ? JSON.parse(p.medications) : (p.medications || []),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
      <div style={{ paddingTop: '.25rem' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Mes ordonnances</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
          {prescriptions.length > 0 ? `${prescriptions.length} ordonnance${prescriptions.length > 1 ? 's' : ''}` : ''}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
          {[1, 2].map(i => <div key={i} className="placeholder" style={{ height: 80, borderRadius: 14 }} />)}
        </div>
      ) : isError || !history?.patient ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem 1rem' }}>
          <Icon name="pill" size={36} style={{ opacity: .2, marginBottom: '.65rem' }} />
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>Dossier non disponible</div>
          <div style={{ fontSize: 11, marginTop: 3 }}>Vos ordonnances apparaîtront après votre première consultation</div>
        </div>
      ) : prescriptions.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem 1rem' }}>
          <Icon name="pill" size={36} style={{ opacity: .2, marginBottom: '.65rem' }} />
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>Aucune ordonnance</div>
          <div style={{ fontSize: 11, marginTop: 3 }}>Vos ordonnances apparaîtront ici après vos consultations</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
          {prescriptions.map(p => (
            <button key={p.id} onClick={() => setSelected(p)} style={{ background: 'var(--surface)', borderRadius: 14, padding: '.9rem 1rem', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: 'var(--purple-soft)', display: 'grid', placeItems: 'center', color: 'var(--purple)' }}>
                <Icon name="pill" size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>
                  {p.medications?.length || 0} médicament{(p.medications?.length || 0) > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {fmtDate(p.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                {p.medications?.[0] && (
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 }}>
                    {p.medications[0].name}{p.medications.length > 1 ? ` +${p.medications.length - 1}` : ''}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.25rem', flexShrink: 0 }}>
                <Icon name="chevronRight" size={14} style={{ color: 'var(--muted)' }} />
                {p.qr_token && (
                  <span style={{ fontSize: 9, color: 'var(--blue)', fontWeight: 600, letterSpacing: '.03em' }}>QR</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <RxModal prescription={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ─── PatientDossier ────────────────────────────────────────────────────── */
function PatientDossier() {
  const [tab, setTab] = useState('consultations');

  const { data: history, isLoading, isError } = useQuery({
    queryKey: ['my-records'],
    queryFn: () => api.get('/patients/me/history'),
    retry: false,
  });

  const consultations = history?.consultations || [];
  const invoices = history?.invoices || [];

  const noRecord = isError || (!isLoading && !history?.patient);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ paddingTop: '.25rem' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Mon dossier médical</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Consultations et factures</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--cream-2)', borderRadius: 12, padding: 3 }}>
        {[
          { id: 'consultations', label: `Consultations (${consultations.length})` },
          { id: 'factures',      label: `Factures (${invoices.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '.5rem', borderRadius: 10, fontSize: 11.5, fontWeight: tab === t.id ? 600 : 500, background: tab === t.id ? 'var(--surface)' : 'transparent', color: tab === t.id ? 'var(--ink)' : 'var(--muted)', boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none', transition: 'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
          {[1, 2, 3].map(i => <div key={i} className="placeholder" style={{ height: 90, borderRadius: 14 }} />)}
        </div>
      ) : noRecord ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem 1rem' }}>
          <Icon name="file" size={36} style={{ opacity: .2, marginBottom: '.65rem' }} />
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>Dossier non disponible</div>
          <div style={{ fontSize: 11, marginTop: 3 }}>Votre dossier sera créé après votre première consultation</div>
        </div>
      ) : tab === 'consultations' ? (
        consultations.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem 1rem' }}>
            <Icon name="stethoscope" size={36} style={{ opacity: .2, marginBottom: '.65rem' }} />
            <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>Aucune consultation</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
            {consultations.map(c => (
              <div key={c.id} style={{ background: 'var(--surface)', borderRadius: 14, padding: '.9rem 1rem', border: '1px solid var(--border)', borderLeft: '3px solid var(--blue)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem', marginBottom: '.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                    Dr. {c.doctor_first_name} {c.doctor_last_name}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', flexShrink: 0 }}>
                    {fmtDate(c.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                {c.chief_complaint && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>Motif · </span>
                    {c.chief_complaint}
                  </div>
                )}
                {c.diagnosis && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>Diagnostic · </span>
                    {c.diagnosis}
                  </div>
                )}
                {c.notes && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>{c.notes}</div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* Factures tab */
        invoices.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem 1rem' }}>
            <Icon name="invoice" size={36} style={{ opacity: .2, marginBottom: '.65rem' }} />
            <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>Aucune facture</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
            {invoices.map(inv => {
              const st = INVOICE_STATUS[inv.status] || { label: inv.status, color: 'var(--muted)', bg: 'var(--cream-2)' };
              return (
                <div key={inv.id} style={{ background: 'var(--surface)', borderRadius: 14, padding: '.9rem 1rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.4rem' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{fmtAmount(inv.amount)}</div>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: st.color, background: st.bg, padding: '.2rem .55rem', borderRadius: 6 }}>
                      {st.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {fmtDate(inv.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                    {inv.payment_method && <span> · {PAYMENT_LABELS[inv.payment_method] || inv.payment_method}</span>}
                  </div>
                  {inv.paid_at && (
                    <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>
                      Payé le {fmtDate(inv.paid_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                  {inv.notes && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>{inv.notes}</div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

/* ─── PatientProfile ────────────────────────────────────────────────────── */
function PatientProfile({ currentUser, onLogout }) {
  const { data: patient, isLoading } = useQuery({
    queryKey: ['my-patient-record'],
    queryFn: () => api.get('/patients/me'),
  });

  const initials = patient
    ? (patient.first_name?.[0] ?? '') + (patient.last_name?.[0] ?? '')
    : (currentUser?.first_name?.[0] ?? '') + (currentUser?.last_name?.[0] ?? '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '.5rem' }}>
      {/* Avatar */}
      <div style={{ paddingTop: '.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--green) 0%, var(--green-light) 100%)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: 1, flexShrink: 0 }}>
          {initials || '?'}
        </div>
        <div>
          {isLoading ? (
            <div className="placeholder" style={{ width: 120, height: 18, borderRadius: 6, marginBottom: 6 }} />
          ) : (
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              {patient ? `${patient.first_name} ${patient.last_name}` : `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {patient?.date_of_birth ? `Né·e le ${fmtDate(patient.date_of_birth)}` : 'Patient'}
          </div>
        </div>
      </div>

      {/* Health card */}
      {patient && (
        <div style={{ background: 'linear-gradient(135deg, var(--green) 0%, #1a8a4e 100%)', borderRadius: 16, padding: '1rem 1.1rem', color: '#fff' }}>
          <div style={{ fontSize: 10, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.6rem' }}>Informations médicales</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{patient.blood_type || '—'}</div>
              <div style={{ fontSize: 10, opacity: .7, marginTop: 1 }}>Groupe sanguin</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,.2)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>Allergies</div>
              <div style={{ fontSize: 11, opacity: .8 }}>{patient.allergies || 'Aucune allergie connue'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Contact info */}
      {patient && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {[
            { icon: 'phone', label: 'Téléphone', value: patient.phone || '—' },
            { icon: 'mail',  label: 'Email',     value: patient.email || '—' },
          ].map(({ icon, label, value }, i, arr) => (
            <div key={label} style={{ padding: '.8rem 1rem', display: 'flex', alignItems: 'center', gap: '.75rem', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--green-pale)', display: 'grid', placeItems: 'center', color: 'var(--green)', flexShrink: 0 }}>
                <Icon name={icon} size={14} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginTop: 1 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dossier depuis */}
      {patient?.created_at && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.8rem 1rem', background: 'var(--cream-2)', borderRadius: 14, fontSize: 12, color: 'var(--ink-soft)' }}>
          <Icon name="file" size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <span>Dossier patient ouvert le <strong>{fmtDate(patient.created_at)}</strong></span>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={onLogout}
        style={{ marginTop: '.25rem', padding: '.8rem', borderRadius: 14, background: 'var(--red-soft)', color: 'var(--red)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', border: '1px solid rgba(214,76,63,.15)' }}
      >
        <Icon name="logout" size={15} />
        Se déconnecter
      </button>
    </div>
  );
}

/* ─── PatientShellPage ───────────────────────────────────────────────────── */
export default function PatientShellPage() {
  const { user, logout } = useContext(AuthContext);
  const [page, setPage] = useState('home');
  const [clock, setClock] = useState('');

  /* Live clock for the status bar */
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const tabs = [
    { id: 'home',    icon: 'home',        label: 'Accueil' },
    { id: 'rdv',     icon: 'calendar',    label: 'RDV'     },
    { id: 'rx',      icon: 'pill',        label: 'Rx'      },
    { id: 'dossier', icon: 'stethoscope', label: 'Dossier' },
    { id: 'profil',  icon: 'user',        label: 'Profil'  },
  ];

  const pageTitles = {
    home:    null,
    rdv:     'Mes rendez-vous',
    book:    'Nouveau rendez-vous',
    rx:      'Mes ordonnances',
    dossier: 'Mon dossier',
    profil:  'Mon profil',
  };
  const pageSubtitle = pageTitles[page];

  return (
    <div className="patient-shell">
      {/* ── Phone frame ── */}
      <div className="patient-phone">
        <div className="patient-screen">

          {/* Dynamic island */}
          <div className="patient-island" />

          {/* iOS-style status bar */}
          <div className="patient-statusbar">
            <span className="patient-statusbar-time">{clock}</span>
            <div className="patient-statusbar-icons">
              {/* Signal bars */}
              <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
                <rect x="0" y="7" width="3" height="5" rx="1" fill="currentColor" opacity=".35"/>
                <rect x="4.5" y="5" width="3" height="7" rx="1" fill="currentColor" opacity=".55"/>
                <rect x="9" y="2.5" width="3" height="9.5" rx="1" fill="currentColor" opacity=".75"/>
                <rect x="13.5" y="0" width="3" height="12" rx="1" fill="currentColor"/>
              </svg>
              {/* WiFi */}
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <path d="M8 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" fill="currentColor"/>
                <path d="M3.5 6.5a6.5 6.5 0 0 1 9 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".6"/>
                <path d="M1 3.5a10 10 0 0 1 14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".3"/>
              </svg>
              {/* Battery */}
              <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
                <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity=".35"/>
                <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor"/>
                <path d="M22.5 4v4a2 2 0 0 0 0-4z" fill="currentColor" fillOpacity=".4"/>
              </svg>
            </div>
          </div>

          {/* ── App content ── */}
          <div className="patient-app">
            {/* App bar */}
            <div className="patient-appbar">
              <div className="patient-appbar-icon">
                <Icon name="plus" size={17} />
              </div>
              <div>
                <div className="patient-appbar-title">CliniqueCI</div>
                <div className="patient-appbar-sub">{pageSubtitle || 'Espace patient'}</div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="patient-scroll">
              <div className="patient-scroll-inner">
                {page === 'home'    && <PatientHome currentUser={user} onNavigate={p => setPage(p)} />}
                {page === 'book'    && <PatientBooking onDone={() => setPage('rdv')} />}
                {page === 'rdv'     && <PatientRDVList onBook={() => setPage('book')} />}
                {page === 'rx'      && <PatientRxList />}
                {page === 'dossier' && <PatientDossier />}
                {page === 'profil'  && <PatientProfile currentUser={user} onLogout={logout} />}
              </div>
            </div>

            {/* Bottom tab bar */}
            <div className="patient-tabbar">
              {tabs.map(t => (
                <button
                  key={t.id}
                  className={`patient-tab ${page === t.id || (t.id === 'rdv' && page === 'book') ? 'active' : ''}`}
                  onClick={() => setPage(t.id)}
                >
                  <div className="tab-icon-wrap">
                    <Icon name={t.icon} size={19} />
                  </div>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Home indicator */}
          <div className="patient-home-ind" />
        </div>
      </div>
    </div>
  );
}
