import { useState } from 'react';
import { CLASSES, ClassIcon } from '../icons.jsx';
import AvatarCropper from './AvatarCropper.jsx';

export default function CharacterForm({
  initialData = {},
  onSubmit,
  onCancel,
  submitLabel = 'Enregistrer',
  statutSuggestions = [],
  affectationSuggestions = []
}) {
  const [form, setForm] = useState({
    name: initialData.name || '',
    role: initialData.role || 'Secondaire',
    classe: initialData.classe || CLASSES[0],
    classeCustom: initialData.classeCustom || '',
    avatar: initialData.avatar || '',
    affectationType: initialData.affectationType || 'Ville',
    affectationNom: initialData.affectationNom || '',
    affectationPlus: initialData.affectationPlus || '',
    descriptionGenerale: initialData.descriptionGenerale || ''
  });
  const [rawImage, setRawImage] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRawImage(reader.result);
    reader.readAsDataURL(file);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="avatar-picker">
        <div className="avatar-preview">
          {form.avatar ? <img src={form.avatar} alt="" /> : <ClassIcon classe={form.classe} />}
        </div>
        <div className="avatar-actions">
          <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
            {form.avatar ? 'Changer la photo' : 'Ajouter une photo'}
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
          {form.avatar && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => update('avatar', '')}>
              Retirer
            </button>
          )}
        </div>
      </div>

      <div className="field">
        <label>Nom du personnage</label>
        <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} required autoFocus />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Rôle</label>
          <select value={form.role} onChange={(e) => update('role', e.target.value)}>
            <option value="Principal">Principal</option>
            <option value="Secondaire">Secondaire</option>
          </select>
        </div>
        <div className="field">
          <label>Classe</label>
          <select value={form.classe} onChange={(e) => update('classe', e.target.value)}>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.classe === 'Autre' && (
        <div className="field">
          <label>Précise la classe</label>
          <input type="text" value={form.classeCustom} onChange={(e) => update('classeCustom', e.target.value)} />
        </div>
      )}

      <div className="field-row">
        <div className="field">
          <label>Affectation</label>
          <select value={form.affectationType} onChange={(e) => update('affectationType', e.target.value)}>
            {(affectationSuggestions.some((a) => a.toLowerCase() === form.affectationType.toLowerCase())
              ? affectationSuggestions
              : [form.affectationType, ...affectationSuggestions].filter(Boolean)
            ).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Nom du lieu</label>
          <input
            type="text"
            placeholder="ex. Académie d'Aetheria"
            value={form.affectationNom}
            onChange={(e) => update('affectationNom', e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label>Fonction / statut</label>
        <input
          type="text"
          list="statutList"
          placeholder="ex. Étudiante, Cheffe de guilde…"
          value={form.affectationPlus}
          onChange={(e) => update('affectationPlus', e.target.value)}
        />
        <datalist id="statutList">
          {statutSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      <div className="field">
        <label>Description générale</label>
        <textarea
          placeholder="Apparence, histoire, personnalité…"
          value={form.descriptionGenerale}
          onChange={(e) => update('descriptionGenerale', e.target.value)}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>

      {rawImage && (
        <AvatarCropper
          imageSrc={rawImage}
          onCancel={() => setRawImage(null)}
          onSave={(dataUrl) => {
            update('avatar', dataUrl);
            setRawImage(null);
          }}
        />
      )}
    </form>
  );
}
