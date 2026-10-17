import { calcularDigitoVerificador, esRutValido, normalizarRut } from './rut';

describe('normalizarRut', () => {
  it.each([
    ['12.345.678-5', '12345678-5'],
    ['12345678-5', '12345678-5'],
    ['123456785', '12345678-5'],
    [' 9.876.543-k ', '9876543-K'],
    ['09876543-K', '9876543-K'],
  ])('%s → %s', (entrada, esperado) => {
    expect(normalizarRut(entrada)).toBe(esperado);
  });
});

describe('calcularDigitoVerificador', () => {
  it.each([
    ['12345678', '5'],
    ['11111111', '1'],
    ['10000013', 'K'],
    ['7654321', '6'],
  ])('cuerpo %s → DV %s', (cuerpo, dv) => {
    expect(calcularDigitoVerificador(cuerpo)).toBe(dv);
  });

  it('devuelve 0 cuando el resto es 11', () => {
    expect(calcularDigitoVerificador('10000004')).toBe('0');
  });
});

describe('esRutValido', () => {
  it('acepta RUT válidos con o sin formato', () => {
    expect(esRutValido('12.345.678-5')).toBe(true);
    expect(esRutValido('10000013-k')).toBe(true);
  });

  it('rechaza un DV incorrecto', () => {
    expect(esRutValido('12345678-9')).toBe(false);
  });

  it('rechaza textos que no son RUT', () => {
    expect(esRutValido('')).toBe(false);
    expect(esRutValido('abc')).toBe(false);
    expect(esRutValido('0-0')).toBe(false);
    expect(esRutValido('123456789-0')).toBe(false);
  });
});
