if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const path         = require('path');
const morgan       = require('morgan');
const express      = require('express');
const SocketIO     = require('socket.io');
const session      = require('express-session');
const passport     = require('passport');
const https        = require('https');
const fs           = require('fs');
const flash        = require('connect-flash'); // Middlewares
const MySQLStore   = require('express-mysql-session');
const { CronJob }  = require('cron');
const coneccion    = require('./database');
const { database } = require('./keys');
const helpers      = require('./lib/helpers');

// Funcion parahacer consultass
const Consulta = (pQuery) => coneccion.query(pQuery);

// inicializacion
const app = express();
require('./lib/passport');

// Configuracion
app.set('port', process.env.PORT || 4500);

// Middlewares
app.use(session({
  secret           : 'faztmysqlnodemysql',
  resave           : false,
  saveUninitialized: false,
  store            : new MySQLStore(database) // donde guardar la secion
}));

app.use(flash());
app.use(passport.initialize()); // iniciate passport
app.use(passport.session()); // inicia secion passport

app.use(morgan('dev')); // usar morgan
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Variables Globales variables que toda la APP pueda acceder"
app.use(async (req, res, next) => {
  app.locals.success = req.flash('success');
  app.locals.messages = req.flash('messages');
  app.locals.confirmation = req.flash('confirmation');
  app.locals.user = req.user;
  // console.log('req.user =============> ',req.user)
  if (typeof req.user != 'undefined') {
    const GetUser = `SELECT * FROM v_tusuario_tpersona WHERE id_usuario = ${req.user.id_usuario};`;
    const infUser = await Consulta(GetUser);
    app.locals.users = infUser[0];
  }
  next();
});

// Rutas
app.use('/', require('./routes'));
app.use('/abrir-orden', require('./routes/Ordenes'));
app.use(require('./routes/authentication')); // para autenticar usuario
/* var routes = require('./routes');
app.use('/', routes); */

// Publico "archibos que toda la APP pueda acceder"
app.use(express.static(path.join(__dirname, 'public')));

// INICIAR EL SERVIDOR

const servidor = () => {
  let ser;
  if (process.env.NODE_ENV !== 'develoment') { // 1 = Desarrollo / 0 = Online
    // Servidor Online
    ser = app.listen(app.get('port'), () => {
      console.log('Servidor Online en Puerto', app.get('port'));
    });
    console.log("Ejecutando en", process.env.NODE_ENV);
    return ser;
  }
  // localhost con sertificado ssl
  const httpsOptions = {
    key: fs.readFileSync('./security/cert.key'),
    cert: fs.readFileSync('./security/cert.pem')
  };
  ser = https.createServer(httpsOptions, app)
    .listen(app.get('port'), () => {
      console.log('Servidor Local en Puerto ', app.get('port'));
    });
  console.log("Ejecutando en", process.env.NODE_ENV);
  return ser;
};

const server = servidor();

// Iniciar el Servidor

// localhost con sertificado ssl
/* const httpsOptions = {
  key: fs.readFileSync('./security/cert.key'),
  cert: fs.readFileSync('./security/cert.pem')
};

const server = https.createServer(httpsOptions, app)
  .listen(app.get('port'), () => {
    console.log('Servidor en Puerto ', app.get('port'));
  }); */

// localhost SIN sertificado ssl
/* const server = app.listen(app.get('port'), () => {
  console.log('Servidor en Puerto ', app.get('port'));
}); */

// coneccion de socket
const io = SocketIO(server);

// Lugar de las vistas y con el respectivo FORMATO DE VISTAS
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "pug");
app.use(express.urlencoded({ extended: true }));

// Creando Rutas
app.get('*', (_req, res) => {
  const error = 'error: Pagina no encontrada';
  res.render('Pagina404', { error: error });
});

// === S O C K E T S ===

