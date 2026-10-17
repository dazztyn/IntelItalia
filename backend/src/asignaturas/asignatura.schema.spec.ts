import { model } from 'mongoose';
import { Asignatura, AsignaturaSchema } from './asignatura.schema';
import { CATALOGO_ASIGNATURAS } from './catalogo';

const AsignaturaModelo = model(Asignatura.name, AsignaturaSchema);

describe('AsignaturaSchema', () => {
  it('normaliza el código y calcula los nombres normalizados sin repetir', async () => {
    const asignatura = new AsignaturaModelo({
      codigo: 'len',
      nombre: 'Lenguaje y Comunicación',
      area: 'lenguaje',
      aliases: ['Lenguaje', 'LENGUAJE'],
    });
    await asignatura.validate();

    expect(asignatura.codigo).toBe('LEN');
    expect(asignatura.nombresNormalizados).toEqual([
      'LENGUAJE Y COMUNICACION',
      'LENGUAJE',
    ]);
  });

  it('rechaza un área desconocida', async () => {
    const asignatura = new AsignaturaModelo({
      codigo: 'X',
      nombre: 'X',
      area: 'ciencias',
    });

    await expect(asignatura.validate()).rejects.toThrow('area');
  });
});

describe('CATALOGO_ASIGNATURAS', () => {
  it('no repite códigos', () => {
    const codigos = CATALOGO_ASIGNATURAS.map((a) => a.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it('cada nivel tiene al menos una asignatura de lenguaje y una de matemática', () => {
    for (const nivel of ['PK', 'K', '1', '4', '8'] as const) {
      const delNivel = CATALOGO_ASIGNATURAS.filter((a) =>
        a.niveles.includes(nivel),
      );
      expect(delNivel.some((a) => a.area === 'lenguaje')).toBe(true);
      expect(delNivel.some((a) => a.area === 'matematica')).toBe(true);
    }
  });
});
