import { ReactNode, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPosBridge } from '../bridge';
import { getUploadsBase } from '../api/client';
import { MENU } from '../config/menu';
import { modeLabel } from '../config/modes';
import { ROLE_LABELS, Role } from '../config/roles';
import { useConFlechas } from '../lib/conFlechas';
import { getModalActivo } from '../lib/modalActivo';
import { PRODUCT_NAME } from '../config/textos';
import HelpModal from '../components/HelpModal';

export type NavView =
  | 'till'
  | 'catalog'
  | 'sales'
  | 'closures'
  | 'customers'
  | 'team'
  | 'settings';

type Props = {
  view: NavView;
  onNavigate: (view: NavView) => void;
  title: string;
  stats?: ReactNode;
  children: ReactNode;
  todaySales?: string;
  logo?: string;
};

const MODO_SIMPLE_KEY = 'pos_modo_simple';

function iniciales(nombre?: string) {
  if (!nombre) return '?';
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/** Nombre del rol para mostrar — cae al valor crudo si algún día se agrega un rol nuevo acá antes que en roles.ts. */
function nombreRol(role?: string) {
  return (role && ROLE_LABELS[role as Role]) || role || '';
}

export default function AppShell({
  view,
  onNavigate,
  title,
  stats,
  children,
  todaySales,
  logo,
}: Props) {
  const { user, logout, hasPerm, apiInfo, serverError } = useAuth();
  const logoSrc = logo ? `${getUploadsBase()}/${logo}` : '';

  const [modoSimple, setModoSimple] = useState(() => {
    try {
      return localStorage.getItem(MODO_SIMPLE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [pantallaCompleta, setPantallaCompleta] = useState(!!document.fullscreenElement);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  useConFlechas(navRef, modoSimple ? 'horizontal' : 'vertical');

  useEffect(() => {
    try {
      localStorage.setItem(MODO_SIMPLE_KEY, modoSimple ? '1' : '0');
    } catch {
      /* localStorage puede fallar en algún perfil raro — no es crítico, se pierde la preferencia y ya. */
    }
  }, [modoSimple]);

  useEffect(() => {
    // El navegador puede sacarnos de pantalla completa por su cuenta (Escape, F11),
    // así que el estado mostrado es el real, no una preferencia nuestra.
    const onChange = () => setPantallaCompleta(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const alternarPantallaCompleta = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => undefined);
  };

  const items = MENU.filter((item) => {
    if (!item.perm) return true;
    const perms = Array.isArray(item.perm) ? item.perm : [item.perm];
    return perms.some((p) => hasPerm(p as Parameters<typeof hasPerm>[0]));
  });

  useEffect(() => {
    /**
     * Alt + número va directo a cada sección; Enter tilda una casilla (el
     * navegador solo lo hace con espacio, y acá Enter es "hacé lo que está
     * enfocado" en todos lados). Puerto del `teclado()` del shell de
     * carnicerías, mismo orden de guardas:
     */
    const onKey = (e: KeyboardEvent) => {
      // Con un modal abierto esto no es para acá: Alt+N navegaría de
      // pantalla con el modal todavía encima. Escape no necesita este
      // freno porque cada modal ya lo frena antes con stopPropagation.
      if (getModalActivo()) {
        if (e.altKey) e.preventDefault();
        return;
      }

      if (e.key === 'Enter' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const t = e.target;
        if (t instanceof HTMLInputElement && (t.type === 'checkbox' || t.type === 'radio')) {
          e.preventDefault();
          t.click();
          return;
        }
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        // `e.code` y no `e.key`: con Alt apretado, Windows puede devolver
        // en `key` un carácter raro en vez del dígito, pero `code` siempre
        // dice qué tecla física se apretó.
        const digito = /^Digit([1-9])$/.exec(e.code);
        if (digito) {
          const item = items[Number(digito[1]) - 1];
          if (item) {
            e.preventDefault();
            onNavigate(item.id);
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [items, onNavigate]);

  const conectado = !serverError;

  return (
    <div className={`app ${modoSimple ? 'modo-simple' : ''}`}>
      {!modoSimple && (
        <aside className="nav" ref={navRef}>
          <div className="nav-brand">
            <div className="nav-brand-row">
              {/* Mientras el negocio no cargó su propio logo (Configuración),
                  se muestra el logo de la app en vez de un cuadrado vacío. */}
              <img className="nav-logo" src={logoSrc || './logo.png'} alt="" />
              <div className="nav-brand-text">
                <strong>{PRODUCT_NAME}</strong>
                <span>{modeLabel(apiInfo?.mode)}</span>
              </div>
            </div>
          </div>
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className={`nav-btn ${view === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
              <span className="kbd">Alt+{idx + 1}</span>
            </button>
          ))}
          <div className="nav-spacer" />
          <button type="button" className="nav-btn" onClick={() => logout()}>
            Cerrar sesión
          </button>
          <button type="button" className="nav-btn" onClick={() => getPosBridge().quit()}>
            Salir
          </button>
          <div className="nav-meta">
            <div>{user?.fullname}</div>
            <div>Caja #{apiInfo?.till || 1}</div>
            <div>v{__APP_VERSION__}</div>
          </div>
        </aside>
      )}

      <div className="workspace">
        <header className="topbar">
          {/* En vista simple el sidebar (donde vive el logo) está oculto —
              sin esto la marca desaparecía por completo en ese modo. */}
          {modoSimple && <img className="topbar-logo" src={logoSrc || './logo.png'} alt="" />}
          <h1>{title}</h1>
          {stats}
          <div className="spacer" />
          {todaySales != null && <div className="stat-pill">Hoy {todaySales}</div>}

          <span
            className={`conexion ${conectado ? '' : 'off'}`}
            title={conectado ? 'Conectado al servidor' : serverError || 'Sin conexión'}
          >
            <span className="pt" />
          </span>

          <button
            type="button"
            className={`modo ${modoSimple ? 'on' : ''}`}
            role="switch"
            aria-checked={modoSimple}
            onClick={() => setModoSimple((v) => !v)}
            title="Vista grande: letra y botones más grandes, sin sacar ninguna opción"
          >
            <span className="riel" aria-hidden="true">
              <span className="bolita" />
            </span>
            <span className="et">Vista grande</span>
          </button>

          <button
            type="button"
            className={`completa ${pantallaCompleta ? 'on' : ''}`}
            aria-pressed={pantallaCompleta}
            onClick={alternarPantallaCompleta}
            title={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
            aria-label={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {pantallaCompleta ? '⤡' : '⤢'}
          </button>

          <span className="usuario">
            <button
              type="button"
              className="chip"
              onClick={() => setMenuUsuario((v) => !v)}
              aria-expanded={menuUsuario}
              aria-haspopup="menu"
            >
              <span className="av">{iniciales(user?.fullname)}</span>
              <span className="rol">{nombreRol(user?.role)}</span>
              <span className="v" aria-hidden="true">▾</span>
            </button>

            {menuUsuario && (
              <>
                <button
                  type="button"
                  className="tapa"
                  onClick={() => setMenuUsuario(false)}
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <div className="desplegable" role="menu">
                  <div className="ficha">
                    <b>{user?.fullname}</b>
                    <small>{nombreRol(user?.role)}</small>
                    <small className="donde">Caja #{apiInfo?.till || 1}</small>
                  </div>
                  {modoSimple &&
                    items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`salir-menu ${view === item.id ? 'act' : ''}`}
                        role="menuitem"
                        onClick={() => {
                          onNavigate(item.id);
                          setMenuUsuario(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  <button
                    type="button"
                    className="salir-menu"
                    role="menuitem"
                    onClick={() => {
                      setAyudaAbierta(true);
                      setMenuUsuario(false);
                    }}
                  >
                    Ayuda
                  </button>
                  <button
                    type="button"
                    className="salir-menu"
                    role="menuitem"
                    onClick={() => logout()}
                  >
                    Cerrar sesión
                  </button>
                  <button
                    type="button"
                    className="salir-menu"
                    role="menuitem"
                    onClick={() => getPosBridge().quit()}
                  >
                    Salir
                  </button>
                </div>
              </>
            )}
          </span>
        </header>

        {modoSimple && (
          <nav
            className="botonera"
            aria-label="Secciones del sistema"
            ref={navRef}
          >
            {items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`botonera-btn ${view === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                {item.label}
                <span className="kbd">Alt+{idx + 1}</span>
              </button>
            ))}
          </nav>
        )}

        <main className="main">{children}</main>
      </div>
      <HelpModal open={ayudaAbierta} onClose={() => setAyudaAbierta(false)} />
    </div>
  );
}
