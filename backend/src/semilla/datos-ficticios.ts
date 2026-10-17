// Generador de alumnos FICTICIOS para desarrollo y pruebas. Nunca se usan datos reales
// (CLAUDE.md, Ley 21.719). Es determinista: la misma semilla da los mismos alumnos,
// así que correr la carga dos veces no duplica nada.
import { DatosPie } from '../alumnos/alumno.schema';
import { calcularDigitoVerificador } from '../comun/rut';

const NOMBRES = [
  'Sofía',
  'Martina',
  'Florencia',
  'Isidora',
  'Antonella',
  'Josefa',
  'Emilia',
  'Agustina',
  'Catalina',
  'Valentina',
  'Mateo',
  'Agustín',
  'Tomás',
  'Benjamín',
  'Vicente',
  'Joaquín',
  'Maximiliano',
  'Gaspar',
  'Lucas',
  'Matías',
];
const SEGUNDOS_NOMBRES = [
  'Ignacia',
  'Paz',
  'Antonia',
  'Belén',
  'Andrés',
  'Alonso',
  'Ignacio',
  'José',
];
const APELLIDOS = [
  'González',
  'Muñoz',
  'Rojas',
  'Díaz',
  'Pérez',
  'Soto',
  'Contreras',
  'Silva',
  'Martínez',
  'Sepúlveda',
  'Morales',
  'Rodríguez',
  'López',
  'Fuentes',
  'Hernández',
  'Torres',
  'Araya',
  'Flores',
  'Espinoza',
  'Valenzuela',
  'Castillo',
  'Tapia',
  'Reyes',
  'Gutiérrez',
  'Castro',
  'Pizarro',
  'Álvarez',
  'Vásquez',
];

// Los RUT ficticios se generan desde 50.000.000 para no confundirse con RUT de
// alumnos reales, que hoy están muy por debajo de ese número.
const BASE_RUT_FICTICIO = 50_000_000;
const BASE_IPE_FICTICIO = 100_900_000;

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function crearAleatorio(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function elegir<T>(lista: readonly T[], aleatorio: () => number): T {
  return lista.at(Math.floor(aleatorio() * lista.length)) as T;
}

function conDigito(cuerpo: number): string {
  return `${cuerpo}-${calcularDigitoVerificador(String(cuerpo))}`;
}

export interface AlumnoFicticio {
  rut: string | null;
  ipe: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  retirado: boolean;
  pie?: DatosPie;
}

/**
 * Alumnos ficticios de un curso. `indiceCurso` separa los RUT entre cursos.
 * Incluye a propósito los casos raros: un alumno con IPE, uno con un solo apellido,
 * uno retirado y dos en PIE.
 */
export function generarAlumnosFicticios(
  indiceCurso: number,
  cantidad: number,
): AlumnoFicticio[] {
  const aleatorio = crearAleatorio(1000 + indiceCurso);

  return Array.from({ length: cantidad }, (_, i) => {
    const correlativo = indiceCurso * 1000 + i;
    const conIpe = i === 0;
    const unApellido = i === 1;
    const segundoNombre = aleatorio() < 0.5;

    return {
      rut: conIpe ? null : conDigito(BASE_RUT_FICTICIO + correlativo),
      ipe: conIpe ? conDigito(BASE_IPE_FICTICIO + correlativo) : null,
      nombres: segundoNombre
        ? `${elegir(NOMBRES, aleatorio)} ${elegir(SEGUNDOS_NOMBRES, aleatorio)}`
        : elegir(NOMBRES, aleatorio),
      apellidoPaterno: elegir(APELLIDOS, aleatorio),
      apellidoMaterno: unApellido ? null : elegir(APELLIDOS, aleatorio),
      retirado: i === 2,
      pie:
        i === 3
          ? { participa: true, tipoNee: 'transitoria' }
          : i === 4
            ? { participa: true, tipoNee: 'permanente' }
            : undefined,
    };
  });
}