const EjecucionCron = async (data, nDatos) => {
  // Crea la notificacion en el mismo instante
  // INCERTAR LA FECHA DE NOTIFICACION EN LA BASE DE DATOS
  const NuevafechaNotificacion = helpers.new_Date(new Date());
  const fechaNotificacionStr = helpers.formatDateTime(NuevafechaNotificacion);

  const query = `CALL SP_Get_Fecha_Notificacion("${fechaNotificacionStr}",${data.id_seguimiento})`;
  const ConsultaFechaNotificacion = await Consulta(query);
  const fechaNotificacion = ConsultaFechaNotificacion[0][0].fecha_notificacion;

  const objCrearSeguimiento = {
    nombre_cliente: data.nombre_cliente,
    dia: data.nombre_etapa_seguimineto,
    fecha_notificacion: helpers.timeago_int(fechaNotificacion),
    id_detalle_pedido: data.id_detallePedido,
    id_seguimiento: data.id_seguimiento,
    id_cliente: data.id_cliente,
    id_vehiculo: data.id_vehiculo,
    nroSeguimientos: nDatos
  };
  console.log('OBJETO ARMADO=>', objCrearSeguimiento);
  io.emit('Crear_Notificaciones_Seguimiento', objCrearSeguimiento);
};
// DESBILITE EL LLAMADO AUTOMATICO A ESTA FUNCION
fauto = async () => {
  const queryNotificacionesFuturas = 'SELECT * FROM v_ids_detalle_seguimiento WHERE fecha_notificacion is null && id_estado_seguimiento <> 2 && id_etapa_seguimiento <> 4 && id_etapa_seguimiento <> 5 && id_etapa_seguimiento <> 6;';
  const notificacionesFuturas = await Consulta(queryNotificacionesFuturas);
  console.log('Notificaciones SEGUIMIENTO HOY', JSON.stringify(notificacionesFuturas));
  // ARMANDO MI FECHA
  const miFechaActual = helpers.new_Date(new Date());
  const miAnio = miFechaActual.getFullYear();
  const miFecha = miFechaActual.getDate(); // 1 - 31
  const miMes = miFechaActual.getMonth() + 1; // 0 - 11
  const miFechaString = `${miFecha}/${miMes}/${miAnio}`;
  const nroSeguimientos = notificacionesFuturas.length;

  for (let j = 0; j <= notificacionesFuturas.length - 1; j++) {
    console.log('INICIO*******************************************************************************');
    // SABER EN QUE ETAPA ESTA LA NOTIFICACION QUE LLEGARÁ 1 2 3
    console.log('El contador es: ', j);
    // ARMAR EL OBJETO PARA ENVIARLO
    const dataSeguimiento = {
      id_etapa_seguimiento: notificacionesFuturas[j].id_etapa_seguimiento,
      nombre_cliente: notificacionesFuturas[j].nombre_cliente,
      fecha_salida: notificacionesFuturas[j].fecha_salida,
      fecha_notificacion: notificacionesFuturas[j].fecha_notificacion,
      fecha_seguimiento: notificacionesFuturas[j].fecha_seguimiento,
      id_detallePedido: notificacionesFuturas[j].id_detallePedido,
      nombre_etapa_seguimineto: notificacionesFuturas[j].nombre_etapa_seguimineto,
      id_seguimiento: notificacionesFuturas[j].id_seguimiento,
      id_cliente: notificacionesFuturas[j].id_cliente,
      id_vehiculo: notificacionesFuturas[j].id_vehiculo
    };

    console.log('OBKETO_NUEVOd:', dataSeguimiento);

    switch (dataSeguimiento.id_etapa_seguimiento) {
      case 1: {
        const fechaCron1 = dataSeguimiento.fecha_salida;
        fechaCron1.setDate(fechaCron1.getDate() + 1);
        fechaCron1.setHours(9);
        fechaCron1.setMinutes(0);
        fechaCron1.setSeconds(0);

        const miAnioCron1 = fechaCron1.getFullYear();
        const miFechaCron1 = fechaCron1.getDate();  // 1 - 31
        const miMesCron1 = fechaCron1.getMonth() + 1; // 0 - 11

        const miFechaCron1String = `${miFechaCron1}/${miMesCron1}/${miAnioCron1}`;

        console.log('Nueva fecha Cron_1 es ==', helpers.formatDateTime(fechaCron1));
        console.log('Mi fecha', miFechaActual, ' >= ', fechaCron1);
        if (miFechaActual >= fechaCron1) {
          console.log('Si');
          EjecucionCron(dataSeguimiento, nroSeguimientos);
        } else if (miFechaString === miFechaCron1String) {
          new CronJob({
            cronTime: fechaCron1,
            onTick: CronFunction = () => {
              console.log('EJECUCION____Cron ID_', dataSeguimiento.id_seguimiento);
              EjecucionCron(dataSeguimiento, nroSeguimientos);
            },
            start: true,
            timeZone: 'America/Lima'
          });
        } else {
          console.log('Todavia No -- Ahorita vemos');
        }
        console.log('CASE_1_ANTES', j);
        // j++
        console.log('CASE_1_DESPUES', j);
        break;
      }
      case 2: {
        const queryUltimoSeguimiento2 = `CALL SP_ULTIMO_REGISTRO_SEGUIMIENTO(${dataSeguimiento.id_vehiculo})`;
        const consultaUltimoSeguimiento2 = await Consulta(queryUltimoSeguimiento2);
        console.log('Ultimo seguimiento de Vehiculo_2', consultaUltimoSeguimiento2[0][0]);

        const fechaCron2 = consultaUltimoSeguimiento2[0][0].fecha_seguimiento;
        fechaCron2.setDate(fechaCron2.getDate() + 7);
        fechaCron2.setHours(14); // 14 horas? (es por que a esa hora en america latima es 9 am)
        fechaCron2.setMinutes(0);
        fechaCron2.setSeconds(0);
        console.log('Nueva fecha Cron_2 es ==', helpers.formatDateTime(fechaCron2));

        const miAnioCron2 = fechaCron2.getFullYear();
        const miFechaCron2 = fechaCron2.getDate(); // 1 - 31
        const miMesCron2 = fechaCron2.getMonth() + 1; // 0 - 11

        const miFechaCron2String = `${miFechaCron2}/${miMesCron2}/${miAnioCron2}`;

        if (miFechaActual >= fechaCron2) {
          EjecucionCron(dataSeguimiento, nroSeguimientos);
        } else if (miFechaString == miFechaCron2String) {
          new CronJob({
            cronTime: fechaCron2,
            onTick: CronFunction = () => {
              console.log('EJECUCION____Cron ID_', dataSeguimiento.id_seguimiento);
              EjecucionCron(dataSeguimiento, nroSeguimientos);
            },
            start: true,
            timeZone: 'America/Lima'
          });
        } else {
          console.log('Todavia No -- Ahorita vemos');
        }
        console.log('CASE_2_ANTES', j);
        // j++
        console.log('CASE_2_DESPUES', j);
        break;
      }
      case 3: {
        const queryUltimoSeguimiento3 = `CALL SP_ULTIMO_REGISTRO_SEGUIMIENTO(${dataSeguimiento.id_vehiculo})`;
        const consultaUltimoSeguimiento3 = await Consulta(queryUltimoSeguimiento3);
        console.log('Ultimo seguimiento de Vehiculo_3', consultaUltimoSeguimiento3[0]);

        const fechaCron3 = consultaUltimoSeguimiento3[0][0].fecha_seguimiento;
        fechaCron3.setDate(fechaCron3.getDate() + 30);
        // fechaCron3.setMonth(fechaCron3.getMonth());
        // fechaCron3.setFullYear(consultaUltimoSeguimiento3[0][0].fecha_seguimiento.getFullYear());
        fechaCron3.setHours(14); // 14 horas? (es por que a esa hora en america latima es 9 am)
        fechaCron3.setMinutes(0);
        fechaCron3.setSeconds(0);
        console.log('Nueva fecha Cron_3 es ==', helpers.formatDateTime(fechaCron3));

        const miAnioCron3 = fechaCron3.getFullYear();
        const miFechaCron3 = fechaCron3.getDate(); // 1 - 31
        const miMesCron3 = fechaCron3.getMonth() + 1; // 0 - 11

        const miFechaCron3String = `${miFechaCron3}/${miMesCron3}/${miAnioCron3}`;
        console.log('Hora de llegada pactada', miFechaCron3String);

        if (miFechaActual >= fechaCron3) {
          EjecucionCron(dataSeguimiento, nroSeguimientos);
        } else if (miFechaString === miFechaCron3String) {
          new CronJob({
            cronTime: fechaCron3,
            onTick: CronFunction = () => {
              console.log('EJECUCION____Cron ID_', dataSeguimiento.id_seguimiento);
              EjecucionCron(dataSeguimiento, nroSeguimientos);
            },
            start: true,
            timeZone: 'America/Lima'
          });
        } else {
          console.log('Todavia No -- Ahorita vemos');
        }
        console.log('CASE_3_ANTES', j);
        // j++
        console.log('CASE_3_DESPUES', j);
        break;
      }
      default: {
        break;
      }
    }
    console.log('FIN*******************************************************************************');
    console.log('El contador j es: ', j);
  }

  console.log('Esta es mi fecha', miFechaActual);
};

