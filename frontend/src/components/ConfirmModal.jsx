export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <h2>Confirmer</h2>
        <p className="modal-sub">{message}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
