/**
 * Roles nominales — un solo lugar, mismo patrón que `permisos.service.ts`
 * del sistema de referencia (carnicerías). Espejo exacto de `server/roles.js`
 * — tienen que coincidir; el backend es quien manda porque es el que arma el
 * token, esto es solo para el formulario de edición de usuarios.
 */
export const ROLES = ['administrador', 'encargado', 'cajero'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  administrador: 'Administrador',
  encargado: 'Encargado',
  cajero: 'Cajero',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  administrador: 'Acceso total: catálogo, ventas, equipo y configuración.',
  encargado: 'Catálogo y ventas. No administra usuarios ni configuración.',
  cajero: 'Solo caja y clientes.',
};

export type Perms = {
  perm_products: boolean;
  perm_categories: boolean;
  perm_transactions: boolean;
  perm_users: boolean;
  perm_settings: boolean;
};

/**
 * Plantilla de arranque al crear un usuario nuevo — ya NO es el techo real
 * de lo que puede hacer (eso ahora es por usuario, ver PosPage.tsx
 * UsersPanel y server/routes/users.js). Espejo de ROLE_PERMS en
 * server/roles.js, tienen que coincidir.
 */
export const ROLE_PERM_TEMPLATE: Record<Role, Perms> = {
  administrador: {
    perm_products: true,
    perm_categories: true,
    perm_transactions: true,
    perm_users: true,
    perm_settings: true,
  },
  encargado: {
    perm_products: true,
    perm_categories: true,
    perm_transactions: true,
    perm_users: false,
    perm_settings: false,
  },
  cajero: {
    perm_products: false,
    perm_categories: false,
    perm_transactions: false,
    perm_users: false,
    perm_settings: false,
  },
};