io.on('connection', (sk_nuevoCliente) => {
  // console.log("socket sk_nuevoCliente");

  // RECIBIR UNA MARCA Y DEVOLVER SUS MODELOS E IDS
  sk_nuevoCliente.on('marca_auto', async (pmarca) => {
    const spModeloDeMarca = await coneccion.query(`call SP_get_modelo_marca("${pmarca}")`);
    // Variables para extraer modelo de la marca
    const id = []; const modelo = []; const modeloDeMarca = spModeloDeMarca[0];
    // Extraer valores atravez de un forEach
    let i = 0;
    modeloDeMarca.forEach((element) => {
      id[i] = element.id_modelo_auto;
      modelo[i] = element.modelo;
      i++;
    });
    const idModelo = { id, modelo };
    // enviar esos modelos por un socket :D
    sk_nuevoCliente.emit('modelo_auto', idModelo);
  });

  sk_nuevoCliente.on('generacion_modelo', async (pmodelo) => {
    const spModeloDeMarca = await coneccion.query(`call SP_get_generacion_modelo("${pmodelo}")`);
    // Variables para extraer modelo de la marca
    const id = []; const generacion = []; const generacionDeModelo = spModeloDeMarca[0];
    // Extraer valores atravez de un forEach
    let i = 0;
    generacionDeModelo.forEach((element) => {
      id[i] = element.id_generacion;
      generacion[i] = element.generacion;
      i++;
    });
    const idGeneracion = { id, generacion };
    // enviar esos modelos por un socket :D
    sk_nuevoCliente.emit('generacion_auto', idGeneracion);
  });

  sk_nuevoCliente.on('data_cliente', async (pidCliente) => {
    const queryInfoCliente = await coneccion.query(`SELECT nombre_cliente,telefono,email,dni,ruc,razon_social,direccion FROM tcliente WHERE id_cliente = "${pidCliente}"`);
    // Variables para extraer modelo de la marca
    const data = {
      tipo_cliente,
      nombre_cliente,
      telefono,
      email,
      dni,
      ruc,
      razon_social,
      direccion
    } = queryInfoCliente[0];

    console.log('data', data);
    sk_nuevoCliente.emit('data_info_cliente', data);
  });

  // SOCKES PARA CONSULTAS DE APIS
  sk_nuevoCliente.on('solicitar_info_dni', async (pDni) => {
    const queryConsultaDni = `SELECT id_cliente FROM tcliente where dni="${pDni}";`;
    if (pDni !== 0) {
      if (pDni.toString().length < 8) {
        pDni = pDni.toString().padStart(8, '0'); // LLENAR CON CEROS
        console.log("BUSCAR DNI EN LA BD");
        const consultaDni = await Consulta(queryConsultaDni);
        console.log("BUSCANDO DNI/", pDni, "RESPUESTA/", consultaDni);
        if (consultaDni.length !== 0) { // SI ENCONTRAMOS EL CLIENTE EN LA BD
          const idClienteBuscado = consultaDni[0];
          sk_nuevoCliente.emit('recuperar_info_dni_db', idClienteBuscado);
        } else { // NO ENCONTRAMOS EL CLIENTE EN LA BD
          const data = await helpers.Consulta_Dni(pDni);
          sk_nuevoCliente.emit('recuperar_info_dni_online', data);
        }
      } else {
        console.log("BUSCAR DNI EN LA BD");
        const consultaDni = await Consulta(queryConsultaDni);
        console.log("BUSCANDO DNI/", pDni, "RESPUESTA/", consultaDni);
        if (consultaDni.length !== 0) { // SI ENCONTRAMOS EL CLIENTE EN LA BD
          const idClienteBuscado = consultaDni[0];
          console.log('ENCONTRADO EN LA BD NUEVO', );
          sk_nuevoCliente.emit('recuperar_info_dni_db', idClienteBuscado);
        } else { // NO ENCONTRAMOS EL CLIENTE EN LA BD
          const data = await helpers.Consulta_Dni(pDni);
          sk_nuevoCliente.emit('recuperar_info_dni_online', data);
        }
      }
      // return helpers.Consulta_Dni_Aux(pDni)
    } else {
      console.log("ERROR EL DNI ES 0");
      let data = await helpers.Consulta_Dni(pDni);
      sk_nuevoCliente.emit('recuperar_info_dni_online', data);
    }
    // CONSULTA EN LINEA CUANDO NO ENCONTREMOS EN LA BASE DE DATOS
    /*     let data = await helpers.Consulta_Dni(pDni);
      sk_nuevoCliente.emit('recuperar_info_dni_online', data) */
  });

  sk_nuevoCliente.on('solicitar_info_ruc', async (pRuc) => {
    let data = await helpers.Consulta_Ruc(pRuc);
    if (data == 'DESCONECCION RUC') {
      sk_nuevoCliente.emit('recuperar_info_ruc', data);
    } else {
      console.log('test data 2', data);

      String.prototype.capitalize = function () {
        return this.replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase(); });
      };

      const razon_social = (data.razon_social.toLowerCase()).capitalize();
      const domicilio_fiscal = (data.domicilio_fiscal.toLowerCase()).capitalize();

      const info_ruc = { razon_social, domicilio_fiscal };

      console.log('Salida Ruc', info_ruc);

      sk_nuevoCliente.emit('recuperar_info_ruc', info_ruc);
    }
  });
});

