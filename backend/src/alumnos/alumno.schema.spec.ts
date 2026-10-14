import { model, Types } from 'mongoose';
import { Alumno, AlumnoSchema } from './alumno.schema';

// validate() corre los validadores y el hook pre('validate') sin conectarse a MongoDB.
const AlumnoModelo = model(Alumno.name, AlumnoSchema);

const datosBase = {
  rut: '12.345.678-5',
  nombres: 'Ana María',
  apellidoPaterno: 'Pérez',
  apellidoMaterno: 'Soto',
};

describe('AlumnoSchema', () => {
  it('normaliza el RUT y calcula el nombre normalizado', async () => {
    const alumno = new AlumnoModelo(datosBase);
    await alumno.validate();

    expect(alumno.rut).toBe('12345678-5');
    expect(alumno.nombreNormalizado).toBe('ANA MARIA PEREZ SOTO');
  });

  it('rechaza un RUT con dígito verificador incorrecto', async () => {
    const alumno = new AlumnoModelo({ ...datosBase, rut: '12345678-9' });

    await expect(alumno.validate()).rejects.toThrow('El RUT no es válido');
  });

  it('exige RUT o IPE', async () => {
    const alumno = new AlumnoModelo({ ...datosBase, rut: null });

    await expect(alumno.validate()).rejects.toThrow('RUT o un IPE');
  });

  it('acepta un alumno con IPE y sin RUT', async () => {
    const alumno = new AlumnoModelo({
      ...datosBase,
      rut: null,
      ipe: '100900000-k',
    });
    await alumno.validate();

    expect(alumno.ipe).toBe('100900000-K');
  });

  it('acepta un alumno con un solo apellido', async () => {
    const alumno = new AlumnoModelo({ ...datosBase, apellidoMaterno: null });
    await alumno.validate();

    expect(alumno.nombreNormalizado).toBe('ANA MARIA PEREZ');
  });

  it('rechaza dos matrículas activas el mismo año', async () => {
    const alumno = new AlumnoModelo({
      ...datosBase,
      matriculas: [
        { anio: 2026, cursoId: new Types.ObjectId() },
        { anio: 2026, cursoId: new Types.ObjectId() },
      ],
    });

    await expect(alumno.validate()).rejects.toThrow('dos matrículas activas');
  });

  it('permite una matrícula retirada y otra activa el mismo año (traslado interno)', async () => {
    const alumno = new AlumnoModelo({
      ...datosBase,
      matriculas: [
        { anio: 2026, cursoId: new Types.ObjectId(), estado: 'retirada' },
        { anio: 2026, cursoId: new Types.ObjectId() },
      ],
    });

    await expect(alumno.validate()).resolves.toBeUndefined();
  });

  it('declara el dato PIE como oculto por defecto en las consultas', () => {
    expect(AlumnoSchema.path('pie').options).toMatchObject({ select: false });
  });
});
