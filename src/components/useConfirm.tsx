import { useCallback, useRef, useState } from 'react';
import Modal from './Modal';

/**
 * Reemplaza al `confirm()` nativo del navegador para confirmar acciones
 * destructivas (borrar un producto, una categoría, un cliente...).
 *
 * `confirm()` abre un diálogo del propio sistema operativo, afuera de la
 * ventana de React. En Electron, si ese diálogo llega a abrirse detrás de
 * la ventana principal o sin el foco esperado, la app queda esperando una
 * respuesta que nadie ve en pantalla — JavaScript se pausa entero mientras
 * tanto, así que se siente exactamente como si el programa se hubiera
 * trabado, sin ningún botón que responda.
 *
 * Este modal es HTML propio de la app, siempre dentro de la misma ventana,
 * con el mismo sistema de foco que el resto (`Modal.tsx`) — nunca puede
 * quedar abierto en un lugar donde no se lo vea.
 *
 * Uso: igual que `confirm()`, pero asincrónico.
 *   const { confirm, elemento } = useConfirm();
 *   if (!(await confirm('¿Eliminar este producto?'))) return;
 *   // ...en el JSX del componente: {elemento}
 */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((msg: string) => {
    setMensaje(msg);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const responder = (valor: boolean) => {
    setOpen(false);
    resolver.current?.(valor);
    resolver.current = null;
  };

  const elemento = (
    <Modal
      title="Confirmar"
      open={open}
      onClose={() => responder(false)}
      footer={
        <>
          <button type="button" className="b" onClick={() => responder(false)}>
            Cancelar
          </button>
          <button type="button" className="b malo" onClick={() => responder(true)}>
            Eliminar
          </button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{mensaje}</p>
    </Modal>
  );

  return { confirm, elemento };
}
