import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const CATS = [
  { value: '', label: 'Tous' },
  { value: 'medicament', label: '💊 Médicaments' },
  { value: 'materiel', label: '🩺 Matériel' },
  { value: 'consommable', label: '📦 Consommables' },
];

const CAT_COLORS = {
  medicament: '#0d7a5f',
  materiel:   '#2563eb',
  consommable:'#d97706',
};

export default function StockPage() {
  const qc = useQueryClient();
  const [cat, setCat] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [movItem, setMovItem] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'medicament', unit: 'unité', quantity: 0, min_quantity: 5, unit_price: '', supplier: '' });
  const [movForm, setMovForm] = useState({ type: 'in', quantity: 1, reason: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['stock', cat, lowOnly],
    queryFn: () => api.get(`/stock?${cat ? `category=${cat}&` : ''}${lowOnly ? 'lowStock=true' : ''}`),
  });

  const { data: stats } = useQuery({
    queryKey: ['stock-stats'],
    queryFn: async () => {
      const all = await api.get('/stock');
      const low = all.filter(i => i.quantity <= i.min_quantity).length;
      const total = all.length;
      const value = all.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);
      return { total, low, value };
    },
  });

  const createMut = useMutation({
    mutationFn: (data) => api.post('/stock', data),
    onSuccess: () => { qc.invalidateQueries(['stock']); qc.invalidateQueries(['stock-stats']); setShowForm(false); resetForm(); setSuccess('Article ajouté'); setTimeout(() => setSuccess(''), 3000); },
    onError: (e) => setError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/stock/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['stock']); setEditItem(null); resetForm(); setSuccess('Article mis à jour'); setTimeout(() => setSuccess(''), 3000); },
    onError: (e) => setError(e.message),
  });

  const movMut = useMutation({
    mutationFn: ({ id, data }) => api.post(`/stock/${id}/movements`, data),
    onSuccess: (res) => {
      qc.invalidateQueries(['stock']);
      qc.invalidateQueries(['stock-stats']);
      setMovItem(null);
      setMovForm({ type: 'in', quantity: 1, reason: '' });
      setSuccess(`Mouvement enregistré — Nouveau stock : ${res.new_quantity}`);
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: (e) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/stock/${id}`),
    onSuccess: () => { qc.invalidateQueries(['stock']); qc.invalidateQueries(['stock-stats']); },
    onError: (e) => setError(e.message),
  });

  function resetForm() {
    setForm({ name: '', category: 'medicament', unit: 'unité', quantity: 0, min_quantity: 5, unit_price: '', supplier: '' });
    setError('');
  }

  function openEdit(item) {
    setEditItem(item);
    setForm({ name: item.name, category: item.category, unit: item.unit, quantity: item.quantity, min_quantity: item.min_quantity, unit_price: item.unit_price || '', supplier: item.supplier || '' });
    setShowForm(true);
  }

  const filtered = items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2e1a', margin: 0 }}>📦 Gestion du Stock</h1>
          <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>Médicaments, matériel et consommables</p>
        </div>
        <button onClick={() => { resetForm(); setEditItem(null); setShowForm(true); }} style={{ background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          + Ajouter un article
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total articles', value: stats?.total ?? '…', color: '#0d7a5f', bg: '#e8f5f1' },
          { label: 'Stocks faibles', value: stats?.low ?? '…', color: '#dc2626', bg: '#fef2f2' },
          { label: 'Valeur estimée', value: stats?.value ? `${stats.value.toLocaleString('fr-FR')} FCFA` : '…', color: '#d97706', bg: '#fffbeb' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="🔍 Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px', fontSize: 14, minWidth: 200 }}
        />
        {CATS.map(c => (
          <button key={c.value} onClick={() => setCat(c.value)}
            style={{ border: `1px solid ${cat === c.value ? '#0d7a5f' : '#ddd'}`, background: cat === c.value ? '#0d7a5f' : '#fff', color: cat === c.value ? '#fff' : '#444', borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontSize: 13 }}>
            {c.label}
          </button>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} />
          ⚠️ Stock faible
        </label>
      </div>

      {success && <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#065f46', fontSize: 14 }}>{success}</div>}
      {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#991b1b', fontSize: 14 }}>{error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', float: 'right', color: '#991b1b' }}>✕</button></div>}

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Aucun article trouvé</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Nom', 'Catégorie', 'Qté', 'Min', 'Unité', 'Prix unit.', 'Fournisseur', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isLow = item.quantity <= item.min_quantity;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: isLow ? '#fff9f9' : '#fff' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      {isLow && <span style={{ color: '#dc2626', marginRight: 6 }}>⚠️</span>}
                      {item.name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: `${CAT_COLORS[item.category]}18`, color: CAT_COLORS[item.category], borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 500 }}>{item.category}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: isLow ? '#dc2626' : '#1a2e1a' }}>{item.quantity}</td>
                    <td style={{ padding: '12px 16px', color: '#999' }}>{item.min_quantity}</td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>{item.unit}</td>
                    <td style={{ padding: '12px 16px', color: '#444' }}>{item.unit_price ? `${Number(item.unit_price).toLocaleString('fr-FR')} FCFA` : '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>{item.supplier || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setMovItem(item)} style={{ background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>Mouvement</button>
                        <button onClick={() => openEdit(item)} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #ddd', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>Modifier</button>
                        <button onClick={() => { if (confirm('Supprimer cet article ?')) deleteMut.mutate(item.id); }} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#0006', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1a2e1a' }}>{editItem ? 'Modifier l\'article' : 'Ajouter un article'}</h2>
            {error && <div style={{ background: '#fee2e2', borderRadius: 8, padding: '8px 14px', marginBottom: 16, color: '#991b1b', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'grid', gap: 14 }}>
              {[
                { label: 'Nom *', key: 'name', type: 'text' },
                { label: 'Unité', key: 'unit', type: 'text' },
                { label: 'Quantité initiale', key: 'quantity', type: 'number' },
                { label: 'Stock minimum (alerte)', key: 'min_quantity', type: 'number' },
                { label: 'Prix unitaire (FCFA)', key: 'unit_price', type: 'number' },
                { label: 'Fournisseur', key: 'supplier', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Catégorie</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14 }}>
                  <option value="medicament">Médicament</option>
                  <option value="materiel">Matériel</option>
                  <option value="consommable">Consommable</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, border: '1px solid #ddd', background: '#f9fafb', borderRadius: 8, padding: '11px', cursor: 'pointer' }}>Annuler</button>
              <button
                onClick={() => editItem ? updateMut.mutate({ id: editItem.id, data: form }) : createMut.mutate(form)}
                disabled={createMut.isPending || updateMut.isPending}
                style={{ flex: 2, background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 600, cursor: 'pointer' }}>
                {editItem ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement modal */}
      {movItem && (
        <div style={{ position: 'fixed', inset: 0, background: '#0006', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setMovItem(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 400, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#1a2e1a' }}>Mouvement de stock</h2>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>{movItem.name} — Stock actuel : <strong>{movItem.quantity}</strong></p>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Type de mouvement</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ v: 'in', l: '📥 Entrée', c: '#0d7a5f' }, { v: 'out', l: '📤 Sortie', c: '#dc2626' }, { v: 'adjustment', l: '🔧 Ajustement', c: '#d97706' }].map(opt => (
                    <button key={opt.v} onClick={() => setMovForm(p => ({ ...p, type: opt.v }))}
                      style={{ flex: 1, border: `1px solid ${movForm.type === opt.v ? opt.c : '#ddd'}`, background: movForm.type === opt.v ? `${opt.c}18` : '#fff', color: movForm.type === opt.v ? opt.c : '#666', borderRadius: 8, padding: '8px 4px', cursor: 'pointer', fontSize: 12, fontWeight: movForm.type === opt.v ? 700 : 400 }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                  {movForm.type === 'adjustment' ? 'Nouvelle quantité absolue' : 'Quantité'}
                </label>
                <input type="number" min="1" value={movForm.quantity} onChange={e => setMovForm(p => ({ ...p, quantity: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Motif (optionnel)</label>
                <input type="text" value={movForm.reason} onChange={e => setMovForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Ex: commande reçue, utilisation patient..."
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => setMovItem(null)} style={{ flex: 1, border: '1px solid #ddd', background: '#f9fafb', borderRadius: 8, padding: '11px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => movMut.mutate({ id: movItem.id, data: movForm })} disabled={movMut.isPending}
                style={{ flex: 2, background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 600, cursor: 'pointer' }}>
                Enregistrer le mouvement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
