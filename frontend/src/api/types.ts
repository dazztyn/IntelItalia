export interface Usuario {
  correo: string
  nombre: string
  rol: string
  /** Permisos con la forma "alumnos.ver", "pie.ver"… */
  permisos: string[]
}
