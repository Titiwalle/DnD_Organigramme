import { useState, useEffect } from 'react';
import { api } from './api.js';
import CharacterCard from './components/CharacterCard.jsx';
import CharacterForm from './components/CharacterForm.jsx';
import CharacterDetail from './components/CharacterDetail.jsx';
import LoginPage from './components/LoginPage.jsx';
import AccountManager from './components/AccountManager.jsx';
import AdminTools from './components/AdminTools.jsx';
import LinksView from './components/LinksView.jsx';
import Mascot from './components/Mascot.jsx';
import ConfirmModal from './components/ConfirmModal.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [view, setView] = useState('registre');
  const [characters, setCharacters] = useState([]);
  const [statuts, setStatuts] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [relationTypes, setRelationTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', role: 'all', affectation: 'all' });
  const [showNewModal, setShowNewModal] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api
      .me()
      .then((u) => {
        setUser(u);
        if (u) return loadAppData();
      })
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  function loadAppData() {
    setLoading(true);
    return Promise.all([
      api.getCharacters().then(setCharacters).catch(() => showToast('Impossible de charger le registre.')),
      api.getStatuts().then(setStatuts).catch(() => {}),
      api.getAffectations().then(setAffectations).catch(() => {}),
      api.getRelationTypes().then(setRelationTypes).catch(() => {})
    ]).finally(() => setLoading(false));
  }

  function rememberStatutLocally(value) {
    const v = (value || '').trim();
    if (!v) return;
    setStatuts((prev) => (prev.some((s) => s.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v].sort((a, b) => a.localeCompare(b))));
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key !== 'Escape') return;
      if (confirm) { setConfirm(null); return; }
      if (showNewModal) { setShowNewModal(false); return; }
      if (showAccountManager) { setShowAccountManager(false); return; }
      if (detailId) { setDetailId(null); return; }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirm, showNewModal, showAccountManager, detailId]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  async function handleLogin(username, password) {
    const u = await api.login(username, password);
    setUser(u);
    await loadAppData();
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch (e) {
      // on déconnecte quand même côté client
    }
    setUser(null);
    setCharacters([]);
    setStatuts([]);
    setAffectations([]);
    setRelationTypes([]);
    setShowAccountManager(false);
  }

  async function handleCreate(data) {
    try {
      const created = await api.createCharacter(data);
      setCharacters((prev) => [created, ...prev]);
      rememberStatutLocally(created.affectationPlus);
      setShowNewModal(false);
    } catch (e) {
      showToast(e.message);
    }
  }

  async function handleUpdateGeneral(id, data) {
    try {
      const updated = await api.updateCharacter(id, data);
      setCharacters((prev) => prev.map((c) => (c.id === id ? updated : c)));
      rememberStatutLocally(updated.affectationPlus);
    } catch (e) {
      showToast(e.message);
    }
  }

  async function handleDeleteCharacter(id) {
    try {
      await api.deleteCharacter(id);
      setCharacters((prev) => prev.filter((c) => c.id !== id));
      setDetailId(null);
      setConfirm(null);
      showToast('Fiche supprimée du registre.');
    } catch (e) {
      showToast(e.message);
    }
  }

  async function handleSaveTestimony(id, text) {
    try {
      const updated = await api.saveTestimony(id, text);
      setCharacters((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e) {
      showToast(e.message);
    }
  }

  async function handleDeleteTestimony(id) {
    try {
      const updated = await api.deleteTestimony(id);
      setCharacters((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setConfirm(null);
    } catch (e) {
      showToast(e.message);
    }
  }

  const filtered = characters.filter((c) => {
    if (filters.role !== 'all' && c.role !== filters.role) return false;
    if (filters.affectation !== 'all' && c.affectationType !== filters.affectation) return false;
    if (filters.search && !c.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const detailChar = characters.find((c) => c.id === detailId);

  let content;

  if (authLoading) {
    content = <div className="loading-screen">Ouverture du registre…</div>;
  } else if (!user) {
    content = <LoginPage onLogin={handleLogin} />;
  } else if (loading) {
    content = <div className="loading-screen">Ouverture du registre…</div>;
  } else {
    content = (
    <div id="app">
      <div className="topbar">
        <div>
          <p className="brand-eyebrow">Registre commun</p>
          <h1 className="brand-title">Le Registre des Compagnons</h1>
        </div>
        <div className="whoami">
          Connectée en tant que <b>{user.username}</b>
          {user.role === 'admin' ? ' · admin' : ''}
          {user.role === 'admin' && <button onClick={() => setShowAccountManager(true)}>gérer les comptes</button>}
          <button onClick={handleLogout}>se déconnecter</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${view === 'registre' ? 'active' : ''}`} onClick={() => setView('registre')}>
          Registre
        </button>
        <button className={`tab ${view === 'liens' ? 'active' : ''}`} onClick={() => setView('liens')}>
          Liens
        </button>
        {user.role === 'admin' && (
          <button className={`tab ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
            Admin
          </button>
        )}
      </div>

      {view === 'registre' && (
        <>
          <div className="toolbar">
        <input
          type="text"
          placeholder="Rechercher un nom…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <select value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}>
          <option value="all">Tous les rôles</option>
          <option value="Principal">Principal</option>
          <option value="Secondaire">Secondaire</option>
        </select>
        <select value={filters.affectation} onChange={(e) => setFilters((f) => ({ ...f, affectation: e.target.value }))}>
          <option value="all">Toutes affectations</option>
          {affectations.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <span className="spacer"></span>
        <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
          + Nouveau compagnon
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className="grid">
          {filtered.map((c) => (
            <CharacterCard key={c.id} character={c} onOpen={setDetailId} />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <div className="empty-state">
          <h3>Le registre est vierge</h3>
          <p>Inscris le premier compagnon pour commencer la chronique.</p>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setShowNewModal(true)}>
            + Nouveau compagnon
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <p>Aucun compagnon ne correspond à ces filtres.</p>
        </div>
      )}
        </>
      )}

      {view === 'liens' && <LinksView characters={characters} relationTypes={relationTypes} showToast={showToast} />}

      {view === 'admin' && user.role === 'admin' && (
        <AdminTools
          statuts={statuts}
          affectations={affectations}
          relationTypes={relationTypes}
          onStatutsChange={setStatuts}
          onAffectationsChange={setAffectations}
          onRelationTypesChange={setRelationTypes}
          showToast={showToast}
        />
      )}

      {showNewModal && (
        <div className="overlay">
          <div className="modal">
            <h2>Inscrire un compagnon</h2>
            <p className="modal-sub">Ajoute une nouvelle fiche au registre commun.</p>
            <CharacterForm
              submitLabel="Ajouter au registre"
              statutSuggestions={statuts}
              affectationSuggestions={affectations}
              onSubmit={handleCreate}
              onCancel={() => setShowNewModal(false)}
            />
          </div>
        </div>
      )}

      {showAccountManager && (
        <AccountManager currentUsername={user.username} onClose={() => setShowAccountManager(false)} onToast={showToast} />
      )}

      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {detailChar && (
        <CharacterDetail
          character={detailChar}
          pseudo={user.username}
          statutSuggestions={statuts}
          affectationSuggestions={affectations}
          onClose={() => setDetailId(null)}
          onUpdate={handleUpdateGeneral}
          onDelete={(id) =>
            setConfirm({
              message: `Supprimer définitivement la fiche de ${detailChar.name} ?`,
              onConfirm: () => handleDeleteCharacter(id)
            })
          }
          onSaveTestimony={handleSaveTestimony}
          onDeleteTestimony={(id) =>
            setConfirm({
              message: 'Supprimer ton témoignage sur ce personnage ?',
              onConfirm: () => handleDeleteTestimony(id)
            })
          }
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
    );
  }

  return (
    <>
      {content}
      <Mascot />
    </>
  );
}