// INCERTAR UN NUEVO NOMBRE DE  SERVICIO
io.on('connection', (sk_CrearOrden) => {
  sk_CrearOrden.on('Crear_Servicio', async (Data) => {
    const dHoy = {
      d_date:helpers.new_Date(new Date()),
      d_str:helpers.formatDateTime(helpers.new_Date(new Date()))
    };
    console.log(Data);
    await coneccion.query(`CALL SP_Crear_Servicio("${Data.Nombre}","${Data.id}","${dHoy.d_str}");`);
    const servicioAgregado = await coneccion.query(`CALL SP_Recuperar_Servicio_Agregado("${Data.id}")`);
    const NewService = servicioAgregado[0][0];
    sk_CrearOrden.emit('Servicio_agregado', NewService);
  });

  // SOCKET UTILIZADO ACUALIAR ACCION DE MECANICO A 3
  // CON UN SOCKET LISTANDO LOS NUEVOS MECANICOS DESOCUPADOS
  sk_CrearOrden.on('Asignar_Mecanico', async (data) => {
    const queryAsignarMecanico = `UPDATE tusuario SET nro_ordenes = nro_ordenes + 1 WHERE (id_usuario = ${data});`;

    const queryMecanicosHabilitados = 'SELECT id_usuario,nombre,apellido_paterno,nro_ordenes FROM v_mecanicos_hablilitados;';

    await coneccion.query(queryAsignarMecanico);

    const mecanicosHabilitados = await coneccion.query(queryMecanicosHabilitados);
    // LISTAR LOS MEANICOS DESOCUPADOS
    io.emit('Mecanico_Asignado', mecanicosHabilitados); // => crearOrden
  });
});

