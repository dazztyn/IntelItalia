import { esRutValido } from '../comun/rut';
import { generarAlumnosFicticios } from './datos-ficticios';

describe('generarAlumnosFicticios', () => {
  const alumnos = generarAlumnosFicticios(3, 20);

  it('es determinista: la misma semilla da los mismos alumnos', () => {
    expect(generarAlumnosFicticios(3, 20)).toEqual(alumnos);
  });

  it('genera RUT válidos y RUT/IPE únicos', () => {
    const ruts = alumnos.map((a) => a.rut).filter(Boolean) as string[];
    expect(ruts.every(esRutValido)).toBe(true);

    const identificadores = alumnos.map((a) => a.rut ?? a.ipe);
    expect(new Set(identificadores).size).toBe(alumnos.length);
  });

  it('no repite RUT entre cursos', () => {
    const otroCurso = generarAlumnosFicticios(4, 20).map((a) => a.rut);
    expect(alumnos.some((a) => a.rut && otroCurso.includes(a.rut))).toBe(false);
  });

  it('incluye los casos especiales: IPE, un apellido, retiro y PIE', () => {
    expect(alumnos.filter((a) => a.ipe)).toHaveLength(1);
    expect(alumnos.filter((a) => a.apellidoMaterno === null)).toHaveLength(1);
    expect(alumnos.filter((a) => a.retirado)).toHaveLength(1);
    expect(alumnos.filter((a) => a.pie?.participa)).toHaveLength(2);
  });
});
