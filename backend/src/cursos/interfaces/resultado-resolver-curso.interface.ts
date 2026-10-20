import { CursoDocument } from '../curso.schema';

export type ResultadoResolverCurso =
  | { estado: 'encontrado'; curso: CursoDocument }
  | { estado: 'noExiste' }
  | { estado: 'ambiguo'; cursos: CursoDocument[] };