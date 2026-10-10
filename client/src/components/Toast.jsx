import { useState, useEffect } from "react";

let _setToast = null;

export function showToast(msg, duration = 2800) {
  if (_setToast) _setToast({ msg, key: Date.now() });
  setTimeout(() => { if (_setToast) _setToast(null); }, duration);
}

export default function Toast() {
  const [toast, setToast] = useState(null);
  useEffect(() => { _setToast = setToast; return () => { _setToast = null; }; }, []);
  if (!toast) return null;
  return <div key={toast.key} className="toast">{toast.msg}</div>;
}
