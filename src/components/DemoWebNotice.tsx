import { useState } from 'react';
import { PRODUCT_NAME } from '../config/textos';

const DONT_SHOW_KEY = 'stockpay_demo_web_dont_show';

function getDontShow(): boolean {
  try {
    return localStorage.getItem(DONT_SHOW_KEY) === '1';
  } catch {
    return false;
  }
}

function setDontShow() {
  try {
    localStorage.setItem(DONT_SHOW_KEY, '1');
  } catch {
    /* localStorage puede fallar en un perfil restringido — no es crítico */
  }
}

/**
 * Toast fijo (mismo patrón visual que UpdateNotifier / .update-banner):
 * avisa que esta es la versión web de demostración, no el programa
 * instalado. Se puede cerrar (X, "Omitir" — vuelve a aparecer si se recarga
 * la página) o marcar "No mostrar de nuevo" (persiste en este navegador).
 */
export default function DemoWebNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || getDontShow()) return null;

  return (
    <div className="demo-web-toast">
      <div className="demo-web-toast-head">
        <span className="pill">Versión web de demostración</span>
        <button
          type="button"
          className="demo-web-toast-close"
          aria-label="Cerrar"
          onClick={() => setDismissed(true)}
        >
          ✕
        </button>
      </div>
      <p>
        Esto no es el programa instalado: es <strong>{PRODUCT_NAME}</strong> corriendo en el
        navegador, con la misma lógica que la app real (Caja, Catálogo, Clientes, Cierre de
        caja, Equipo). Sirve para mostrarle el sistema a un cliente sin instalar nada — los
        datos que ves acá son de ejemplo, compartidos por todas las demos.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="b pri" onClick={() => setDismissed(true)}>
          Aceptar
        </button>
        <button
          type="button"
          className="b fantasma"
          onClick={() => {
            setDontShow();
            setDismissed(true);
          }}
        >
          No volver a mostrar
        </button>
      </div>
    </div>
  );
}
