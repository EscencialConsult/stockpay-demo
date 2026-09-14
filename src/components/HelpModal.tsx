import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { getPosBridge } from '../bridge';
import { PRODUCT_NAME } from '../config/textos';

type Props = {
  open: boolean;
  onClose: () => void;
};

type Seccion = {
  id: string;
  titulo: string;
  /** Si no hay permiso, la sección no se muestra — mismo criterio que el menú lateral. */
  perm?: string;
  cuerpo: JSX.Element;
};

const FAQ: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: '¿Qué hago si no puedo cobrar una venta a cuenta corriente?',
    respuesta:
      'Una venta a cuenta corriente exige elegir un cliente registrado — no se puede fiar a "Consumidor final". Si el cliente no existe todavía, hay que crearlo primero desde Clientes.',
  },
  {
    pregunta: 'El cierre de caja muestra una diferencia. ¿Qué significa?',
    respuesta:
      'Es la diferencia entre lo que el sistema calculó que debería haber en el cajón según las ventas registradas y lo que efectivamente se contó a mano. Un número negativo es faltante, uno positivo es sobrante.',
  },
  {
    pregunta: 'Un producto no aparece al escanearlo.',
    respuesta:
      'Puede que el código no esté cargado en ese producto todavía, o que se haya escaneado dos veces por error. Se puede buscar el producto por nombre en la Caja mientras se revisa el código desde Catálogo.',
  },
  {
    pregunta: 'Se olvidó la contraseña de un usuario.',
    respuesta:
      'Un usuario con rol Administrador puede entrar a Equipo y restablecer la contraseña de cualquier otro usuario. Si el que se olvidó la contraseña es el único administrador, hay que contactar a soporte.',
  },
  {
    pregunta: 'El indicador de conexión (arriba a la derecha) está en rojo.',
    respuesta:
      'Significa que esta caja no puede hablar con el servidor. Si esta computadora es una terminal de red, revisar que la PC que actúa como servidor esté encendida y conectada a la misma red. Si es la única caja, puede ser necesario reiniciar el programa.',
  },
];

export default function HelpModal({ open, onClose }: Props) {
  const { hasPerm, user } = useAuth();
  const [seccionActiva, setSeccionActiva] = useState('caja');
  const [rutaDatos, setRutaDatos] = useState('');

  useEffect(() => {
    if (!open) return;
    getPosBridge()
      .getPaths()
      .then((p) => setRutaDatos(p.userData || ''))
      .catch(() => setRutaDatos(''));
  }, [open]);

  const secciones: Seccion[] = [
    {
      id: 'caja',
      titulo: 'Caja',
      cuerpo: (
        <>
          <p>
            Buscá un producto tipeando su nombre, o escaneá su código de barras — apenas se
            encuentra, se agrega solo al carrito. El total se actualiza en cada línea.
          </p>
          <p>
            Para cobrar, elegí el medio de pago (efectivo, tarjeta, transferencia, cheque o
            cuenta corriente). Si es efectivo, ingresá cuánto entregó el cliente y el sistema
            calcula el cambio solo. Si es cuenta corriente, vas a tener que elegir primero un
            cliente ya registrado en Clientes.
          </p>
          <p>Al confirmar la venta, el stock de cada producto vendido baja automáticamente.</p>
        </>
      ),
    },
    {
      id: 'catalog',
      titulo: 'Catálogo',
      perm: 'perm_products',
      cuerpo: (
        <>
          <p>
            Acá se cargan los productos que se venden: nombre, precio, categoría, foto opcional
            y cantidad en stock. También se pueden crear categorías nuevas para ordenarlos.
          </p>
          <p>
            Si un producto no tiene código de barras propio, el sistema puede generarle uno para
            imprimir en una etiqueta.
          </p>
        </>
      ),
    },
    {
      id: 'sales',
      titulo: 'Ventas',
      perm: 'perm_transactions',
      cuerpo: (
        <p>
          Historial completo de ventas realizadas, con el detalle de cada una: productos,
          importe, medio de pago y quién la cobró.
        </p>
      ),
    },
    {
      id: 'closures',
      titulo: 'Cierre de caja',
      perm: 'perm_transactions',
      cuerpo: (
        <>
          <p>
            Al terminar un turno, contá la plata física del cajón e ingresala acá. El sistema la
            compara contra lo que calculó según las ventas de ese período y muestra la
            diferencia al instante.
          </p>
          <p>Cada cierre queda guardado en un historial que se puede revisar más adelante.</p>
        </>
      ),
    },
    {
      id: 'customers',
      titulo: 'Clientes',
      cuerpo: (
        <p>
          Registrá los datos de un cliente para poder venderle a cuenta corriente (fiado). Ahí
          mismo se ve su saldo actual y se puede registrar un pago para descontarlo.
        </p>
      ),
    },
    {
      id: 'team',
      titulo: 'Equipo',
      perm: 'perm_users',
      cuerpo: (
        <>
          <p>
            Alta de usuarios del sistema, con su rol correspondiente: Administrador (acceso
            total), Encargado (catálogo y ventas, sin equipo ni configuración) o Cajero (solo
            caja y clientes).
          </p>
          <p>Desde acá también se restablece la contraseña de cualquier usuario del equipo.</p>
        </>
      ),
    },
    {
      id: 'settings',
      titulo: 'Configuración',
      perm: 'perm_settings',
      cuerpo: (
        <p>
          Datos del negocio (nombre, dirección, contacto, moneda), logo, modo de caja
          (independiente o en red) y las demás preferencias generales del sistema.
        </p>
      ),
    },
    {
      id: 'backup',
      titulo: 'Copias de seguridad',
      perm: 'perm_settings',
      cuerpo: (
        <>
          <p>
            Todo lo que carga el negocio (productos, ventas, clientes) se guarda en una sola
            carpeta de esta computadora. Para hacer una copia de seguridad: cerrá {PRODUCT_NAME}{' '}
            y copiá esa carpeta completa a un pendrive o disco externo. Para restaurarla, cerrá el
            programa, reemplazá la carpeta por la copia guardada, y volvé a abrirlo.
          </p>
          <p>
            La carpeta de esta instalación es:
            <br />
            <code>{rutaDatos || 'No disponible desde el navegador — abrir la app instalada.'}</code>
          </p>
        </>
      ),
    },
    {
      id: 'faq',
      titulo: 'Preguntas frecuentes',
      cuerpo: (
        <>
          {FAQ.map((f) => (
            <div key={f.pregunta} className="ayuda-faq-item">
              <strong>{f.pregunta}</strong>
              <p>{f.respuesta}</p>
            </div>
          ))}
        </>
      ),
    },
  ];

  const visibles = secciones.filter((s) => !s.perm || hasPerm(s.perm as Parameters<typeof hasPerm>[0]));
  const activa = visibles.find((s) => s.id === seccionActiva) || visibles[0];

  return (
    <Modal title={`Ayuda — ${PRODUCT_NAME} v${__APP_VERSION__}`} open={open} onClose={onClose} wide>
      <div className="ayuda">
        <nav className="ayuda-nav" aria-label="Secciones de ayuda">
          {visibles.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`ayuda-nav-btn ${activa?.id === s.id ? 'active' : ''}`}
              onClick={() => setSeccionActiva(s.id)}
            >
              {s.titulo}
            </button>
          ))}
        </nav>
        <div className="ayuda-cuerpo">
          {user?.role === 'cajero' && activa?.id === 'caja' && (
            <p className="ayuda-hint">Consultá con un administrador si necesitás acceso a otras pantallas.</p>
          )}
          {activa?.cuerpo}
        </div>
      </div>
    </Modal>
  );
}