io.on('connection', (sk_Navigation) => {
  console.log('=> k_Navigation');

  // Este es un pinche tubo que registra la asignacion y envia esa notificacion
  sk_Navigation.on('Enviar_Notificacion', async (data_idUsuario_receptor, data_idUsuario_emisor, pNoroOrden) => {
    let dHoy = {
      d_date:helpers.new_Date(new Date()),
      d_str:helpers.formatDateTime(helpers.new_Date(new Date()))
    };
    // === === === === ASIGNACION DE PEDIDO === === === ===

    // SABER CON QUE TIPO USUARIO ESTOY 
    let query_id_tipo_usuario = 'SELECT id_tipo_usuario FROM tusuario_ttipousuario WHERE id_usuario = ' + data_idUsuario_receptor + ';';
    let consulta_idTipo_usuario = await Consulta(query_id_tipo_usuario);
    let { id_tipo_usuario } = consulta_idTipo_usuario[0];
    // salida de esta consulta 
    console.log('Mi id: ', data_idUsuario_receptor, ' es de tipo: ', id_tipo_usuario);

    // RECUPERAR EL (id_detallePedido) AL QUE ESTA SIENDO ASIGNADO
    let query_idDetallePedido = 'SELECT id_detallePedido,id_vehiculo FROM tdetallepedido WHERE id_usuario_asignador = ' + data_idUsuario_emisor + ' && nro_orden = ' + pNoroOrden + ';';
    const consulta_idDetallePedido = await Consulta(query_idDetallePedido);
    const { id_detallePedido, id_vehiculo } = await consulta_idDetallePedido[0];
    console.log('AL QUE ESTA SIENDO ASIGNADO', consulta_idDetallePedido);

    // RECUPERAR EL ID DE NOTIFICACION VINCULADA A ESTE EMISOR Y RECEPTOR

    // (Fn_Enviar_Notificacion) esta funcion inserta en tnotificaciones un user_emisor y user_receptor

    // despues recupera el id de la notificacion agregada.
    let query_id_notificacion = 'CALL SP_FN_Enviar_Notificacion(' + data_idUsuario_emisor + ',' + data_idUsuario_receptor + ',"'+dHoy.d_str+'")';
    const consulta_id_Notificacion = await Consulta(query_id_notificacion);
    const { id_Notificacion } = consulta_id_Notificacion[0][0];

    // CAPTURAR LOS DETALLES DEL USUARIO QUE ME ESTA ENVIANDO ESTA NOTIFICACION
    // (SP_Detalles_Notificacion) muestra toda la informacion del "idUsuario_emisor"
    let query_Detalle_Notificacion = 'CALL SP_Detalles_Notificacion(' + data_idUsuario_receptor + ',' + id_Notificacion + ')';
    const consulta_Detalles_Notificacion = await Consulta(query_Detalle_Notificacion);
    const User_Emisor = { nombre, apellido_paterno, fecha_creacion } = consulta_Detalles_Notificacion[0][0];
    const tiempo_Notificacion = helpers.timeago_int(fecha_creacion); // ==> convertir el tiempo

    // OBTENER EL NRO DE NOTIFICACIONES DE ESTE USUARIO
    let query_Notificaciones = 'SELECT count(id_notificaciones) as nro_Notificaciones FROM tnotificaciones WHERE id_user_receptor = ' + data_idUsuario_receptor + ' && id_estado_notificacion = 1;';
    const consulta_Notificacion = await coneccion.query(query_Notificaciones);
    const { nro_Notificaciones } = consulta_Notificacion[0];

    // RECUPERAR LA INFO DEL VEHICULO PARA MOSTRAR EN LA NOTIFICACION
    console.log('IDE', id_detallePedido);
    let query_info_vehiculo = 'SELECT placa,vehiculo_marca,modelo FROM v_tvehiculo WHERE id_vehiculo = ' + id_vehiculo + ';';
    let consulta_info_vehiculo = await Consulta(query_info_vehiculo);
    console.log('detale Vehiculo Consulta', consulta_info_vehiculo);
    let vehiculo = {
      placa: consulta_info_vehiculo[0].placa,
      vehiculo_marca: consulta_info_vehiculo[0].vehiculo_marca,
      modelo: consulta_info_vehiculo[0].modelo
    };

    console.log('detale Vehiculo', vehiculo);

    // UNIMOS TODO PARA ENVIAR A - navigation -
    const info_Notif = { User_Emisor, pNoroOrden, nro_Notificaciones, tiempo_Notificacion };
    console.log('Info noti =>', info_Notif, 'id_Receptor => ', data_idUsuario_receptor);
    io.emit('Notificacion_Recibida', info_Notif, data_idUsuario_receptor, id_detallePedido, id_tipo_usuario, id_Notificacion, vehiculo);
  });

  // Solo Se usa este socket cuano el mecanico emite a facturar la orden
  sk_Navigation.on('Enviar_Notificacion_detallePedido_terminada', async (data_idUsuario_receptor,
    data_idUsuario_emisor,
    pNoroOrden,
    pId_Detalle_Pedido,
    pIdNotificacion) => {
    const dHoy = {
      d_date:helpers.new_Date(new Date()),
      d_str:helpers.formatDateTime(helpers.new_Date(new Date()))
    };

    let query_info_vehiculo = `SELECT distinct placa,vehiculo_marca,modelo  
      FROM v_detales_de_enviopedido
      WHERE id_detallePedido = ${pId_Detalle_Pedido};`;
    let consulta_info_vehiculo = await Consulta(query_info_vehiculo);

    const vehiculo = {
      placa: consulta_info_vehiculo[0].placa,
      vehiculo_marca: consulta_info_vehiculo[0].vehiculo_marca,
      modelo: consulta_info_vehiculo[0].modelo
    };

    console.log('data VEHICULO', vehiculo);

    const consulta_id_caja = await Consulta('SELECT id_usuario FROM v_cajeros_habilitados limit 1;');
    data_idUsuario_receptor = consulta_id_caja[0].id_usuario;
    // sacamos el usuaro de caja solo el primer resultado

    // SABER CON QUE TIPO USUARIO ESTOY 
    let query_id_tipo_usuario = 'SELECT id_tipo_usuario FROM tusuario_ttipousuario WHERE id_usuario = ' + data_idUsuario_receptor + ';';
    let consulta_idTipo_usuario = await Consulta(query_id_tipo_usuario);

    console.log('consulta_idTipo_usuario', consulta_idTipo_usuario[0]);

    let { id_tipo_usuario } = consulta_idTipo_usuario[0];

    console.log('data_idUsuario_receptor', data_idUsuario_receptor);
    console.log('data_idUsuario_emisor', data_idUsuario_emisor);

    // RECUPERAR EL ID DE NOTIFICACION VINCULADA A ESTE EMISOR(MECANICO) Y RECEPTOR(CAJA)
    let query_id_notificacion = 'CALL SP_FN_Enviar_Notificacion(' + data_idUsuario_emisor + ',' + data_idUsuario_receptor + ',"'+dHoy.d_str+'")';
    const consulta_id_Notificacion = await coneccion.query(query_id_notificacion);
    const { id_Notificacion } = consulta_id_Notificacion[0][0];

    // CAPTURAR LOS DETALLES DEL USUARIO QUE ME ESTA ENVIANDO ESTA NOTIFICACION
    let query_Detalle_Notificacion = 'CALL SP_Detalles_Notificacion(' + data_idUsuario_receptor + ',' + id_Notificacion + ')';
    const consulta_Detalles_Notificacion = await coneccion.query(query_Detalle_Notificacion);
    const User_Emisor = { nombre, apellido_paterno, fecha_creacion } = consulta_Detalles_Notificacion[0][0];
    const tiempo_Notificacion = helpers.timeago_int(fecha_creacion); // ==> convertir el tiempo

    // LIBERAR AL MECANICO ASIGNADO PARA LUEGO SER ASIGNADO
    const consulta_Liberar_Mecanico = `UPDATE tusuario SET nro_ordenes = nro_ordenes-1 WHERE (id_usuario = ${data_idUsuario_emisor});`;
    await coneccion.query(consulta_Liberar_Mecanico);

    // ELIMINAR LA NOTIFICACION QUE HABIA RECIBIDO CUANDO LO ASIGNARON A UN ORDEN

    await coneccion.query(`UPDATE tnotificaciones SET id_estado_notificacion = 2 WHERE id_notificaciones = ${pIdNotificacion};`);

    // OBTENER EL NRO DE NOTIFICACIONES DE ESTE USUARIO
    let query_Notificaciones = 'SELECT count(id_notificaciones) as nro_Notificaciones FROM tnotificaciones WHERE id_user_receptor = ' + data_idUsuario_receptor + ' && id_estado_notificacion = 1;';

    // ACTUALIZAMOS EL DETALLEPedido a Facturando
    await Consulta('UPDATE tdetallepedido SET id_estadoOrden = 6 WHERE id_detallePedido = ' + pId_Detalle_Pedido + ';');

    // ACTUALIZAMOS EL TORDENES ACTUALES a Facturando
    await Consulta('UPDATE tordenes_actuales SET id_estadoOrden = 6 WHERE nro_orden = ' + pNoroOrden + ';');

    const consulta_Notificacion = await coneccion.query(query_Notificaciones);
    const { nro_Notificaciones } = consulta_Notificacion[0];

    const info_Notif = { User_Emisor, pNoroOrden, nro_Notificaciones, tiempo_Notificacion };
    console.log('INFORMACION DE NOTIFICACION--------------------------');
    console.log(info_Notif);
    console.log('INFORMACION DE NOTIFICACION--------------------------FIN');
    io.emit('Notificacion_Recibida', info_Notif, data_idUsuario_receptor, pId_Detalle_Pedido, id_tipo_usuario, id_Notificacion, vehiculo);
  });

  // ESTA FUNCION ES LA QUE SE CONSULTA POR RECARGA DE PAGINA
  // CNSULTANDO A LA TABLA SI TENGO NOTIFICACIONES
  sk_Navigation.on('Requiero_Notificaciones', async (data_idUsuario_receptor) => {
    // Variables de Entorno
    let Emisor_nombre = [], Emisor_apellido_paterno = [], Emisor_fecha_creacion = [], ids_Notificaciones = [], nro_orden = [], id_Detalle_Pedidos = [], vehiculo = [];

    // SABER CUANTAS NOTIFICACIONES HAY EN LA TABLA TNOTIFICACIONES DE MI USUARIO
    let query_nro_Notificaciones = `SELECT count(id_notificaciones) as nro_Notificaciones FROM tnotificaciones WHERE id_user_receptor = ${data_idUsuario_receptor} && id_estado_notificacion = 1;`;
    let consulta_Notificacion = await Consulta(query_nro_Notificaciones);
    let { nro_Notificaciones } = consulta_Notificacion[0];
    // salida de esta consulta 
    console.log('Mi id: ', data_idUsuario_receptor, ' tiene: ', nro_Notificaciones, 'Notificaciones');

    // SABER CON QUE TIPO USUARIO ESTOY HACIENDO LA RECARGA DE PAGINA
    let query_id_tipo_usuario = 'SELECT id_tipo_usuario FROM tusuario_ttipousuario WHERE id_usuario = ' + data_idUsuario_receptor + ';';
    let consulta_idTipo_usuario = await coneccion.query(query_id_tipo_usuario);
    let { id_tipo_usuario } = consulta_idTipo_usuario[0];
    // salida de esta consulta 
    console.log('Mi id: ', data_idUsuario_receptor, ' es de tipo: ', id_tipo_usuario);

    // SABER CUALES SON LOS IDS DE NOTIFICACION DE MI ID
    let consulta_id_notificacion = await coneccion.query('SELECT id_notificaciones FROM tnotificaciones WHERE id_user_receptor = ' + data_idUsuario_receptor + ' && id_estado_notificacion = 1');
    // salida de esta consulta 
    console.log('Mi id: ', data_idUsuario_receptor, ' tiene estos id de notificacion: ', consulta_id_notificacion);

    // VERIFICAR EL TIPO DE USUARIO QUE ESTA RECARGANDO LA PAGINA
    if (id_tipo_usuario != 2 && id_tipo_usuario != 1) {
      if (nro_Notificaciones != 0) {
        // let id_Detalle_Pedidos = [];
        // si es cajero(a) y tiene mas de 0 notificaciones

        // SABER CUANTOS ID_DETALLEPEDIDO_TENGO ASIGNADO COMO CAJA
        const query_id_detalle_pedido_caja = `CALL SP_GET_idDetalle_Pedido_caja(${data_idUsuario_receptor});`;
        const consulta_id_detalle_pedido_caja = await coneccion.query(query_id_detalle_pedido_caja);

        console.log('Mi id:', data_idUsuario_receptor, ' tiene ', consulta_id_detalle_pedido_caja[0]);

        const ids_detalle_pedido_caja = consulta_id_detalle_pedido_caja[0];
        const ids_detalle_pedido = [];
        let cont = 0;
        ids_detalle_pedido_caja.forEach(element => {
          ids_detalle_pedido[cont] = element.idDetallePedido;
          cont++;
        });

        console.log('ids_detalle_pedido_caja____________________________-', ids_detalle_pedido);

        // EXTRAER EL NUMERO DE ORDEN DE LA CONSULTA

        for (let i = 0; i <= ids_detalle_pedido_caja.length - 1; i++) {
          id_Detalle_Pedidos[i] = ids_detalle_pedido_caja[i].idDetallePedido;
          let query_info_Emisor = `CALL SP_Mis_facturaciones_asignadas (${id_Detalle_Pedidos[i]});`;
          let consulta_info_Emisor = await coneccion.query(query_info_Emisor);
          // console.log('Salida del boocle es ', consulta_info_Emisor[0][0].nro_orden);
          nro_orden[i] = consulta_info_Emisor[0][0].nro_orden;
          vehiculo[i] = {
            placa: consulta_info_Emisor[0][0].placa,
            vehiculo_marca: consulta_info_Emisor[0][0].vehiculo_marca,
            modelo: consulta_info_Emisor[0][0].modelo
          };
        }

        console.log('Los numeros de orden para la noti es ', nro_orden);

        // RECORRER EL ARRAY "consulta_id_notificacion" para sacar

        for (let index = 0; index <= consulta_id_notificacion.length - 1; index++) {
          // Saber los datos del que me esat enviado esta notificacion con SP_Detalles_Notificacion("mi id","id_notificacion")
          let query_Detalle_Notificacion = 'CALL SP_Detalles_Notificacion(' + data_idUsuario_receptor + ',' + consulta_id_notificacion[index].id_notificaciones + ')';
          let consulta_Detalles_Notificacion = await coneccion.query(query_Detalle_Notificacion);
          console.log('Mi id: ', data_idUsuario_receptor, ' le esta enviando esta orden: ', consulta_id_notificacion[index].id_notificaciones);
          console.log('consulta_Detalles_Notificacion____________', consulta_Detalles_Notificacion[0][0].nombre);
          // Despues procedemos a almacenar los datos del emisor en estos arrays
          Emisor_nombre[index] = consulta_Detalles_Notificacion[0][0].nombre;
          Emisor_apellido_paterno[index] = consulta_Detalles_Notificacion[0][0].apellido_paterno;
          Emisor_fecha_creacion[index] = helpers.timeago_int(consulta_Detalles_Notificacion[0][0].fecha_creacion);
          ids_Notificaciones[index] = consulta_id_notificacion[index].id_notificaciones;
        }

        // salida de la iteracion
        console.log('Salida de Emisor Nombre', Emisor_nombre, 'Apellido_p: ', Emisor_apellido_paterno, ' Fecha de Creacion_noti: ', Emisor_fecha_creacion);
        // aca almacenamos en una variable
        const Lista_De_Notificaciones = [Emisor_nombre, Emisor_apellido_paterno, Emisor_fecha_creacion, ids_Notificaciones];
        console.log('Lista_De_Notificaciones', Lista_De_Notificaciones);
        sk_Navigation.emit('Envio_Notificacion', Lista_De_Notificaciones, nro_Notificaciones, nro_orden, id_tipo_usuario, ids_detalle_pedido, vehiculo);
      }
    } else {
      if (nro_Notificaciones != 0) {
        console.log('consulta_id_notificacion', consulta_id_notificacion[0].id_notificaciones);
        console.log('TAMAÑO', consulta_id_notificacion.length);

        // let Emisor_nombre=[],Emisor_apellido_paterno=[],Emisor_fecha_creacion=[];

        // Saber que nro de orden te ASIGNARON 

        // const query_nro_orden = `SELECT id_detallePedido,nro_orden FROM tdetallepedido where id_estadoOrden = 4 && id_usuario_asignado = '+data_idUsuario_receptor+';`;
        let id_etapa_pedido = 4;
        const query_nro_orden = `CALL SP_GET_Info_Notificacion(` + data_idUsuario_receptor + `,` + id_etapa_pedido + `);`;

        const consulta_nro_orden = await coneccion.query(query_nro_orden);
        // const {nro_orden,id_detallePedido} = consulta_nro_orden[0];
        const Nro_orden = consulta_nro_orden[0];

        console.log('Salida ==> ', consulta_nro_orden[0]);

        let n = 0;
        Nro_orden.forEach(element => {
          nro_orden[n] = element.nro_orden;
          id_Detalle_Pedidos[n] = element.id_detallePedido;
          vehiculo[n] = {
            placa: Nro_orden[n].placa,
            vehiculo_marca: Nro_orden[n].vehiculo_marca,
            modelo: Nro_orden[n].modelo
          };
          n++;
        });

        console.log('vehiculo', vehiculo);

        for (let index = 0; index <= consulta_id_notificacion.length - 1; index++) {
          let query_Detalle_Notificacion = 'CALL SP_Detalles_Notificacion(' + data_idUsuario_receptor + ',' + consulta_id_notificacion[index].id_notificaciones + ')';
          let consulta_Detalles_Notificacion = await coneccion.query(query_Detalle_Notificacion);
          console.log(consulta_Detalles_Notificacion[0][0]);
          Emisor_nombre[index]            = consulta_Detalles_Notificacion[0][0].nombre;
          Emisor_apellido_paterno[index]  = consulta_Detalles_Notificacion[0][0].apellido_paterno;
          Emisor_fecha_creacion[index]    = helpers.timeago_int(consulta_Detalles_Notificacion[0][0].fecha_creacion);
          ids_Notificaciones[index]       = consulta_id_notificacion[index].id_notificaciones;
          // nro_orden[i] = consulta_Detalles_Notificacion[0][0].nro_orden;
        }
        console.log('Salida de Emisor Nombre', Emisor_nombre, Emisor_apellido_paterno, Emisor_fecha_creacion);
        const Lista_De_Notificaciones = [Emisor_nombre, Emisor_apellido_paterno, Emisor_fecha_creacion, ids_Notificaciones];
        sk_Navigation.emit('Envio_Notificacion', Lista_De_Notificaciones, nro_Notificaciones, nro_orden, id_tipo_usuario, id_Detalle_Pedidos, vehiculo);
      }
    }
  });

  sk_Navigation.on('Registrar_Seguimiento', async (data) => {
    try {
      // helpers.Notificacion_dia_1();
      const queryNotificacionesFuturas = `SELECT * FROM v_ids_detalle_seguimiento 
      WHERE fecha_notificacion is not null && id_estado_seguimiento <> 2 
      && id_etapa_seguimiento <> 4
      && id_etapa_seguimiento <> 5
      && id_etapa_seguimiento <> 6
      ORDER BY fecha_notificacion`;
      const notificacionesFuturas = await Consulta(queryNotificacionesFuturas);
      let nroSeguimientos = notificacionesFuturas.length+1;
       // SUMO +1 POR QUE CUANDO EL CRON SE EJECUTE LOS SEGUIMIENTOS DEVE SUMAR +1
      console.log('informacion entrante', data);
      let { id_detalle_pedido, id_cliente, id_vehiculo } = data;

      let fecha_salida = helpers.new_Date(new Date()),
        fecha_salida_str = helpers.formatDateTime(fecha_salida);

      // fecha_salida_str    = fecha_salida.toISOString().slice(0, 19).replace('T', ' ');

      let query_info_este_seguimiento = `CALL SP_Add_Seguimiento(
          `+ id_detalle_pedido + `,
          `+ id_cliente + `,
          `+ id_vehiculo + `,
          "`+ fecha_salida_str + `");`;

      const consulta_info_este_seguimiento = await Consulta(query_info_este_seguimiento);
      const info_este_seguimiento = consulta_info_este_seguimiento[0][0];
      console.log('Info de este_seguimiento_', consulta_info_este_seguimiento[0][0]);

      // ARMANDO MI FECHA (Para compararla)
      let miFechaActual = helpers.new_Date(new Date()),
        miAnio = miFechaActual.getFullYear(),
        miFecha = miFechaActual.getDate(),  // 1 - 31
        miMes = miFechaActual.getMonth() + 1, // 0 - 11
        miFechaString = '' + miFecha + '/' + miMes + '/' + miAnio + '';

      // ARMAR EL OBJETO (Para crear la notificacion)
      let dataSeguimiento = {
        id_etapa_seguimiento,
        nombre_cliente,
        fecha_salida,
        fecha_notificacion,
        fecha_seguimiento,
        id_detallePedido,
        nombre_etapa_seguimineto,
        id_seguimiento,
        id_cliente,
        id_vehiculo
      } = info_este_seguimiento;

      switch (dataSeguimiento.id_etapa_seguimiento) {
        case 1:

          let fechaCron1 = dataSeguimiento.fecha_salida;
          fechaCron1.setDate(fechaCron1.getDate()+1);
          fechaCron1.setHours(14); // por que 14 horas? (es por que a esa hora en america latima es 9 am)
          fechaCron1.setMinutes(0);
          fechaCron1.setSeconds(0);

          let miAnioCron1 = fechaCron1.getFullYear();
          let miFechaCron1 = fechaCron1.getDate();  // 1 - 31
          let miMesCron1 = fechaCron1.getMonth() + 1; // 0 - 11

          let miFechaCron1String = '' + miFechaCron1 + '/' + miMesCron1 + '/' + miAnioCron1 + '';

          console.log('Nueva fecha Cron_1 es ==', helpers.formatDateTime(fechaCron1));

          // if (miFechaString == miFechaCron1String) {

            new CronJob({
              cronTime: fechaCron1,
              onTick: CronFunction = () => {
                console.log('EJECUCION____Cron ID_', dataSeguimiento.id_seguimiento);
                EjecucionCron(dataSeguimiento, nroSeguimientos);
              },
              start: true,
              timeZone: 'America/Lima'
            });
          // } else {
            const mensage_salida = `* * * * * * * * * * * * * * * *\nNuevo Cron con id: ` + dataSeguimiento.id_seguimiento + `\nDe estado: ` + dataSeguimiento.nombre_etapa_seguimineto + `\nFue programado para esta fecha: ` + helpers.formatDate(fechaCron1) + `\n* * * * * * * * * * * * * * * *`;
            console.log(mensage_salida);

          // }
          break;
      }
      async function Ejecucion() {
        let fecha_salida_timeago = helpers.timeago_int(fecha_salida);
        let consulta_cliente_pedido = await Consulta('CALL SP_cliente_de_Pedido_actual(' + id_detalle_pedido + ');');
        let fecha_Notificacion = helpers.new_Date(new Date()),
          // fecha_Notificacion_str  = fecha_Notificacion.toISOString().slice(0, 19).replace('T', ' ');
          fecha_Notificacion_str = helpers.formatDateTime(fecha_Notificacion);
        await Consulta('UPDATE tseguimiento SET fecha_notificacion = "' + fecha_Notificacion_str + '" where id_seguimiento = ' + id_seguimiento + ';');
        let { nombre_cliente } = consulta_cliente_pedido[0][0];

        const informacion_Seguimiento =
        {
          nombre_cliente,
          dia: 'dia 1',
          fecha_salida_timeago,
          id_detalle_pedido,
          id_seguimiento,
          id_cliente,
          id_vehiculo
        };
        console.log('enviar esta información', informacion_Seguimiento);
        io.emit('Enviar_Notificaciones_Seguimiento', informacion_Seguimiento);
      }

      /*           new CronJob({
                  cronTime  : fecha_salida,   // The time pattern when you want the job to start
                  onTick    : function Trabajo_1(){
                    console.log('_____________________________________________Hola humano',id_seguimiento);
                  },   // Task to run
                  start     : true,          // immediately starts the job.
                  timeZone  : 'America/Lima'   // The timezone
                }); */

      /*           const trabajo = new CronJob(fecha_salida,await function ejecutable(pfecha_programada) {
                  console.log('Esta fue la fecha programada',pfecha_programada);
                }, null, false, 'America/Lima');
    
                trabajo.ejecutable(fecha_programada);
                trabajo.start(); */
    } catch (err) {
      console.log('OCURRIÓ UN ERROR =>', err);
    }
  });

  sk_Navigation.on('Requiero_Notificaciones_Seguimiento', async () => {
    const query_notificaciones_seguimiento = `SELECT * FROM v_ids_detalle_seguimiento 
    WHERE fecha_notificacion is not null && id_estado_seguimiento <> 2 
    && id_etapa_seguimiento <> 4
    && id_etapa_seguimiento <> 5
    && id_etapa_seguimiento <> 6
    ORDER BY fecha_notificacion`;
    const consulta_notificaciones_seguimiento = await Consulta(query_notificaciones_seguimiento);
    console.log('por recarga numero de seguimientos = ', consulta_notificaciones_seguimiento.length);

    let dataSeguimiento = [], i = 0, nroSeguimientos = consulta_notificaciones_seguimiento.length;

    consulta_notificaciones_seguimiento.forEach(element => {
      dataSeguimiento[i] = {
        id_seguimiento: element.id_seguimiento,
        id_detalle_pedido: element.id_detallePedido,
        nombre_cliente: element.nombre_cliente,
        fecha_notificacion: helpers.timeago_int(element.fecha_notificacion),
        dia: element.nombre_etapa_seguimineto,
        id_cliente: element.id_cliente,
        id_vehiculo: element.id_vehiculo,
      };
      i++;
    });
    console.log('Salida del array dataSeguimiento (Tamaño)', dataSeguimiento.length);
    sk_Navigation.emit('Emitir_Notificaciones_Seguimineto', dataSeguimiento, nroSeguimientos);
  });
});

