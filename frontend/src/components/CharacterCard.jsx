import { ClassIcon } from '../icons.jsx';

function classLabel(c) {
  return c.classe === 'Autre' && c.classeCustom ? c.classeCustom : c.classe;
}

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CharacterCard({ character, onOpen }) {
  const count = character.temoignages ? character.temoignages.length : 0;

  return (
    <div className="card" onClick={() => onOpen(character.id)}>
      <div className="card-top">
        <div className="seal">
          {character.avatar ? <img src={character.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <ClassIcon classe={character.classe} />}
        </div>
        <div className="card-title-wrap">
          <p className="card-name">{character.name}</p>
          <span className="card-classe">{classLabel(character)}</span>
        </div>
      </div>

      <div>
        <span className={`badge ${character.role === 'Principal' ? 'badge-principal' : 'badge-secondaire'}`}>
          {character.role}
        </span>
      </div>

      <div className="card-meta">
        <i>{character.affectationType}</i> — {character.affectationNom || '—'}
        {character.affectationPlus ? ` · ${character.affectationPlus}` : ''}
      </div>

      <div className="card-excerpt">
        {character.descriptionGenerale || "Aucune description pour l'instant."}
      </div>

      <div className="card-footer">
        <span>
          {count} témoignage{count === 1 ? '' : 's'}
        </span>
        <span>MAJ {fmtDate(character.updatedAt)}</span>
      </div>
    </div>
  );
}
