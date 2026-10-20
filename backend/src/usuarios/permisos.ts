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

export const ALCANCES = ['escuela', 'cursosAsignados'] as const;
export type Alcance = (typeof ALCANCES)[number];

export interface RolInicial {
  codigo: string;
  nombre: string;
  jerarquia: number;
  alcance: Alcance;
  permisos: Permiso[];
}

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
