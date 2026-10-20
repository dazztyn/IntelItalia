import { Nivel } from '../cursos/niveles';
import { Area } from './asignatura.schema';
import { AsignaturaCatalogo } from './interfaces/asignatura-catalogo.interface';

const BASICA: Nivel[] = ['1', '2', '3', '4', '5', '6', '7', '8'];

// Catálogo inicial según el plan de estudios de educación básica.
// ⏳ Confirmar con la malla real de la escuela y con los nombres que usa Mi Aula
// (sobre todo PK y K, que se organizan por núcleos de aprendizaje).
export const CATALOGO_ASIGNATURAS: AsignaturaCatalogo[] = [
  {
    codigo: 'LV',
    nombre: 'Lenguaje Verbal',
    area: 'lenguaje',
    aliases: ['Lenguaje', 'Comunicación'],
    niveles: ['PK', 'K'],
  },
  {
    codigo: 'PM',
    nombre: 'Pensamiento Matemático',
    area: 'matematica',
    aliases: ['Matemática', 'Relaciones Lógico-Matemáticas'],
    niveles: ['PK', 'K'],
  },
  {
    codigo: 'LEN',
    nombre: 'Lenguaje y Comunicación',
    area: 'lenguaje',
    aliases: ['Lenguaje', 'Lengua y Literatura', 'Lectura'],
    niveles: BASICA,
  },
  {
    codigo: 'MAT',
    nombre: 'Matemática',
    area: 'matematica',
    aliases: ['Matemáticas'],
    niveles: BASICA,
  },
  {
    codigo: 'HIS',
    nombre: 'Historia, Geografía y Ciencias Sociales',
    area: 'otra',
    aliases: ['Historia'],
    niveles: BASICA,
  },
  {
    codigo: 'CN',
    nombre: 'Ciencias Naturales',
    area: 'otra',
    aliases: ['Ciencias'],
    niveles: BASICA,
  },
  {
    codigo: 'ING',
    nombre: 'Inglés',
    area: 'otra',
    aliases: ['Idioma Extranjero Inglés'],
    niveles: ['5', '6', '7', '8'],
  },
  {
    codigo: 'ART',
    nombre: 'Artes Visuales',
    area: 'otra',
    aliases: ['Artes'],
    niveles: BASICA,
  },
  {
    codigo: 'MUS',
    nombre: 'Música',
    area: 'otra',
    aliases: [],
    niveles: BASICA,
  },
  {
    codigo: 'EFI',
    nombre: 'Educación Física y Salud',
    area: 'otra',
    aliases: ['Educación Física'],
    niveles: BASICA,
  },
  {
    codigo: 'TEC',
    nombre: 'Tecnología',
    area: 'otra',
    aliases: [],
    niveles: BASICA,
  },
  {
    codigo: 'ORI',
    nombre: 'Orientación',
    area: 'otra',
    aliases: [],
    niveles: BASICA,
  },
  {
    codigo: 'REL',
    nombre: 'Religión',
    area: 'otra',
    aliases: [],
    niveles: BASICA,
  },
];
