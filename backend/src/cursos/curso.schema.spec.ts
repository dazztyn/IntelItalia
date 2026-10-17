import { model } from 'mongoose';
import { Curso, CursoSchema } from './curso.schema';
import { nombreCurso } from './niveles';

const CursoModelo = model(Curso.name, CursoSchema);

describe('nombreCurso', () => {
  it.each([
    ['PK', null, 'Pre-kínder'],
    ['K', null, 'Kínder'],
    ['3', null, '3° Básico'],
    ['3', 'A', '3° Básico A'],
  ] as const)('%s %s → %s', (nivel, letra, esperado) => {
    expect(nombreCurso(nivel, letra)).toBe(esperado);
  });
});

describe('CursoSchema', () => {
  it('calcula el nombre y deja la letra en null por defecto', async () => {
    const curso = new CursoModelo({ anio: 2026, nivel: '4' });
    await curso.validate();

    expect(curso.letra).toBeNull();
    expect(curso.nombre).toBe('4° Básico');
  });

  it('pasa la letra a mayúscula y la incluye en el nombre', async () => {
    const curso = new CursoModelo({ anio: 2026, nivel: '4', letra: 'b' });
    await curso.validate();

    expect(curso.letra).toBe('B');
    expect(curso.nombre).toBe('4° Básico B');
  });

  it('rechaza un nivel que la escuela no tiene', async () => {
    const curso = new CursoModelo({ anio: 2026, nivel: '9' });

    await expect(curso.validate()).rejects.toThrow('nivel');
  });

  it('tiene índice único por año, nivel y letra', () => {
    expect(CursoSchema.indexes()).toContainEqual([
      { anio: 1, nivel: 1, letra: 1 },
      expect.objectContaining({ unique: true }),
    ]);
  });
});
