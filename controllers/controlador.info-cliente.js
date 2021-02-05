const pool = require('../database'); // referencia a ala base de datos
const helpers = require('../lib/helpers');
const Queries = require('../lib/Queries');

const info_clienteCtr = {};
const Consulta = (pQuery) => pool.query(pQuery);
info_clienteCtr.Recuperar_info_Cliente = async (req, res, next) => {
  console.log('req.query', req.query);
  // VARIABLES
  const InfoUser        = await helpers.InfoUser(req.user.id_usuario); // Info Usuario Logueado
  const idVehiculo      = parseInt(req.query.id_vehiculo, 10); // id_vehiculo Info
  const TipoCliente     = await Queries.Tipo_Cliente_IDS_Tipo_Cliente(); // Consulta
  const idTipo_cliente  = [];
  const Tipo_cliente    = [];

  let n = 0;
  TipoCliente.forEach((element) => {
    idTipo_cliente[n] = element.id_tipo_cliente;
    Tipo_cliente[n] = element.tipo_cliente;
    n++;
  });

  const Tipos_Cliente = { idTipo_cliente, Tipo_cliente };
  console.log('idTipo_cliente - Tipo_cliente', Tipos_Cliente);

  // RECUPERAR HISTORIAL DE SERVICIOS DEL VEHICULO
  const queryHistorialServicios     = `SELECT * FROM v_historial_resumen where id_vehiculo = ${idVehiculo};`;
  const consultaHistorialServicios  = await Consulta(queryHistorialServicios);
  const historial_servicios         = consultaHistorialServicios;

  // RECUPERAR HISTORIUAL DE LLAMADAS
  const query_historial_seguimiento       = `SELECT * FROM v_ids_detalle_seguimiento where id_vehiculo = ${idVehiculo} && id_usuario is not null;`;
  const consulta_historial_seguimiento    = await Consulta(query_historial_seguimiento);
  const historial_seguimiento             = consulta_historial_seguimiento;
  Validar_Usuario_Seguimiento = async (pId_usuario) => {
    // Recuperar los diferentes usuarios que hicieron las llamadas a clientes
    const queryInfoUsuario     = `
    SELECT nombre,apellido_paterno FROM v_tusuario_tpersona WHERE id_usuario = ${pId_usuario};`;
    const consultaInfoUsuario           = await Consulta(queryInfoUsuario);
    const { nombre, apellido_paterno }  = consultaInfoUsuario[0];
    console.log('No es nulo el id_usuario', consultaInfoUsuario);
    const data = {
      nombre:nombre,
      apellido_paterno:apellido_paterno
    };
    return data;
  };

  Info_Servicios = async () => {
    if (historial_servicios.length != 0) {
      let Tiempo_Inicio = [],
      Tiempo_Inicio_corto = [],
      h = 0;
  
    historial_servicios.forEach(element => {
      Tiempo_Inicio[h]        = helpers.timeago_int(historial_servicios[h].fecha_iniciacion)
      Tiempo_Inicio_corto[h]  = helpers.formatTime(historial_servicios[h].fecha_iniciacion)
      h++
    });

    info_servicios = 
    {
      historial_servicios,
      Tiempo_Inicio,
      Tiempo_Inicio_corto,
      estado:true
    }

    return info_servicios
    } else {
      info_servicios = 
      {
        estado:false
      }
    return info_servicios
    }
  };

  Info_seguimiento = async () => {

    if (historial_seguimiento.length != 0){
      let Tiempo_Seguimiento=[]
      let Tiempo_Seguimiento_corto=[]
  
      let info_emisor = {},info_seguimiento={};
  
      for (let index = 0; index <= historial_seguimiento.length-1; index++) {
        Tiempo_Seguimiento[index]       = helpers.timeago_int(historial_seguimiento[index].fecha_seguimiento)
        Tiempo_Seguimiento_corto[index] = helpers.formatDate(historial_seguimiento[index].fecha_seguimiento)
        info_emisor = {nombre:nombre,apellido_paterno:apellido_paterno} = await Validar_Usuario_Seguimiento(historial_seguimiento[index].id_usuario)
        console.log('BOOCLE',info_emisor)
        await Object.assign(historial_seguimiento[index],info_emisor)
      }
  
      console.log('Data Historial Seguimiento',historial_seguimiento);
      console.log('Tiempo_Seguimiento',Tiempo_Seguimiento);
      console.log('Tiempo_Seguimiento_corto',Tiempo_Seguimiento_corto);
      info_seguimiento = 
      {
        historial_seguimiento,
        Tiempo_Seguimiento,
        Tiempo_Seguimiento_corto,
        estado:true
      }
      return info_seguimiento;
    }else{

      info_seguimiento = 
      {
        estado:false
      }
      return info_seguimiento;
    }
    
  };

  console.log('Salida de Info_seguimiento', Info_seguimiento());

  const consultaClienteDni = await Consulta('select nombre_cliente,dni,id_cliente from tcliente');
  const data = { nombre_cliente, dni, id_cliente } = consultaClienteDni;

  const nombre_dni = [];
  const pId_cliente = [];
  const pnombre_cliente = [];

  let cont = 0;
  data.forEach((element) => {
    pnombre_cliente[cont] = element.nombre_cliente;
    pId_cliente[cont] = element.id_cliente;
    nombre_dni[cont, cont] = [`${element.dni} - ${element.nombre_cliente}`, element.nombre_cliente];
    cont++;
  });

  try {
    const spRecuperarCliente = await Queries.SP_recuperar_Cliente(idVehiculo);
    console.log('Exito');
    // Almacenamos la cantidad de dueños de dicha placa
    const nResultados = spRecuperarCliente.length;

    // Almacenamos los datos de los dueños de dicha placa
    const ClientCarr = spRecuperarCliente;

    // Recuperamos la data de la funcion Info_seguimiento
    const info_seguimiento = await Info_seguimiento();

    // Recuperamos la data de la funcion Info_Servicios
    const info_servicios = await Info_Servicios();
    // Almacenamos en un solo arreglo los datos antes dichos
    const data = { InfoUser, ClientCarr, nResultados, Tipos_Cliente,
      // Info_vehiculo,
      // Tiempo_Inicio,
      // Tiempo_Inicio_corto,
      // historial_servicios,
      info_servicios,
      info_seguimiento,
      nombre_dni,
      pId_cliente,
      pnombre_cliente
    };

    console.log('Data Salida info-cliente', data);
    // Renderizamos enviando los datos almacenados en "dataCliente"
    res.render("formInfoCliente", { data:data });
  } catch (error) {
    res.send(`Ocurrio un error en la Consulta o otra cosa XD => ${error}`);
    next();
  }
};

module.exports = info_clienteCtr;