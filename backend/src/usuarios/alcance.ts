import { Types } from 'mongoose';
import type { UsuarioAutorizado } from './usuarios.service';

type ConAlcance = Pick<UsuarioAutorizado, 'alcance' | 'cursoIds'>;

/**
 * Cursos que el usuario puede ver y cargar (docs/ARQUITECTURA.md, sección 7.4):
 * `null` si su alcance es la escuela entera; si no, sus cursos asignados
 * (vacío si no tiene ninguno, y entonces no ve alumnos).
 */
export function cursosPermitidos(usuario: ConAlcance): Types.ObjectId[] | null {
  return usuario.alcance === 'escuela' ? null : usuario.cursoIds;
}

export function tieneAccesoACurso(
  usuario: ConAlcance,
  cursoId: Types.ObjectId | string,
): boolean {
  const permitidos = cursosPermitidos(usuario);
  return permitidos === null || permitidos.some((id) => id.equals(cursoId));
}
