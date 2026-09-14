import { Component, ErrorInfo, ReactNode } from 'react';
import { getPosBridge } from '../bridge';
import { PRODUCT_NAME } from '../config/textos';

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Red de contención para lo que ningún try/catch puntual agarró — sin esto,
 * un error de render deja la pantalla en blanco sin ningún rastro. Manda el
 * error al log persistente del proceso principal (ver src/bridge.ts) para
 * que quede algo concreto que pedirle al cliente ante un reclamo de soporte.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    getPosBridge().logError(error.message, info.componentStack || error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="login-wrap">
          <div className="panel login-card">
            <h1>{PRODUCT_NAME}</h1>
            <p>Ocurrió un error inesperado. Reiniciá la aplicación para seguir.</p>
            <button type="button" className="b primario" onClick={() => getPosBridge().reload()}>
              Reiniciar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
