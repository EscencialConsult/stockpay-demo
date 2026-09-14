// Roles nominales — un solo lugar, mismo patrón que `permisos.service.ts` del
// sistema de referencia (carnicerías): un rol es un nombre, y ese nombre
// resuelve a la lista de permisos que trae. Nada por fuera de este archivo
// decide qué permisos tiene un rol.
//
// Las claves de permiso (`perm_products`, etc.) se mantienen porque todas las
// rutas del backend y el token ya las usan como flags — lo único que cambia
// es DE DÓNDE salen: antes eran 5 columnas sueltas por usuario, ahora las
// resuelve el rol. Ningún route handler tuvo que tocarse.
//
// Espejo en el frontend: `src/config/roles.ts`. Tienen que coincidir.
export const ROLES = ['administrador', 'encargado', 'cajero'];

export const ROLE_LABELS = {
  administrador: 'Administrador',
  encargado: 'Encargado',
  cajero: 'Cajero',
};

const ROLE_PERMS = {
  // Todo. Es también el rol del usuario id=1, que además tiene bypass de
  // seguridad propio en `auth.js` por si algún día un rol se edita mal.
  administrador: ['perm_products', 'perm_categories', 'perm_transactions', 'perm_users', 'perm_settings'],
  // Gestiona catálogo y ve el historial de ventas, pero no toca usuarios ni
  // configuración del negocio.
  encargado: ['perm_products', 'perm_categories', 'perm_transactions'],
  // Solo vende: caja y clientes, que no están detrás de ningún perm_* (ver
  // `src/config/menu.ts`, ítems con `perm: null`).
  cajero: [],
};

export function isRole(value) {
  return ROLES.includes(value);
}

/** Devuelve los 5 flags `perm_*` que le corresponden a un rol, como booleanos 0/1. */
export function permsForRole(role) {
  const granted = new Set(ROLE_PERMS[role] || []);
  return {
    perm_products: granted.has('perm_products') ? 1 : 0,
    perm_categories: granted.has('perm_categories') ? 1 : 0,
    perm_transactions: granted.has('perm_transactions') ? 1 : 0,
    perm_users: granted.has('perm_users') ? 1 : 0,
    perm_settings: granted.has('perm_settings') ? 1 : 0,
  };
}
