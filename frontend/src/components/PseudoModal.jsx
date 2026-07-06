import { useState } from 'react';

export default function PseudoModal({ onSubmit }) {
  const [value, setValue] = useState('');

  function submit() {
    if (value.trim()) onSubmit(value.trim());
  }

  return (
    <div className="overlay">
      <div className="modal">
        <h2>Qui es-tu, aventurière ?</h2>
        <p className="modal-sub">Ton pseudo permet de savoir qui a écrit quoi dans le registre.</p>
        <div className="field">
          <label>Pseudo</label>
          <input
            type="text"
            autoFocus
            value={value}
            placeholder="ex. Elenya"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={submit}>
            Entrer dans la guilde
          </button>
        </div>
      </div>
    </div>
  );
}