// INCERTAR UN NUEVO NOMBRE DE  CHECKLIST IMPORTANTE
/* io.on('connection',(sk_CrearChecklist)=>{
    sk_CrearChecklist.on('Crear_CheckList', async (Data) => {
      console.log(Data)
      await coneccion.query('CALL SP_Crear_Item_Checklist("'+Data.Nombre+'","'+Data.id+'");');
      let checklist_Agregado = await coneccion.query('CALL SP_Recuperar_CheckList_Agregado("'+Data.id+'")');
      const NewCheckList = checklist_Agregado[0][0]
      sk_CrearChecklist.emit('Checklist_agregado',NewCheckList);
    });
 }); */

io.on('connection', (sk_InfoCliente) => {
  sk_InfoCliente.on('Registrar_Ususario', async (Data) => {
    try {
      const dHoy = {
        d_date: helpers.new_Date(new Date()),
        d_str: helpers.formatDateTime(helpers.new_Date(new Date()))
      };
      // const id_person = req.user;
      if (Data.val_arr[1] !== 0) {
        const {
        val_id_Vehiculo,
        idCliente,
        nombre_cliente,
        telefono,
        email,
        dni,
        ruc,
        razonSocial,
        direccion,
        val_arr,
        id_persona,
        saveOrEdit
        } = Data;
        const tipo_cliente = val_arr[0];
        // incertar nuevo tipo cliente
        const query_1 = `CALL SP_ADD_New_Clientx3(
          ${val_id_Vehiculo},
          ${idCliente},
          ${null},
          "${tipo_cliente}",
          "${nombre_cliente}",
          "${telefono}",
          "${email}",
          ${dni},
          ${ruc},
          "${razonSocial}",
          "${direccion}",
          ${id_persona},
          ${1},
          "${dHoy.d_str}",
          ${saveOrEdit})`;
        console.log(query_1);
        await coneccion.query(query_1, (err, rows) => {
          if (!err && rows[0].length > 0) {
            console.log('rows', rows);
            sk_InfoCliente.emit('Nuevo_Cliente', rows[0]);
          } else {
            console.error(err.message);
          }
        });
        console.log('query_1', query_1);
      } else {
        const {
          val_id_Vehiculo,
          idCliente,
          nombre_cliente,
          telefono,
          email,
          dni,
          ruc,
          razonSocial,
          direccion,
          val_arr,
          saveOrEdit
          } = Data;
        const id_tipo_cliente = val_arr[0];
        // USAR TIPO CLIENTE
        const query_2 = `CALL SP_ADD_New_Clientx3(
          ${val_id_Vehiculo},
          ${idCliente},
          ${id_tipo_cliente},
          "${null}",
          "${nombre_cliente}",
          "${telefono}",
          "${email}",
          ${dni},
          ${ruc},
          "${razonSocial}",
          "${direccion}",
          ${null},
          ${0},
          "${dHoy.d_str}",
          ${saveOrEdit})`;
        console.log(query_2);
        await coneccion.query(query_2, (err, rows) => {
          if (!err && rows[0].length > 0) {
            console.log('rows', rows);
            sk_InfoCliente.emit('Nuevo_Cliente', rows[0]);
          } else {
            console.error(err.message);
          }
        });
        console.log('query_2', query_2);
      }
    } catch (error) {
      console.log(error);
    }
  });
});

/* io.on('connection', (sk_usuario) => {
  console.log("socket en usuario");
  sk_usuario.on('datos_a_enviar', () => {
    sk_usuario.emit('datos_a_enviar2', (datos));
    console.log("enviando sk_usuario", datos);
    datos = [];
  })
}); */

// ACTUALIZAR EL REQUERIMIENTO EN DETALLE PEDIDO  - DEMO -
io.on('connection', (sk_detallePedido) => {
  sk_detallePedido.on('Guardar_detalle_pedido', async (data) => {
    const id_detallepedido = data.id_Detalle_Pedido;
    const {mis_requerimientos} = data;
    await coneccion.query('UPDATE tdetallepedido SET Detalle_requerimiento = "' + mis_requerimientos + '" WHERE (id_detallePedido = ' + id_detallepedido + ');');
    sk_detallePedido.emit('Actualizo_detalle_pedido');
  });
});

// 986