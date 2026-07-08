import { useState, useEffect } from 'react';
import { api } from '../api.js';
import ConfirmModal from './ConfirmModal.jsx';

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AccountManager({ currentUsername, onClose, onToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'member' });
  const [editingUsername, setEditingUsername] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    api.getUsers().then(setUsers).catch((e) => onToast(e.message)).finally(() => setLoading(false));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newUser.username.trim() || newUser.password.length < 4) {
      onToast('Pseudo requis et mot de passe de 4 caractères minimum.');
      return;
    }
    try {
      await api.createUser(newUser);
      setNewUser({ username: '', password: '', role: 'member' });
      setShowNew(false);
      refresh();
    } catch (err) {
      onToast(err.message);
    }
  }

  async function handleRoleChange(username, role) {
    try {
      await api.updateUser(username, { role });
      refresh();
    } catch (err) {
      onToast(err.message);
    }
  }

  async function handlePasswordReset(username) {
    if (editPassword.length < 4) {
      onToast('Mot de passe de 4 caractères minimum.');
      return;
    }
    try {
      await api.updateUser(username, { password: editPassword });
      setEditingUsername(null);
      setEditPassword('');
      onToast('Mot de passe mis à jour.');
    } catch (err) {
      onToast(err.message);
    }
  }

  async function handleDelete(username) {
    try {
      await api.deleteUser(username);
      setConfirm(null);
      refresh();
    } catch (err) {
      onToast(err.message);
    }
  }

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Gérer les comptes</h2>
            <p className="modal-sub">Créer, modifier ou supprimer les accès au registre.</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Chargement…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {users.map((u) => (
              <div
                key={u.username}
                className="testimony"
                style={{ borderLeftColor: u.role === 'admin' ? 'var(--gold)' : 'var(--border)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span className="testimony-author">{u.username}</span>{' '}
                    <span className={`badge ${u.role === 'admin' ? 'badge-principal' : 'badge-secondaire'}`}>
                      {u.role === 'admin' ? 'Admin' : u.role === 'lecteur' ? 'Lecteur' : 'Membre'}
                    </span>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                      Créé le {fmtDate(u.createdAt)}
                    </div>
                  </div>

                  {u.username !== currentUsername && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.username, e.target.value)}
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          padding: '5px 8px',
                          borderRadius: 'var(--radius)',
                          fontSize: 12.5
                        }}
                      >
                        <option value="member">Membre</option>
                        <option value="lecteur">Lecteur</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button className="btn btn-sm" onClick={() => { setEditingUsername(u.username); setEditPassword(''); }}>
                        Mot de passe
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirm({ username: u.username })}>
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>

                {editingUsername === u.username && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <input
                      type="password"
                      placeholder="Nouveau mot de passe"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius)'
                      }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => handlePasswordReset(u.username)}>
                      Enregistrer
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingUsername(null)}>
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showNew ? (
          <form onSubmit={handleCreate} style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 18 }}>
            <div className="field-row">
              <div className="field">
                <label>Pseudo</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Mot de passe</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="field">
              <label>Rôle</label>
              <select value={newUser.role} onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}>
                <option value="member">Membre</option>
                <option value="lecteur">Lecteur</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Créer le compte
              </button>
            </div>
          </form>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + Nouveau compte
          </button>
        )}

        {confirm && (
          <ConfirmModal
            message={`Supprimer le compte ${confirm.username} ?`}
            onConfirm={() => handleDelete(confirm.username)}
            onCancel={() => setConfirm(null)}
          />
        )}
      </div>
    </div>
  );
}
