// Catálogo de permisos (docs/ARQUITECTURA.md, sección 7.3). Cada endpoint exige
// los suyos con @RequierePermisos; qué rol tiene cuáles se guarda en `roles`.
export const PERMISOS = [
  'alumnos.ver',
  'alertas.ver',
  'alertas.gestionar',
  'cargas.notas',
  'cargas.asistencia',
  'cargas.evaluaciones',
  'observaciones.crear',
  'observaciones.verPsicosocial',
  'pie.ver',
  'simce.ver',
  'reportes.exportar',
  'reglasAlerta.gestionar',
  'usuarios.gestionar',
  'auditoria.ver',
] as const;
export type Permiso = (typeof PERMISOS)[number];

/** `cursosAsignados`: el usuario solo ve y carga datos de sus `cursoIds` (sección 7.4). */
export const ALCANCES = ['escuela', 'cursosAsignados'] as const;
export type Alcance = (typeof ALCANCES)[number];

export interface RolInicial {
  codigo: string;
  nombre: string;
  jerarquia: number;
  alcance: Alcance;
  permisos: Permiso[];
}

// Roles con los que parte el sistema. Son datos iniciales: después la Directora
// los edita en la plataforma y no se vuelven a pisar.
// ⏳ Faltan los otros 7 roles de la sección 7.2.
export const ROLES_INICIALES: RolInicial[] = [
  {
    codigo: 'directora',
    nombre: 'Directora',
    jerarquia: 1,
    alcance: 'escuela',
    permisos: [...PERMISOS],
  },
  {
    codigo: 'docente',
    nombre: 'Docente',
    jerarquia: 9,
    alcance: 'cursosAsignados',
    permisos: [
      'alumnos.ver',
      'alertas.ver',
      'cargas.notas',
      'cargas.asistencia',
      'observaciones.crear',
    ],
  },
];
