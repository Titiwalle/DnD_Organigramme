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

// Liste avec couleur + renommage par élément — utilisée pour les affectations ET les types de liens.
function ColoredList({ title, hint, addPlaceholder, items, onAdd, onRename, onColorChange, onDelete, protectedItems = [] }) {
  const [value, setValue] = useState('');
  const [color, setColor] = useState('#c9a227');
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');

  function isProtected(item) {
    return protectedItems.some((p) => p.toLowerCase() === item.name.toLowerCase());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    await onAdd(value.trim(), color);
    setValue('');
    setColor('#c9a227');
  }

  function startEditing(item) {
    setEditing(item.name);
    setEditValue(item.name);
  }

  async function saveRename(item) {
    if (!editValue.trim() || editValue.trim() === item.name) {
      setEditing(null);
      return;
    }
    await onRename(item.name, editValue.trim());
    setEditing(null);
  }

  return (
    <div className="link-form-card">
      <h3 className="link-form-title">{title}</h3>
      {hint && <p className="modal-sub" style={{ margin: '0 0 14px' }}>{hint}</p>}

      <form onSubmit={handleSubmit} className="link-form" style={{ marginBottom: 16 }}>
        <input type="text" placeholder={addPlaceholder} value={value} onChange={(e) => setValue(e.target.value)} />
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
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <input
                  type="color"
                  value={item.color}
                  onChange={(e) => onColorChange(item.name, e.target.value)}
                  className="color-swatch-input"
                  title="Changer la couleur"
                />
                {editing === item.name ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                    style={{ flex: 1, maxWidth: 220 }}
                  />
                ) : (
                  item.name
                )}
              </span>
              <span style={{ display: 'flex', gap: 12 }}>
                {editing === item.name ? (
                  <>
                    <button onClick={() => saveRename(item)}>Enregistrer</button>
                    <button onClick={() => setEditing(null)}>Annuler</button>
                  </>
                ) : (
                  !isProtected(item) && <button onClick={() => startEditing(item)}>Modifier</button>
                )}
                {!isProtected(item) && <button onClick={() => setConfirm(item.name)}>Supprimer</button>}
              </span>
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
      const updated = await api.updateAffectation(value, { color });
      onAffectationsChange(updated);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleRenameAffectation(value, name) {
    try {
      const updated = await api.updateAffectation(value, { name });
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

  async function handleAddRelationType(value, color) {
    try {
      const updated = await api.createRelationType(value, color);
      onRelationTypesChange(updated);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleChangeRelationTypeColor(value, color) {
    try {
      const updated = await api.updateRelationType(value, { color });
      onRelationTypesChange(updated);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleRenameRelationType(value, name) {
    try {
      const updated = await api.updateRelationType(value, { name });
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
      <div className="link-form-card">
        <h3 className="link-form-title">Sauvegarde</h3>
        <p className="modal-sub" style={{ margin: '0 0 14px' }}>
          Télécharge une copie de toutes les données du site (personnages, comptes, affectations,
          statuts, liens…) au format .zip. À garder de côté au cas où.
        </p>
        <a href="/api/admin/export-data" className="btn btn-primary btn-sm">
          Télécharger une sauvegarde
        </a>
      </div>
      <ColoredList
        title="Affectations"
        hint="Villes, académies, guildes… proposées dans le formulaire de fiche. Chacune a une couleur, utilisée pour ses groupes dans l'onglet Liens."
        addPlaceholder="Nouvelle affectation…"
        items={affectations}
        onAdd={handleAddAffectation}
        onRename={handleRenameAffectation}
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
      <ColoredList
        title="Types de liens"
        hint="Proposés dans l'onglet Liens pour relier deux personnages ou affectations. « Autre » ne peut être ni renommé ni supprimé, mais sa couleur reste modifiable."
        addPlaceholder="Nouveau type de lien…"
        items={relationTypes}
        onAdd={handleAddRelationType}
        onRename={handleRenameRelationType}
        onColorChange={handleChangeRelationTypeColor}
        onDelete={handleDeleteRelationType}
        protectedItems={['Autre']}
      />
    </div>
  );
}
