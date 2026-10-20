import { Types } from 'mongoose';
import { cursosPermitidos, tieneAccesoACurso } from './alcance';

describe('alcance por curso', () => {
  const tercero = new Types.ObjectId();
  const cuarto = new Types.ObjectId();

  it('con alcance escuela ve todos los cursos', () => {
    const directora = { alcance: 'escuela' as const, cursoIds: [] };

    expect(cursosPermitidos(directora)).toBeNull();
    expect(tieneAccesoACurso(directora, cuarto)).toBe(true);
  });

  it('un docente solo ve sus cursos asignados', () => {
    const docente = {
      alcance: 'cursosAsignados' as const,
      cursoIds: [tercero],
    };

    expect(cursosPermitidos(docente)).toEqual([tercero]);
    expect(tieneAccesoACurso(docente, tercero)).toBe(true);
    expect(tieneAccesoACurso(docente, String(tercero))).toBe(true);
    expect(tieneAccesoACurso(docente, cuarto)).toBe(false);
  });

  it('un docente sin cursos asignados no ve ninguno', () => {
    const docente = { alcance: 'cursosAsignados' as const, cursoIds: [] };

    expect(cursosPermitidos(docente)).toEqual([]);
    expect(tieneAccesoACurso(docente, tercero)).toBe(false);
  });
});
