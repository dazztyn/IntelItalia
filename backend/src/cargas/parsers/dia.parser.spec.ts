import { crearDiaFicticio } from '../../semilla/dia-ficticio';
import { FormatoInvalidoError, parsearDia } from './dia.parser';

describe('parsearDia', () => {
  it('lee curso, año, área y los porcentajes de Lectura con coma decimal', async () => {
    const archivo = await crearDiaFicticio({
      curso: '3 A',
      filas: [
        [1, 'PÉREZ SOTO ANA MARÍA', '55,5', '70', '20,25'],
        [3, 'ROJAS LUIS', 80, 90, 100],
      ],
    });

    const dia = await parsearDia(archivo);

    expect(dia).toMatchObject({
      nivel: '3',
      letra: 'A',
      anio: 2026,
      area: 'lenguaje',
    });
    expect(dia.ejes).toEqual([
      'localizar',
      'interpretarRelacionar',
      'reflexionar',
    ]);
    expect(dia.filas[0]).toEqual({
      fila: 14,
      numeroLista: 1,
      nombre: 'PÉREZ SOTO ANA MARÍA',
      porcentajesPorEje: {
        localizar: 55.5,
        interpretarRelacionar: 70,
        reflexionar: 20.25,
      },
      porcentajeLogro: 48.58,
      error: undefined,
    });
    expect(dia.filas[1].porcentajeLogro).toBe(90);
  });

  it('reconoce Matemática y usa los OA como claves', async () => {
    const dia = await parsearDia(
      await crearDiaFicticio({
        area: 'matematica',
        ejes: ['OA2', 'OA 3'],
        filas: [[1, 'ROJAS LUIS', '73,08', '50']],
      }),
    );

    expect(dia.area).toBe('matematica');
    expect(dia.filas[0].porcentajesPorEje).toEqual({ OA2: 73.08, OA3: 50 });
  });

  it('marca "sin resultado" a quien no rindió, nunca 0%', async () => {
    const dia = await parsearDia(
      await crearDiaFicticio({ filas: [[2, 'ROJAS LUIS', null, null, null]] }),
    );

    expect(dia.filas[0]).toMatchObject({
      porcentajesPorEje: null,
      porcentajeLogro: null,
    });
    expect(dia.filas[0].error).toBeUndefined();
  });

  it('marca error de fila con porcentajes incompletos o fuera de rango', async () => {
    const dia = await parsearDia(
      await crearDiaFicticio({
        filas: [
          [1, 'ROJAS LUIS', '50', null, '20'],
          [2, 'SOTO ANA', '150', '10', '20'],
        ],
      }),
    );

    expect(dia.filas[0].error).toBe(
      'Faltan porcentajes: interpretarRelacionar',
    );
    expect(dia.filas[1].error).toBe('Porcentaje inválido en localizar');
  });

  it('acepta el curso escrito como "3° Básico B" y sin letra', async () => {
    const conTexto = await parsearDia(
      await crearDiaFicticio({
        curso: '3° Básico B',
        filas: [[1, 'ROJAS LUIS', 1, 2, 3]],
      }),
    );
    const sinLetra = await parsearDia(
      await crearDiaFicticio({
        curso: '4',
        filas: [[1, 'ROJAS LUIS', 1, 2, 3]],
      }),
    );

    expect(conTexto).toMatchObject({ nivel: '3', letra: 'B' });
    expect(sinLetra).toMatchObject({ nivel: '4', letra: null });
  });

  it('rechaza archivos que no tienen el formato del DIA', async () => {
    await expect(parsearDia(Buffer.from('no es un excel'))).rejects.toThrow(
      FormatoInvalidoError,
    );
    await expect(
      parsearDia(
        await crearDiaFicticio({
          ejes: ['Comprender'],
          filas: [[1, 'ROJAS LUIS', 1]],
        }),
      ),
    ).rejects.toThrow('Eje de Lectura desconocido: COMPRENDER');
    await expect(
      parsearDia(
        await crearDiaFicticio({
          curso: 'Kínder',
          filas: [[1, 'ROJAS LUIS', 1, 2, 3]],
        }),
      ),
    ).rejects.toThrow('Curso no reconocido');
  });
});
