const pool = require('../database');
const helpers = require('../lib/helpers');

const ordenesCtr = {};

ordenesCtr.RecuperarOrden = async(req, res, next) => {
  res.send('REcuperando');
  next();
};

// abrir-orden post
ordenesCtr.crearOrden = async (req, res, next) => { // CREAR NUEVA ORDEN
  // RECUPERAR INFORMACION DEL USUARIO

  const InfoUser = await helpers.InfoUser(req.user.id_usuario);
  const id_usuario = InfoUser.id_usuario;

  let d_hoy = {
    d_date: helpers.new_Date(new Date()),
    d_str: helpers.formatDateTime(helpers.new_Date(new Date()))
  };

  // RECUPERAR ID_VEHICULO Y EL ID_TIPO_CLIENTE
  const id_vehiculo = parseInt(req.body.id_vehiculo, 10);
  const id_cliente = req.body.id_usuario;
  const id_tipo_cliente = req.body.id_tipo_cliente;

  const resRecuperarPlaca = await pool.query(`CALL SP_FN_RecuperarPlaca(${id_vehiculo})`);
  const infoVehiculo = resRecuperarPlaca[0][0];
  console.log('Fn_RecuperarPlaca', infoVehiculo);

  console.log('id_usuario', id_usuario, 'id_vehiculo', id_vehiculo);
  const queryExistenciaDeVehiculoOrden = `CALL SP_FN_Existe_Registro_Orden_Vehiculo(${id_vehiculo},${id_usuario});`;
  const existenciaDeVehiculoOrden = await pool.query(queryExistenciaDeVehiculoOrden);

  const { nroOrdenesVehiculo } = existenciaDeVehiculoOrden[0][0];
  console.log('nroOrdenesVehiculo', existenciaDeVehiculoOrden);
  if (nroOrdenesVehiculo === 1) {
    req.flash('messages', 'Otro usuario abrió orden a este Vehiculo');
    res.redirect(`/info-cliente?id_vehiculo=${id_vehiculo}&placa=${infoVehiculo.placa}`);
    next();
  } else {
    // === RECUPERAR SERVICIOS QUE NO ESTEN EN LA LISTA DE SERVICIOS MAS USADOS :)
    const SP_Services = await pool.query('CALL SP_GET_Servicios_noTop()');
    const Get_Services = SP_Services[0];

    const idServices = [];
    const nameServices = [];
    let index = 0;
    Get_Services.forEach((element) => {
      idServices[index] = element.id_servicio;
      nameServices[index] = element.nombre_servicio;
      index += 1;
    });

    const allServices = { id: idServices, nombre_servicio: nameServices };

    // === RECUPERAR RECOMENDACIONES MENOS USADADAS
    const queryRecomendacionesMU = 'SELECT * FROM v_recomendaciones_menos_usadas;';
    const ConsultaRecomendacionesMenosUsadas = await pool.query(queryRecomendacionesMU);
    const ResRecomendacionesMenosUsadas = ConsultaRecomendacionesMenosUsadas;

    const idRecomendacionMU = [];
    const nombreRecomendacionMU = [];
    let indice = 0;
    ResRecomendacionesMenosUsadas.forEach((element) => {
      idRecomendacionMU[indice] = element.idRecomendacion;
      nombreRecomendacionMU[indice] = element.nombreRecomendacion;
      indice += 1;
    });

    const recomendacionesMenosUsadas = {
      idRecomendacion: idRecomendacionMU,
      nombreRecomendacion: nombreRecomendacionMU
    };

    // === RECUPERAR LOS SERVICIOS MAS USADOS :)

    const Get_Servicio = await pool.query("SELECT id_servicio,nombre_servicio FROM v_primeros_servicios;");
    const Primeros_Servicios = Get_Servicio;
    console.log("Primeros_Servicios", Primeros_Servicios);

    const id = [];
    const Nombre = [];
    let i = 0;

    Primeros_Servicios.forEach((element) => {
      id[i] = element.id_servicio;
      Nombre[i] = element.nombre_servicio;
      i += 1;
    });

    let Servicio = { id_servicio: id, nombre_servicio: Nombre };

    console.log(`'${id_vehiculo}','${id_cliente}','${id_usuario}'`);

    // === RECUPERAR LAS RECOMENDACIONES

    const idRecomendacion = [];
    const nombreRecomendacion = [];
    let cont = 0;
    const queryRecomendaciones = 'SELECT * FROM v_recomendaciones_mas_usadas;';
    const resRecomendaciones = await pool.query(queryRecomendaciones);
    console.log('resRecomendaciones', resRecomendaciones);

    resRecomendaciones.forEach((element) => {
      idRecomendacion[cont] = element.idRecomendacion;
      nombreRecomendacion[cont] = element.nombreRecomendacion;
      cont += 1;
    });

    const Recomendaciones = {
      idRecomendacion: idRecomendacion,
      nombreRecomendacion: nombreRecomendacion
    };

    console.log('Recomendaciones', Recomendaciones);

    // ==> Generar un Numero de orden
    // e INCERTAR en tdetale_pedido y tordenes actuales

    const query = `CALL SP_FN_generarNroOrden(${id_vehiculo}, ${id_cliente}, ${id_usuario})`;
    const callNroOrden = await pool.query(query);
    console.log('callNroOrden', callNroOrden);
    const { numero_Orden } = callNroOrden[0][0];

    console.log('NRO ORDEN GENERADA', numero_Orden);
    // ==> Incertar en ordenes Actuales y
    // en deTalle pedido SIN datos del asignado y sin datos de detalle
    console.log('numero_Orden,id_usuario,id_cliente,id_vehiculo', numero_Orden, id_usuario, id_cliente, id_vehiculo);
    let query_insert_Dpedido = `CALL SP_add_OrdenActual_DetallePedido(${numero_Orden},${id_vehiculo},${id_cliente},${id_tipo_cliente},${id_usuario},"${d_hoy.d_str}")`;
    await pool.query(query_insert_Dpedido);

    const NroOrden = numero_Orden.toString().padStart(6, '0'); // Concatenamos el numero de ortden para mostrar
    console.log('NroOrden', NroOrden);

    // ==> Mostrar los Usuarios Mecanico
    const consulta_Mecanicos_Habilitados = 'SELECT id_usuario,nombre,apellido_paterno,nro_ordenes FROM v_mecanicos_hablilitados;';
    let Mecanicos_Habilitados = await pool.query(consulta_Mecanicos_Habilitados);

    console.log('Mecanicos_Habilitados', Mecanicos_Habilitados);

    // ==> Enviar Toda la informacion al frontend
    const data = {
      InfoUser,
      numero_Orden,
      NroOrden,
      infoVehiculo,
      Servicio,
      Recomendaciones,
      allServices,
      recomendacionesMenosUsadas,
      Mecanicos_Habilitados,
      id_tipo_cliente
    };

    res.render('../views/crearOrden', { data: data });
  }
};

