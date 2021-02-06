const pool = require('../database'); // referencia a ala base de datos
const helpers = require('../lib/helpers');

const api = {};
const Consulta = (pQuery) => pool.query(pQuery);

api.getDatosOrdenesApi = async (req, res) => {
  const { numeroOrden } = req.params;
  const dataOrden = await Consulta(`SELECT vehiculo_marca, modelo, anio, color, placa, km_inicial, nombre_usuario_asignado, nombre_cliente ,dni ,telefono, fecha_iniciacion, nombre_servicio, descripcion_cliente FROM v_historial_general where nro_orden = ${numeroOrden};`);
  /*   const {
      vehiculo_marca:vehiculo_marca,
      modelomodelo:modelomodelo,
      color:color,
      placa:placa,
      km_inicial:km_inicial,
      nombre_usuario_asignado:nombre_usuario_asignado,
      nombre_cliente:nombre_cliente,
      dni:dni,
      telefono:telefono,
      fecha_iniciacion:fecha_iniciacion
    } = dataOrden[0]; */

  const {
    vehiculo_marca,
    modelo,
    anio,
    color,
    placa,
    km_inicial,
    nombre_usuario_asignado,
    nombre_cliente,
    dni,
    telefono
  } = dataOrden[0];

  const fechaIniciacion = helpers.formatDate(dataOrden[0].fecha_iniciacion);

  let nombresServicios = [];
  let nombresDescripcionesServicios = [];

  for (let i = 0; i <= dataOrden.length - 1; i++) {
    nombresServicios[i] = dataOrden[i].nombre_servicio.toUpperCase();
    nombresDescripcionesServicios[i] = dataOrden[i].descripcion_cliente;
  }

  const data = {
    vehiculo_marca:vehiculo_marca.toUpperCase(),
    modelo:modelo.toUpperCase(),
    anio:anio,
    color:color.toUpperCase(),
    placa:placa.toUpperCase(),
    km_inicial:km_inicial,
    nombre_usuario_asignado:nombre_usuario_asignado.toUpperCase(),
    nombre_cliente:nombre_cliente.toUpperCase(),
    dni:dni,
    telefono:telefono,
    fechaIniciacion,
    nombresServicios,
    nombresDescripcionesServicios
  };
  res.json(data);
};

module.exports = api;
