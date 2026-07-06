import { useState } from 'react';
import { api } from '../api.js';
import ConfirmModal from './ConfirmModal.jsx';

function ManagedList({ title, hint, items, onAdd, onDelete, protectedItems = [] }) {
  const [value, setValue] = useState('');
  const [confirm, setConfirm] = useState(null);

  function isProtected(item) {
    return protectedItems.some((p) => p.toLowerCase() === item.toLowerCase());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    await onAdd(value.trim());
    setValue('');
  }

  return (
    <div className="link-form-card">
      <h3 className="link-form-title">{title}</h3>
      {hint && <p className="modal-sub" style={{ margin: '0 0 14px' }}>{hint}</p>}

      <form onSubmit={handleSubmit} className="link-form" style={{ marginBottom: 16 }}>
        <input type="text" placeholder="Nouvelle valeur…" value={value} onChange={(e) => setValue(e.target.value)} />
        <button type="submit" className="btn btn-primary btn-sm">
          Ajouter
        </button>
      </form>

      {items.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: 14 }}>Aucune valeur pour l'instant.</p>
      ) : (
        <div className="link-list">
          {items.map((item) => (
            <div key={item} className="link-list-row">
              <span>{item}</span>
              {!isProtected(item) && <button onClick={() => setConfirm(item)}>Supprimer</button>}
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message={`Supprimer "${confirm}" de la liste ? Les fiches qui l'utilisent déjà ne sont pas modifiées.`}
          onConfirm={() => {
            onDelete(confirm);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function AffectationList({ items, onAdd, onColorChange, onDelete }) {
  const [value, setValue] = useState('');
  const [color, setColor] = useState('#c9a227');
  const [confirm, setConfirm] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    await onAdd(value.trim(), color);
    setValue('');
    setColor('#c9a227');
  }

  return (
    <div className="link-form-card">
      <h3 className="link-form-title">Affectations</h3>
      <p className="modal-sub" style={{ margin: '0 0 14px' }}>
        Villes, académies, guildes… proposées dans le formulaire de fiche. Chacune a une couleur,
        utilisée pour ses groupes dans l'onglet Liens.
      </p>

      <form onSubmit={handleSubmit} className="link-form" style={{ marginBottom: 16 }}>
        <input type="text" placeholder="Nouvelle affectation…" value={value} onChange={(e) => setValue(e.target.value)} />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="color-swatch-input"
          title="Couleur"
        />
        <button type="submit" className="btn btn-primary btn-sm">
          Ajouter
        </button>
      </form>

      {items.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: 14 }}>Aucune valeur pour l'instant.</p>
      ) : (
        <div className="link-list">
          {items.map((item) => (
            <div key={item.name} className="link-list-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={item.color}
                  onChange={(e) => onColorChange(item.name, e.target.value)}
                  className="color-swatch-input"
                  title="Changer la couleur"
                />
                {item.name}
              </span>
              <button onClick={() => setConfirm(item.name)}>Supprimer</button>
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message={`Supprimer "${confirm}" de la liste ? Les fiches qui l'utilisent déjà ne sont pas modifiées.`}
          onConfirm={() => {
            onDelete(confirm);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

export default function AdminTools({ statuts, affectations, relationTypes, onStatutsChange, onAffectationsChange, onRelationTypesChange, showToast }) {
  async function handleAddAffectation(value, color) {
    try {
      const updated = await api.createAffectation(value, color);
      onAffectationsChange(updated);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleChangeAffectationColor(value, color) {
    try {
      const updated = await api.updateAffectationColor(value, color);
      onAffectationsChange(updated);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleDeleteAffectation(value) {
    try {
      const updated = await api.deleteAffectation(value);
      onAffectationsChange(updated);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleAddStatut(value) {
    try {
      const updated = await api.createStatut(value);
      onStatutsChange(updated);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleDeleteStatut(value) {
    try {
      const updated = await api.deleteStatut(value);
      onStatutsChange(updated);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleAddRelationType(value) {
    try {
      const updated = await api.createRelationType(value);
      onRelationTypesChange(updated);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleDeleteRelationType(value) {
    try {
      const updated = await api.deleteRelationType(value);
      onRelationTypesChange(updated);
    } catch (err) {
      showToast(err.message);
    }
  }

  return (
    <div>
      <AffectationList
        items={affectations}
        onAdd={handleAddAffectation}
        onColorChange={handleChangeAffectationColor}
        onDelete={handleDeleteAffectation}
      />
      <ManagedList
        title="Fonctions / statuts"
        hint="Proposées dans le champ « Fonction / statut » des fiches."
        items={statuts}
        onAdd={handleAddStatut}
        onDelete={handleDeleteStatut}
      />
      <ManagedList
        title="Types de liens"
        hint="Proposés dans l'onglet Liens pour relier deux personnages ou affectations. « Autre » ne peut pas être supprimé."
        items={relationTypes}
        onAdd={handleAddRelationType}
        onDelete={handleDeleteRelationType}
        protectedItems={['Autre']}
      />
    </div>
  );
}
