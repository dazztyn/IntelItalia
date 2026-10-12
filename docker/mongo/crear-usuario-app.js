// Lo ejecuta la imagen oficial de MongoDB solo la primera vez que se crea el volumen.
// Crea el usuario de la API con permisos únicamente sobre la base `intelitalia`
// (mínimo privilegio: la API no usa la cuenta root).
const usuario = process.env.MONGO_USUARIO_APP;
const clave = process.env.MONGO_CLAVE_APP;

if (!usuario || !clave) {
  throw new Error('Faltan MONGO_USUARIO_APP o MONGO_CLAVE_APP');
}

db.getSiblingDB('intelitalia').createUser({
  user: usuario,
  pwd: clave,
  roles: [{ role: 'readWrite', db: 'intelitalia' }],
});
