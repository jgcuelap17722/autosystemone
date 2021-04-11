const pool = require('../database'); // referencia a ala base de datos
const helpers = require('../lib/helpers');

const administracion = {};
const Consulta = (pQuery) => pool.query(pQuery);

administracion.getRecursosHumanos = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const InfoUser = await helpers.InfoUser(req.user.id_usuario); // Info Usuario Logueado
  console.log('MI USUARIO :p', idUsuario);
  if (idUsuario === 1) {
    const qryRecursosHumanos = `SELECT nombre,apellido_paterno,apellido_materno,tipo_usuario,telefono,edad,dni,username,estado,direccion,email FROM v_tusuario_tpersona;`;
    const resRecursosHumanos = await Consulta(qryRecursosHumanos);
    const recursosHumanos = resRecursosHumanos;
    console.log('SALIDA DE RESPUESTA', recursosHumanos);
    const data = { InfoUser, recursosHumanos };
    res.render('RecursosHumanos', { data: data });
  } else {
    res.json({ status: 0 });
  }
};

module.exports = administracion;
