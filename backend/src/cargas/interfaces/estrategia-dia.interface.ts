import { Types } from 'mongoose';

export interface DatosDia {
  porcentajesPorEje: Record<string, number> | null;
  porcentajeLogro: number | null;
}

export interface MetaDia {
  tipoId: Types.ObjectId;
  momento: string;
  area: string;
}
