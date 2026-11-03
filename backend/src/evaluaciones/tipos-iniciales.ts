import type { TipoEvaluacion } from './schemas/tipo-evaluacion.schema';

// Instrumentos con los que parte el sistema. Igual que los roles iniciales: se crean
// al iniciar la API si no existen y después no se vuelven a pisar.
// Letrapps y SEPA se agregan cuando tengan su carga (sección 4.4).
export const TIPOS_EVALUACION_INICIALES: TipoEvaluacion[] = [
  {
    codigo: 'DIA',
    nombre: 'Diagnóstico Integral de Aprendizajes',
    areas: ['lenguaje', 'matematica'],
    niveles: ['2', '3', '4', '5', '6', '7', '8'], // ⏳ a confirmar con la escuela
    momentos: ['diagnostico', 'monitoreo', 'cierre'],
    campos: [
      // lenguaje: localizar, interpretarRelacionar, reflexionar; matemática: OA2, OA3…
      { clave: 'porcentajesPorEje', tipo: 'mapaNumeros', min: 0, max: 100 },
      { clave: 'porcentajeLogro', tipo: 'numero', min: 0, max: 100 },
    ],
    // ⏳ La escuela (Jefa Técnica) define los cortes; mientras, nivelNormalizado = null.
    reglaNormalizacion: {
      tipo: 'rangos',
      campo: 'porcentajeLogro',
      rangos: [],
    },
    activo: true,
  },
];
