import type { NavView } from '../layout/AppShell';

/**
 * Menú de navegación en un solo lugar, mismo patrón que `menu.ts` del
 * sistema de carnicerías: cada pantalla nueva se agrega acá, con la etiqueta
 * en español y el permiso que la habilita — ninguna otra parte de la app
 * arma el menú a mano.
 */
export type MenuItem = {
  id: NavView;
  label: string;
  /**
   * Permiso(s) que habilitan el ítem — con más de uno alcanza con tener
   * cualquiera (mismo criterio que `puedeAlguno` en carnicerías).
   * `null` = visible para cualquier sesión.
   */
  perm: string | string[] | null;
};

export const MENU: MenuItem[] = [
  { id: 'till', label: 'Caja', perm: null },
  { id: 'catalog', label: 'Catálogo', perm: ['perm_products', 'perm_categories'] },
  { id: 'sales', label: 'Ventas', perm: 'perm_transactions' },
  { id: 'closures', label: 'Cierre de caja', perm: 'perm_transactions' },
  { id: 'customers', label: 'Clientes', perm: null },
  { id: 'team', label: 'Equipo', perm: 'perm_users' },
  { id: 'settings', label: 'Configuración', perm: 'perm_settings' },
];

/** Título de encabezado por vista — un solo lugar, igual criterio que el menú. */
export const VIEW_TITLES: Record<NavView, string> = {
  till: 'Caja',
  catalog: 'Catálogo',
  sales: 'Historial de ventas',
  closures: 'Cierre de caja',
  customers: 'Clientes',
  team: 'Equipo',
  settings: 'Configuración',
};
