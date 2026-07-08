import { useState } from 'react';
import { ClassIcon } from '../icons.jsx';
import CharacterForm from './CharacterForm.jsx';

function classLabel(c) {
  return c.classe === 'Autre' && c.classeCustom ? c.classeCustom : c.classe;
}

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function roleColorFor(roles, roleName) {
  const found = roles.find((r) => r.name.toLowerCase() === (roleName || '').toLowerCase());
  return found ? found.color : 'var(--text-dim)';
}

export default function CharacterDetail({
  character,
  pseudo,
  onClose,
  onUpdate,
  onDelete,
  onSaveTestimony,
  onDeleteTestimony,
  statutSuggestions,
  affectationSuggestions,
  roleSuggestions,
  roles = [],
  readOnly
}) {
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [editingTestimony, setEditingTestimony] = useState(false);
  const [testimonyText, setTestimonyText] = useState('');
  const roleColor = roleColorFor(roles, character.role);

  const temoignages = character.temoignages || [];
  const mine = temoignages.find((t) => t.author === pseudo);
  const others = temoignages.filter((t) => t.author !== pseudo);

  function startEditTestimony() {
    setTestimonyText(mine ? mine.text : '');
    setEditingTestimony(true);
  }

  function saveTestimony() {
    if (!testimonyText.trim()) return;
    onSaveTestimony(character.id, testimonyText.trim());
    setEditingTestimony(false);
  }

  return (
    <div className="overlay">
      <div className="detail-panel">
        <div className="detail-head">
          <div className="detail-head-left">
            <div className="seal lg">
              {character.avatar ? (
                <img src={character.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <ClassIcon classe={character.classe} />
              )}
            </div>
            <div>
              <p className="detail-name">{character.name}</p>
              <div className="detail-tags">
                <span className="badge" style={{ borderColor: roleColor, color: roleColor }}>
                  {character.role}
                </span>
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="detail-body">
          {editingGeneral ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <CharacterForm
                initialData={character}
                submitLabel="Enregistrer"
                statutSuggestions={statutSuggestions}
                affectationSuggestions={affectationSuggestions}
                roleSuggestions={roleSuggestions}
                onCancel={() => setEditingGeneral(false)}
                onSubmit={(data) => {
                  onUpdate(character.id, data);
                  setEditingGeneral(false);
                }}
              />
            </div>
          ) : (
            <>
              <div className="col-left">
                <div className="info-line">
                  <div className="info-label">Rôle</div>
                  <div className="info-value">
                    <span className="badge" style={{ borderColor: roleColor, color: roleColor }}>
                      {character.role}
                    </span>
                  </div>
                </div>
                <div className="info-line">
                  <div className="info-label">Classe</div>
                  <div className="info-value">{classLabel(character)}</div>
                </div>
                <div className="info-line">
                  <div className="info-label">Affectation</div>
                  <div className="info-value">
                    {character.affectationType} — {character.affectationNom || '—'}
                  </div>
                </div>
                <div className="info-line">
                  <div className="info-label">Fonction</div>
                  <div className="info-value">{character.affectationPlus || '—'}</div>
                </div>
                {!readOnly && (
                  <button className="btn btn-sm" style={{ marginTop: 6, width: '100%' }} onClick={() => setEditingGeneral(true)}>
                    Modifier la fiche
                  </button>
                )}
              </div>

              <div className="col-right">
                <div className="info-label">Description générale</div>
                <div className="desc-text">{character.descriptionGenerale || "Aucune description pour l'instant."}</div>
                <div className="desc-meta">
                  {character.descriptionAuteur
                    ? `Écrite par ${character.descriptionAuteur} · ${fmtDate(character.descriptionUpdatedAt)}`
                    : ''}
                </div>

                <div className="section-divider">
                  <span className="glyph">❖</span> Ce qu'en disent les joueuses <span className="glyph">❖</span>
                </div>

                {temoignages.length === 0 && (
                  <p style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: 14 }}>
                    Personne n'a encore laissé son mot.
                  </p>
                )}

                {others.map((t) => (
                  <div className="testimony" key={t.author}>
                    <div className="testimony-author">
                      {t.author} · {fmtDate(t.updatedAt)}
                    </div>
                    <div className="testimony-text">{t.text}</div>
                  </div>
                ))}

                {readOnly ? null : editingTestimony ? (
                  <div className="testimony mine testimony-form">
                    <div className="testimony-author">{pseudo} (toi)</div>
                    <textarea
                      value={testimonyText}
                      onChange={(e) => setTestimonyText(e.target.value)}
                      placeholder="Ton avis, ton vécu avec ce personnage…"
                    />
                    <button className="btn btn-primary btn-sm" onClick={saveTestimony}>
                      Enregistrer
                    </button>{' '}
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingTestimony(false)}>
                      Annuler
                    </button>
                  </div>
                ) : mine ? (
                  <div className="testimony mine">
                    <div className="testimony-author">
                      {mine.author} (toi) · {fmtDate(mine.updatedAt)}
                    </div>
                    <div className="testimony-text">{mine.text}</div>
                    {!readOnly && (
                      <div className="testimony-actions">
                        <button onClick={startEditTestimony}>Modifier</button>
                        <button onClick={() => onDeleteTestimony(character.id)}>Supprimer</button>
                      </div>
                    )}
                  </div>
                ) : !readOnly ? (
                  <button className="btn btn-sm" onClick={startEditTestimony}>
                    + Ajouter mon témoignage
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div className="detail-footer">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
            Ajoutée par {character.createdBy || '?'} le {fmtDate(character.createdAt)}
          </span>
          {!readOnly && (
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(character.id)}>
              Supprimer cette fiche
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
