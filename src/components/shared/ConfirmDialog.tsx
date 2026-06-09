export function ConfirmDialog({ open, onConfirm, onCancel, title, description }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md">
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="flex gap-2 mt-4">
          <button onClick={onConfirm}>Confirm</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}