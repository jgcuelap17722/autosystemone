const pool = require('../database'); // referencia a ala base de datos
const helpers = require('../lib/helpers');

const api = {};
const Consulta = (pQuery) => pool.query(pQuery);

api.getDatosOrdenesApi = async (req, res) => {
  const { numeroOrden } = req.params;
  const qryOrden = `CALL SP_GET_ORDEN_IMRESION(${numeroOrden});`;
  const resOrden = await Consulta(qryOrden);
  const dataOrden = resOrden[0];

  const qryRecomendacion = `CALL SP_GET_RECOMENDACION_IMRESION(${numeroOrden});`;
  const resRecomendacion = await Consulta(qryRecomendacion);
  const dataRecomendacion = resRecomendacion[0];

  console.log('SALIDA ORDEN', dataOrden);
  console.log('SALIDA RECOMENDACION', dataRecomendacion);

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
    telefono,
    detalleUsuario
  } = dataOrden[0];

  const fechaIniciacion = helpers.formatDate(dataOrden[0].fecha_iniciacion);

  const nombresServicios = [];
  const nombresDescripcionesServicios = [];
  const nombresRecomendacion = [];
  const descripcionesServicios = [];

  for (let i = 0; i <= dataOrden.length - 1; i++) {
    nombresServicios[i] = dataOrden[i].nombre_servicio.toUpperCase();
    nombresDescripcionesServicios[i] = dataOrden[i].descripcion_cliente;
  }

  for (let i = 0; i <= dataRecomendacion.length - 1; i++) {
    nombresRecomendacion[i] = dataRecomendacion[i].nombreRecomendacion.toUpperCase();
    descripcionesServicios[i] = dataRecomendacion[i].descripcionRecomendacion;
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
    detalleUsuario,
    nombresServicios,
    nombresDescripcionesServicios,
    nombresRecomendacion,
    descripcionesServicios
  };
  res.json(data);
};

module.exports = api;
