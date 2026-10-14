import { claveNombre, normalizarTexto } from './texto';

describe('normalizarTexto', () => {
  it('quita tildes, signos y espacios de más, y pasa a mayúsculas', () => {
    expect(normalizarTexto('  José-Tomás   Pérez ')).toBe('JOSE TOMAS PEREZ');
  });

  it('conserva la Ñ', () => {
    expect(normalizarTexto('Muñoz Núñez')).toBe('MUÑOZ NUÑEZ');
  });

  it('quita la diéresis', () => {
    expect(normalizarTexto('Agüero')).toBe('AGUERO');
  });
});

describe('claveNombre', () => {
  it('no depende del orden de nombres y apellidos', () => {
    expect(claveNombre('Ana María', 'Pérez', 'Soto')).toBe(
      claveNombre('PEREZ SOTO ANA MARIA'),
    );
  });

  it('ignora partes vacías', () => {
    expect(claveNombre('Luis', 'Rojas', null)).toBe('LUIS ROJAS');
  });
});
