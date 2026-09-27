export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field__label-row">
        <span className="field__label">{label}</span>
        {hint ? <span className="field__hint">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
