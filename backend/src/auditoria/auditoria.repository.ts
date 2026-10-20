import { NuevoRegistroAuditoria } from "./interfaces/nuevo-registro-auditoria.interface";


export abstract class AuditoriaRepository {
  abstract registrar(datos: NuevoRegistroAuditoria): Promise<void>;
}