// POST /abrir-orden => /profile
ordenesCtr.asinarOrden = async (req, res) => {
  // RECUPERAR INFORMACION DEL USUARIO
  
  console.log('ESTOY AQUI!');
  const InfoUser = await helpers.InfoUser(req.user.id_usuario);
  let id_usuario = InfoUser.id_usuario;
  const usuario = { id_usuario };

  const infoPedido = {
    idPedido          : req.body.pedidos.idPedido.split(','),
    descripcionPedido : req.body.pedidos.descripcionPedido.split(',')
  };

  const infoRecomendacion = {
    idRecomendacion          : req.body.recomendaciones.idRecomendacion.split(','),
    descripcionRecomendacion : req.body.recomendaciones.descripcionRecomendacion.split(',')
  };

  // console.log('Los datos Recepcionados', Object.values(req.body));

  console.log('Los datos INFOPEDIDO', infoPedido);
  console.log('Los datos INFORECOMENDACION', infoRecomendacion);

  const Infopedido = Object.values(req.body);

  // OBTENER DATOS DE RECOMENDACIONES
  const nro_orden = Infopedido.shift(); // extraer el nro_orden primero de un array
  const km_inicial = Infopedido.shift(); // extraer el km_inicial luego del nro_orden
  // const id_user_asignado = Infopedido.pop(); // extraer el ultimo
  // const MiObservacion = Infopedido.pop(); // extraer el ultimo x2

  const id_user_asignado = req.body.idUsuarioAsignado;
  const MiObservacion = req.body.mis_Observaciones;

  console.log('req.body', req.body);

  console.log('Infopedido', Infopedido);

  console.log('nro_orden', nro_orden, 'MiObservacion', MiObservacion)
  const Observacion_Cliente = [];
  const ID_Servicio = [];

  for (let i = 0; i <= Infopedido.length - 1; i++) {
    if (i % 2 === 0) {
      ID_Servicio[ID_Servicio.length] = Infopedido[i];
    } else {
      Observacion_Cliente[Observacion_Cliente.length] = Infopedido[i];
    }
  }
  console.log('ID_Servicio,Observacion_Cliente = ', ID_Servicio, Observacion_Cliente)

  // === RECUPERAR PLACA ATRAVEZ DE SU NUMERO DE ORDEN :)
  const placaRecuperada = await pool.query(`CALL SP_FN_GET_placa_orden('${nro_orden}')`);
  const { placa } = placaRecuperada[0][0];
  console.log('placaRecuperada = ', placa);

  // === CONSULTAR SI EXISTE EL DETALLE PEDIDO PARA ESE CHECKLIST :) para que no se repita el pedido al recargar la pagina
  const Consulta_id_DetallePedido = await pool.query(`select id_detallePedido as id_DetallePedido from tdetallepedido where nro_orden = '${nro_orden}'`);
  const { id_DetallePedido } = Consulta_id_DetallePedido[0];

/*   const Get_Existencia_pedido = await pool.query(`CALL SP_FN_GET_pedido_Existente('${id_DetallePedido}')`);
  const { existencia } = Get_Existencia_pedido[0][0]; */

  // const qryEstadoOrden = await pool.query(`SELECT id_estadoOrden as idEstadoOrden FROM tdetallepedido where id_detallePedido = ${id_DetallePedido};`);
  // const resEstadoOrden = qryEstadoOrden[0][0];
  // const estadoOrden = resEstadoOrden;

  // if (estadoOrden !== 4 || estadoOrden !== 7) {
    await pool.query(`DELETE FROM tpedido WHERE id_detallePedido = ${id_DetallePedido}`);
    await pool.query(`DELETE FROM tpedidorecomendacion WHERE idDetallePedido = ${id_DetallePedido}`);

    for (let richar = 0; richar <= infoPedido.idPedido.length - 1; richar++) {
      await pool.query(`CALL SP_NuevoPedido(${infoPedido.idPedido[richar]},"${infoPedido.descripcionPedido[richar]}",${id_DetallePedido})`);
    }
    for (let che = 0; che <= infoRecomendacion.idRecomendacion.length - 1; che++) {
      await pool.query(`CALL SP_NuevaRecomendacion(${infoRecomendacion.idRecomendacion[che]},"${infoRecomendacion.descripcionRecomendacion[che]}",${id_DetallePedido})`);
    }
    await pool.query(`UPDATE tdetallepedido SET id_usuario_asignado = ${id_user_asignado},Detalle_usuario = "${MiObservacion}",km_inicial = "${km_inicial}",id_estadoOrden = ${7} WHERE id_detallePedido = ${id_DetallePedido}`);
    await pool.query(`UPDATE tordenes_actuales SET id_estadoOrden = ${7} WHERE nro_orden = ${nro_orden}`);
  // } else {
  //   console.log('OCURRIO UN PROBLEMA JAJAJAJAJ');
  // }

/*   if (existencia != 0) { // Si existe algun dato // el estado puede ser todos menos 6 = facturando
    await pool.query(`DELETE FROM tpedido WHERE id_detallePedido = ${id_DetallePedido}`);
    await pool.query(`DELETE FROM tpedidorecomendacion WHERE idDetallePedido = ${id_DetallePedido}`);

    for (let richar = 0; richar <= infoPedido.idPedido.length - 1; richar++) {
      await pool.query(`CALL SP_NuevoPedido(${infoPedido.idPedido[richar]},"${infoPedido.descripcionPedido[richar]}",${id_DetallePedido})`);
    }
    for (let che = 0; che <= infoRecomendacion.idRecomendacion.length - 1; che++) {
      await pool.query(`CALL SP_NuevaRecomendacion(${infoRecomendacion.idRecomendacion[che]},"${infoRecomendacion.descripcionRecomendacion[che]}",${id_DetallePedido})`);
    }
    await pool.query(`UPDATE tdetallepedido SET id_usuario_asignado = ${id_user_asignado},Detalle_usuario = "${MiObservacion}",km_inicial = "${km_inicial}" WHERE id_detallePedido = ${id_DetallePedido}`);
  } else { // no existe algun // el estdo es tomando pedido = 4
    for (let richar2 = 0; richar2 <= infoPedido.idPedido.length - 1; richar2++) {
      await pool.query(`CALL SP_NuevoPedido(${infoPedido.idPedido[richar2]},"${infoPedido.descripcionPedido[richar2]}",${id_DetallePedido})`);
    }
    for (let che2 = 0; che2 <= infoRecomendacion.idRecomendacion.length - 1; che2++) {
      await pool.query(`CALL SP_NuevaRecomendacion(${infoRecomendacion.idRecomendacion[che2]},"${infoRecomendacion.descripcionRecomendacion[che2]}",${id_DetallePedido})`);
    }
    await pool.query(`UPDATE tdetallepedido SET id_usuario_asignado = ${id_user_asignado},Detalle_usuario = "${MiObservacion}",km_inicial = "${km_inicial}" WHERE id_detallePedido = ${id_DetallePedido}`)
  } */
  console.log('Consulta_id_DetallePedido', id_DetallePedido);

  // DEBUELVE UNA VISTA
  const Sp_Pedido_Cliente = await pool.query(`Call SP_cliente_de_Pedido_actual(${id_DetallePedido})`);
  const pedido_cliente = {
    nombre,
    telefono,
    vehiculo_marca,
    modelo,
    color
  } = Sp_Pedido_Cliente[0][0];
  console.log('pedido_cliente', pedido_cliente);

  // const data = {placa,nro_orden,usuario,pedido_cliente,Checklist,Checklist_Aux}
  const data = {
    placa,
    km_inicial,
    nro_orden,
    usuario,
    pedido_cliente
  };

  console.log('Todos los datos :', data);
  req.flash('messages', 'La orden se ha asignado Correctamente !');
  res.redirect('/profile');
};

module.exports = ordenesCtr;