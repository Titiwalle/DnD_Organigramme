import { useState, useEffect } from 'react';
import { api } from '../api.js';

const STATE_LABELS = {
  talking: 'Quand il parle',
  clicked: 'Quand on clique dessus',
  hover: 'Au survol de la souris'
};

function StateEditor({ stateKey, current, onSave, onReset, showToast }) {
  const [type, setType] = useState(current?.type || 'image');
  const [text, setText] = useState(current?.type === 'text' ? current.value : '');
  const [textColor, setTextColor] = useState(current?.color || '#ece3cf');
  const [imagePreview, setImagePreview] = useState(current?.type === 'image' ? current.value : '');
  const [size, setSize] = useState(current?.size || 100);

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (type === 'image') {
      if (!imagePreview) {
        showToast('Choisis une image.');
        return;
      }
      await onSave(stateKey, 'image', imagePreview, null, size);
    } else {
      if (!text.trim()) {
        showToast('Écris un texte.');
        return;
      }
      await onSave(stateKey, 'text', text.trim(), textColor, size);
    }
  }

  return (
    <div className="link-form-card">
      <h3 className="link-form-title">{STATE_LABELS[stateKey]}</h3>
      <p className="modal-sub" style={{ margin: '0 0 14px' }}>
        {current
          ? `Actuellement : ${current.type === 'image' ? 'une image personnalisée' : `le texte « ${current.value} »`}.`
          : "Actuellement : rien (juste la mascotte normale)."}
      </p>

      <div className="link-form" style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
          <input type="radio" checked={type === 'image'} onChange={() => setType('image')} /> Image
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
          <input type="radio" checked={type === 'text'} onChange={() => setType('text')} /> Texte
        </label>
      </div>

      {type === 'image' ? (
        <div className="avatar-picker" style={{ marginBottom: 12 }}>
          <div className="avatar-preview" style={{ borderRadius: 8, width: 64, height: 64 }}>
            {imagePreview && <img src={imagePreview} alt="" style={{ borderRadius: 8 }} />}
          </div>
          <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
            Choisir une image
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
        </div>
      ) : (
        <>
          <div className="field" style={{ marginBottom: 12 }}>
            <input type="text" placeholder="Ce que Thêtas dit…" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <label style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Couleur du texte</label>
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="color-swatch-input"
            />
          </div>
        </>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 6 }}>
          Taille : {size}%
        </label>
        <input
          type="range"
          min="50"
          max="200"
          step="5"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
          Enregistrer
        </button>
        {current && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onReset(stateKey)}>
            Revenir par défaut
          </button>
        )}
      </div>
    </div>
  );
}

export default function ThetasTools({ showToast }) {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api.getMascotConfig().then(setConfig).catch((e) => showToast(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(state, type, value, color, size) {
    try {
      const updated = await api.setMascotState(state, type, value, color, size);
      setConfig(updated);
      showToast('Mascotte mise à jour pour tout le monde.');
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleReset(state) {
    try {
      const updated = await api.resetMascotState(state);
      setConfig(updated);
    } catch (err) {
      showToast(err.message);
    }
  }

  if (!config) {
    return <p className="modal-sub">Chargement…</p>;
  }

  return (
    <div>
      <p className="modal-sub" style={{ marginBottom: 16 }}>
        Personnalise ce que la mascotte affiche pour <b>tout le monde</b>, dans trois situations.
        L'image ou le texte apparaît juste au-dessus de Thêtas, sans bouger avec ses propres
        animations — Thêtas garde toujours son visage habituel en dessous.
      </p>
      {Object.keys(STATE_LABELS).map((key) => (
        <StateEditor
          key={key}
          stateKey={key}
          current={config[key]}
          onSave={handleSave}
          onReset={handleReset}
          showToast={showToast}
        />
      ))}
    </div>
  );
}
