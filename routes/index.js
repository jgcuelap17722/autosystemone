const express = require('express');
const pdf = require('html-pdf');
const path = require('path');
const { isNotLoggedIn } = require('../lib/auth');
const helpers = require('../lib/helpers');

const router = express.Router();

const pool = require('../database'); // referencia a ala base de datos
const { isLoggedIn } = require('../lib/auth'); // SIRBE PARA PROTEGER rutas

// const {crearCheckList} = require('../controllers/controlador.checklist');
const { asinarOrden } = require('../controllers/controlador.ordenes');
const { HacerConsulta } = require('../controllers/controlador.consultas');
const { Recuperar_info_Cliente } = require('../controllers/controlador.info-cliente');
const { recuperarReporte_get } = require('../controllers/controlador.reportes');
const { recuperarOrdenes_hoy_get } = require('../controllers/controlador.ordenes-hoy');
const { getDatosOrdenesApi } = require('../controllers/controlador.api');

// Funcion parahacer consultass
const Consulta = (pQuery) => pool.query(pQuery);

router.post('/info-cliente', async(req, res) => {
    const InfoUser = await helpers.InfoUser(req.user.id_usuario); // Info Usuario Logueado
    const data = req.body;
    const { placa, id_cliente } = data;
    console.log('la data', data);
    const id_person = InfoUser.id_usuario;
    // let {id_cliente} = data // aca recibe un id_cliente o vacio si no hace una busqueda
    console.log('busqueda id es = ', id_cliente);
    let id_vehiculo;
    // VARIABLE QUE ALMACENA EL CASO QUE ESTA ENVIANDO LA VISTA ADD_CLIETE
    const estado_Caso = data.case;
    const estado_tipo_cliente = data.tipo_cliente.split(',');

    let pFechaHoy = helpers.new_Date(new Date());
    pFechaHoy = helpers.formatDateTime(pFechaHoy);

    // CONVERTIMOS EL TIPO DE CASO A NUMERO
    const tipoCaso = parseInt(estado_Caso, 10); // vehiculo
    // tipo entrada puede ser NaN/1/2/3
    // 0 = si marca si modelo si generacion
    // 1 = no marca no modelo no generacion
    // 2 = si marca no modelo no generacion
    // 3 = si marca si modelo no generacion
    console.log('Salida Tipo Caso es =>', tipoCaso);
    console.log('Salida estado_tipo_cliente es =>', estado_tipo_cliente);

    // SABER SI YA EXISTE EL REGISTRO DE ESTE VEHICULO ( "prevenimos qeu actualizela pagina e incerte duplicado" )
    // 0 ==> no existe 1 ==> si existe
    const Consulta_Existencia = await Consulta(`CALL SP_FN_Existe_Registro_Vehiculo("${placa}");`);
    const Existe = parseInt(Consulta_Existencia[0][0].Existencia, 10);
    console.log('Salida de Consulta_Existencia es =>', Consulta_Existencia);

    if (Existe != 1) {
        switch (tipoCaso) {
            case 0: // A entra NaN osea no activo el Switch / 0
                console.log('si marca si modelo si generacion', tipoCaso);
                if (id_cliente != '') { // recibimos ID_CLIENTE BUSQUEDA
                    console.log('Usando id_tipo_cliente:', estado_tipo_cliente[0]);
                    const {
                        placa,
                        idMarca,
                        idModelo,
                        idGeneracion,
                        color,
                        id_cliente
                    } = data;

                    if (estado_tipo_cliente[1] != 0) {
                        const tipo_cliente = estado_tipo_cliente[0];
                        const query0_0 = `CALL SP_ADD_Caso_0("${placa}",${idMarca},${idModelo},${idGeneracion},"${color}",${id_cliente},\
                ${null},"${tipo_cliente}","${null}","${null}","${null}",${null},${null},"${null}","${null}",${id_person},${0},${1},"${pFechaHoy}")`;
                        id_vehiculo = await Consulta(query0_0);
                        id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                    } else {
                        const id_tipo_cliente = estado_tipo_cliente[0];
                        const query0_1 = `CALL SP_ADD_Caso_0("${placa}",${idMarca},${idModelo},${idGeneracion},"${color}",${id_cliente},\
                ${id_tipo_cliente},"${null}","${null}","${null}","${null}",${null},${null},"${null}","${null}",${null},${0},${0},"${pFechaHoy}")`;
                        id_vehiculo = await Consulta(query0_1);
                        id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                    }
                    console.log('Datos a enviar', placa, idMarca, idModelo, idGeneracion, color, id_cliente, tipoCaso);
                    // INSERT placa,idMarca,idModelo,idGeneracion,color a (tvehiculo)
                    // SELECT el "id_vehiculo" ultimo agregado
                    // INSERT "id_vehiculo" y "id_cliente" en la tabla (tvehiculo_tcliente)

                    // aca usamos el id_tipo_cliente para INSERT auto nuevo
                } else if (estado_tipo_cliente[1] != 0) { // tipo_cliente 1 // recibimos '' vacio 1/1  escribio nuevo_tipo_cliente
                    console.log('Registrar Nuevo tipo_cliente:', estado_tipo_cliente[0]);

                    const {
                        placa,
                        idMarca,
                        idModelo,
                        idGeneracion,
                        color
                    } = data;
                    const tipo_cliente = estado_tipo_cliente[0];
                    const {
                        nombre_cliente,
                        telefono,
                        email,
                        dni,
                        ruc,
                        razon_social,
                        direccion
                    } = data;

                    let newRuc = parseInt(ruc, 10);
                    const esNaN = isNaN(newRuc); // false = si hay ruc (true) = no hay ruc = 0
                    esNaN ? newRuc = 0 : newRuc = newRuc;

                    const query1 = `CALL SP_ADD_Caso_0("${placa}",${idMarca},${idModelo},${idGeneracion},"${color}",${null},\
                ${null},"${tipo_cliente}","${nombre_cliente}","${telefono}","${email}",${dni},${newRuc},"${razon_social}","${direccion}",${id_person},${1},${null},"${pFechaHoy}")`;

                    console.log('DATOS ENVIADOS :', query1);
                    id_vehiculo = await Consulta(query1);
                    id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                    // INSERT placa,idMarca,idModelo,idGeneracion,color a (tvehiculo)
                    // SELECT el "id_vehiculo" ultimo agregado

                    // INSERT "tipo_cliente" a la tabla (ttipo_cliente)
                    // SELECT el "tipo_cliente" ultimo agregado

                    // INSERT IDtipo_cliente,nombre,telefono,email,dni,ruc,direccion (tcliente)
                    // SELECT el "id_cliente" ingresado de ese "dni"
                    // INSERT "id_vehiculo" y "id_cliente" en la tabla (tvehiculo_tcliente)

                    // aca incertamos el nuevo tipo cliente
                } else { // tipo_cliente 0 Si existe tipo cliente
                    console.log('Usar el id tipo_persona', estado_tipo_cliente[0]);

                    const {
                        placa,
                        idMarca,
                        idModelo,
                        idGeneracion,
                        color
                    } = data;
                    const id_tipo_cliente = estado_tipo_cliente[0];
                    const {
                        nombre_cliente,
                        telefono,
                        email,
                        dni,
                        ruc,
                        razon_social,
                        direccion
                    } = data;

                    let newRuc = parseInt(ruc, 10);
                    const esNaN = isNaN(newRuc); // false = si hay ruc (true) = no hay ruc = 0
                    esNaN ? newRuc = 0 : newRuc = newRuc;

                    console.log('Slida de ruc', newRuc);
                    const query2 = `CALL SP_ADD_Caso_0("${placa}",${idMarca},${idModelo},${idGeneracion},"${color}",${null},\
                ${id_tipo_cliente},"${null}","${nombre_cliente}","${telefono}","${email}",${dni},${newRuc},"${razon_social}","${direccion}",${null},${2},${null},"${pFechaHoy}")`;

                    console.log('DATOS ENVIADOS :', query2);
                    // aca no incertamos tipo cleinte solo usamos el que selecciono
                    id_vehiculo = await Consulta(query2);
                    id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                }
                break;
            case 1:
                console.log('no marca no modelo no generacion', tipoCaso);
                if (id_cliente != '') { // recibimos ID_CLIENTE  0
                    console.log('Usando id_tipo_cliente:', estado_tipo_cliente[0]);
                    console.log(data);
                    const { placa, Marca, modelo, anio, color, id_cliente } = data;

                    if (estado_tipo_cliente[1] != 0) {
                        const tipo_cliente = estado_tipo_cliente[0];
                        const query3_0 = `CALL SP_ADD_Caso_1("${placa}","${Marca}","${modelo}","${anio}","${color}",${id_cliente},\
                ${null},"${tipo_cliente}","${null}","${null}","${null}",${null},${null},"${null}","${null}",\
                ${id_person},${0},${1},"${pFechaHoy}")`;

                        console.log('DATOS ENVIADOS :', query3_0);
                        id_vehiculo = await Consulta(query3_0);
                        id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                    } else {
                        const id_tipo_cliente = estado_tipo_cliente[0];
                        const query3_1 = `CALL SP_ADD_Caso_1("${placa}","${Marca}","${modelo}","${anio}","${color}",${id_cliente},\
                ${id_tipo_cliente},"${null}","${null}","${null}","${null}",${null},${null},"${null}","${null}",\
                ${id_person},${0},${0},"${pFechaHoy}")`;

                        console.log('DATOS ENVIADOS :', query3_1);
                        id_vehiculo = await Consulta(query3_1);
                        id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                    }

                    // aca usamos el id_tipo_cliente
                } else if (estado_tipo_cliente[1] != 0) { // tipo_cliente 1 // recibimos '' vacio 1/1 1
                    console.log('Registrar Nuevo tipo_cliente:', estado_tipo_cliente[0]);

                    const {
                        placa,
                        Marca,
                        modelo,
                        anio,
                        color
                    } = data;
                    const tipo_cliente = estado_tipo_cliente[0];
                    const {
                        nombre_cliente,
                        telefono,
                        email,
                        dni,
                        ruc,
                        razon_social,
                        direccion
                    } = data;

                    let newRuc = parseInt(ruc, 10);
                    const esNaN = isNaN(newRuc); // false = si hay ruc (true) = no hay ruc = 0
                    esNaN ? newRuc = 0 : newRuc = newRuc;

                    const query4 = `CALL SP_ADD_Caso_1 ("${placa}","${Marca}","${modelo}","${anio}","${color}",${null},\
                ${null},"${tipo_cliente}","${nombre_cliente}","${telefono}","${email}",${dni},${newRuc},"${razon_social}","${direccion}",\
                ${id_person},${1},${null},"${pFechaHoy}")`;

                    console.log('DATOS ENVIADOS :', query4);
                    id_vehiculo = await Consulta(query4);
                    id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                    // aca incertamos el nuevo tipo cliente
                } else { // tipo_cliente 0 2
                    // INGRESAR TIPO DE PERSONA EXISTENTE Y NUEVO TODO LO DEMAS;
                    const {
                        placa,
                        Marca,
                        modelo,
                        anio,
                        color
                    } = data;
                    const id_tipo_cliente = estado_tipo_cliente[0];
                    const {
                        nombre_cliente,
                        telefono,
                        email,
                        dni,
                        ruc,
                        razon_social,
                        direccion
                    } = data;

                    let newRuc = parseInt(ruc, 10);
                    const esNaN = isNaN(newRuc); // false = si hay ruc (true) = no hay ruc = 0
                    esNaN ? newRuc = 0 : newRuc = newRuc;

                    const query5 = `CALL SP_ADD_Caso_1 ("${placa}","${Marca}","${modelo}","${anio}","${color}",${null},\
                ${id_tipo_cliente},"${null}","${nombre_cliente}","${telefono}","${email}",${dni},${newRuc},"${razon_social}","${direccion}",\
                ${id_person},${2},${null},"${pFechaHoy}")`;

                    console.log('DATOS ENVIADOS :', query5);
                    id_vehiculo = await Consulta(query5);
                    id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                }
                break;
            case 2:
                console.log('si marca no modelo no generacion', tipoCaso);
                if (id_cliente != '') { // recibimos ID_CLIENTE
                    console.log('Usando id_tipo_cliente:', estado_tipo_cliente[0]);

                    const {
                        placa,
                        idMarca,
                        modelo,
                        anio,
                        color,
                        id_cliente
                    } = data;

                    if (estado_tipo_cliente[1] != 0) {
                        const tipo_cliente = estado_tipo_cliente[0];
                        const query6_0 = `CALL SP_ADD_Caso_2("${placa}",${idMarca},"${modelo}","${anio}","${color}",${id_cliente},\
                ${null},"${tipo_cliente}","${null}","${null}","${null}",${null},${null},"${null}","${null}",\
                ${id_person},${0},${1},"${pFechaHoy}")`;

                        console.log('DATOS ENVIADOS :', query6_0);
                        id_vehiculo = await Consulta(query6_0);
                        id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                    } else {
                        const id_tipo_cliente = estado_tipo_cliente[0];
                        const query6_1 = `CALL SP_ADD_Caso_2("${placa}",${idMarca},"${modelo}","${anio}","${color}",${id_cliente},\
                ${id_tipo_cliente},"${null}","${null}","${null}","${null}",${null},${null},"${null}","${null}",\
                ${id_person},${0},${0},"${pFechaHoy}")`;

                        console.log('DATOS ENVIADOS :', query6_1);
                        id_vehiculo = await Consulta(query6_1);
                        id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                    }

                    // aca usamos el id_tipo_cliente
                } else if (estado_tipo_cliente[1] != 0) { // tipo_cliente 1 // recibimos '' vacio 1/1
                    console.log('Registrar Nuevo tipo_cliente:', estado_tipo_cliente[0]);
                    // aca incertamos el nuevo tipo cliente

                    const {
                        placa,
                        idMarca,
                        modelo,
                        anio,
                        color
                    } = data;
                    const tipo_cliente = estado_tipo_cliente[0];
                    const {
                        nombre_cliente,
                        telefono,
                        email,
                        dni,
                        ruc,
                        razon_social,
                        direccion
                    } = data;

                    let newRuc = parseInt(ruc, 10);
                    const esNaN = isNaN(newRuc); // false = si hay ruc (true) = no hay ruc = 0
                    esNaN ? newRuc = 0 : newRuc = newRuc;

                    const query7 = `CALL SP_ADD_Caso_2 ("${placa}",${idMarca},"${modelo}","${anio}","${color}",${null},\
                ${null},"${tipo_cliente}","${nombre_cliente}","${telefono}","${email}",${dni},${newRuc},"${razon_social}","${direccion}",\
                ${id_person},${1},${null},"${pFechaHoy}")`;

                    console.log('DATOS ENVIADOS :', query7);
                    id_vehiculo = await Consulta(query7);
                    id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                    // aca incertamos el nuevo tipo cliente
                } else { // tipo_cliente 0
                    // aca no incertamos tipo cleinte
                    // INGRESAR TIPO DE PERSONA EXISTENTE Y NUEVO TODO LO DEMAS;
                    const {
                        placa,
                        idMarca,
                        modelo,
                        anio,
                        color
                    } = data;
                    const id_tipo_cliente = estado_tipo_cliente[0];
                    const {
                        nombre_cliente,
                        telefono,
                        email,
                        dni,
                        ruc,
                        razon_social,
                        direccion
                    } = data;

                    let newRuc = parseInt(ruc, 10);
                    const esNaN = isNaN(newRuc); // false = si hay ruc (true) = no hay ruc = 0
                    esNaN ? newRuc = 0 : newRuc = newRuc;

                    const query8 = `CALL SP_ADD_Caso_2 ("${placa}",${idMarca},"${modelo}","${anio}","${color}",${null},\
                ${id_tipo_cliente},"${null}","${nombre_cliente}","${telefono}","${email}",${dni},${newRuc},"${razon_social}","${direccion}",\
                ${id_person},${2},${null},"${pFechaHoy}")`;

                    console.log('DATOS ENVIADOS :', query8);
                    id_vehiculo = await Consulta(query8);
                    id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                }
                break;
            case 3:
                console.log('si marca si modelo no generacion', tipoCaso);
                if (id_cliente != '') { // recibimos ID_CLIENTE
                    console.log('Usando id_tipo_cliente:', estado_tipo_cliente[0]);
                    const {
                        placa,
                        idMarca,
                        idModelo,
                        anio,
                        color,
                        id_cliente
                    } = data;
                    if (estado_tipo_cliente[1] != 0) {
                        const tipo_cliente = estado_tipo_cliente[0];
                        const query9_0 = `CALL SP_ADD_Caso_3("${placa}",${idMarca},"${idModelo}","${anio}","${color}",${id_cliente},\
                ${null},"${tipo_cliente}","${null}","${null}","${null}",${null},${null},"${null}","${null}",\
                ${id_person},${0},${1},"${pFechaHoy}")`;

                        console.log('DATOS ENVIADOS :', query9_0);
                        id_vehiculo = await Consulta(query9_0);
                        id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                    } else {
                        const id_tipo_cliente = estado_tipo_cliente[0];
                        const query9_1 = `CALL SP_ADD_Caso_3("${placa}",${idMarca},"${idModelo}","${anio}","${color}",${id_cliente},\
                ${id_tipo_cliente},"${null}","${null}","${null}","${null}",${null},${null},"${null}","${null}",\
                ${id_person},${0},${0},"${pFechaHoy}")`;

                        console.log('DATOS ENVIADOS :', query9_1);
                        id_vehiculo = await Consulta(query9_1);
                        id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                    }
                    // aca usamos el id_tipo_cliente
                } else if (estado_tipo_cliente[1] != 0) { // tipo_cliente 1 // recibimos '' vacio 1/1
                    console.log('Registrar Nuevo tipo_cliente:', estado_tipo_cliente[0]);
                    // aca incertamos el nuevo tipo cliente

                    const {
                        placa,
                        idMarca,
                        idModelo,
                        anio,
                        color
                    } = data;
                    const tipo_cliente = estado_tipo_cliente[0];
                    const {
                        nombre_cliente,
                        telefono,
                        email,
                        dni,
                        ruc,
                        razon_social,
                        direccion
                    } = data;

                    let newRuc = parseInt(ruc, 10);
                    const esNaN = isNaN(newRuc); // false = si hay ruc (true) = no hay ruc = 0
                    esNaN ? newRuc = 0 : newRuc = newRuc;

                    const query10 = `CALL SP_ADD_Caso_3 ("${placa}",${idMarca},${idModelo},"${anio}","${color}",${null},\
              ${null},"${tipo_cliente}","${nombre_cliente}","${telefono}","${email}",${dni},${newRuc},"${razon_social}","${direccion}",\
              ${id_person},${1},${null},"${pFechaHoy}")`;

                    console.log('DATOS ENVIADOS :', query10);
                    id_vehiculo = await Consulta(query10);
                    id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                    // aca incertamos el nuevo tipo cliente
                } else { // tipo_cliente 0
                    // aca no incertamos tipo cleinte
                    // INGRESAR TIPO DE PERSONA EXISTENTE Y NUEVO TODO LO DEMAS;
                    const {
                        placa,
                        idMarca,
                        idModelo,
                        anio,
                        color
                    } = data;
                    const id_tipo_cliente = estado_tipo_cliente[0];
                    const {
                        nombre_cliente,
                        telefono,
                        email,
                        dni,
                        ruc,
                        razon_social,
                        direccion
                    } = data;

                    let newRuc = parseInt(ruc, 10);
                    const esNaN = isNaN(newRuc); // false = si hay ruc (true) = no hay ruc = 0
                    esNaN ? newRuc = 0 : newRuc = newRuc;

                    const query11 = `CALL SP_ADD_Caso_3 ("${placa}",${idMarca},${idModelo},"${anio}","${color}",${null},\
                ${id_tipo_cliente},"${null}","${nombre_cliente}","${telefono}","${email}",${dni},${newRuc},"${razon_social}","${direccion}",\
                ${id_person},${2},${null},"${pFechaHoy}")`;

                    console.log('DATOS ENVIADOS :', query11);
                    id_vehiculo = await Consulta(query11);
                    id_vehiculo = id_vehiculo[0][0].id_vehiculo;
                }
                break;

                // no default
        }

        console.log('Consulta 1 hecha id vehiculo es', id_vehiculo);
        res.redirect(`info-cliente?id_vehiculo=${id_vehiculo}&placa=${placa}`);
    } else {
        console.log('Consulta 2 hecha id vehiculo es', id_vehiculo);
        res.redirect(`info-cliente?id_vehiculo=${id_vehiculo}&placa=${placa}`);
    }
});

router.route('/info-cliente')
    .get(isLoggedIn, Recuperar_info_Cliente);

router.get('/listar', isLoggedIn, async(req, res) => {
    const InfoUser = await helpers.InfoUser(req.user.id_usuario);
    const spMisOrdenes = await Consulta(`SELECT * FROM tdetallepedido WHERE id_usuario_asignado = "${InfoUser.id_usuario}"`);
    const misOrdenes = spMisOrdenes;
    let index = 0;
    misOrdenes.forEach(() => {
        misOrdenes[index].fecha = helpers.timeago_int(misOrdenes[index].fecha);
        /*     console.log(element.created_at,m); */
        index++;
    });
    console.log(req.flash('success', 'Se agrego correctamente'), "get");
    res.render("formListarOrdenes", { datos: misOrdenes });
});

router.post('/listar', isLoggedIn, async(req, res) => {
    console.log(req.body);
    const { title, url, description } = req.body;
    const nuevaOrden = {
        title,
        url,
        description,
        user_id: req.user.id
    };
    await Consulta('INSERT INTO torden set ?', [nuevaOrden]);
    /*     console.log("tamaño es",misOrdenes.length,"y",misOrdenes[0]); */
    console.log(req.flash('success', ''), "post");
    /*   res.render("formListarOrdenes"); */
    req.flash('success', 'Orden Agregada correctamente');
    res.redirect('/listar');
});

router.post('/nuevo-cliente', async(req, res) => {
    const { nuevaPlaca } = req.body;
    const InfoUser = await helpers.InfoUser(req.user.id_usuario);
    const consultaPlacaExistente = await pool.query(`CALL SP_FN_Existencia_Placa("${nuevaPlaca}");`);
    const { existenciaPlaca } = consultaPlacaExistente[0][0];

    console.log("RESPUESTA DE LA BASE DE DATOS ", consultaPlacaExistente);
    console.log('Placabuscada', nuevaPlaca);
    console.log('RESPUESTA', existenciaPlaca);
    if (existenciaPlaca !== 0) {
        req.flash('messages', 'Esa placa ya existe');
        res.redirect('/consultar');
    } else {
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

        const Sp_get_marcas = await Consulta('CALL SP_get_marca_auto()');
        const consulta = Sp_get_marcas[0];

        const id = [];
        const marca = [];
        let i = 0;
        consulta.forEach((element) => {
            id[i] = element.id_marca_auto;
            marca[i] = element.marca;
            i++;
        });

        // Consulta para los Tipo de Cliente
        const Consulta_tipo_cliente = await Consulta('SELECT id_tipo_cliente,tipo_cliente FROM ttipo_cliente');
        const TipoCliente = { id_tipo_cliente, tipo_cliente } = Consulta_tipo_cliente;

        const idTipo_cliente = [];
        const Tipo_cliente = [];
        let n = 0;
        TipoCliente.forEach((element) => {
            idTipo_cliente[n] = element.id_tipo_cliente;
            Tipo_cliente[n] = element.tipo_cliente;
            n++;
        });
        const Tipos_Cliente = { idTipo_cliente, Tipo_cliente };
        console.log('idTipo_cliente,Tipo_cliente', Tipos_Cliente);

        const { nuevaPlaca } = req.body;
        const id_marca = {
            InfoUser,
            id,
            marca,
            nuevaPlaca,
            nombre_dni,
            pId_cliente,
            pnombre_cliente,
            Tipos_Cliente
        };
        // console.log(id_marca)

        res.render('formAddCliente', { data: id_marca });
    }
});

router.post('/cliente', (req) => {
    console.log(req.body);
});

router.get('/', isNotLoggedIn, (req, res) => {
    try {
        console.log('typeof req.user', typeof req.user);
        if (typeof req.user !== 'undefined') {
            res.redirect('/profile', { data: tiempo_es });
        } else {
            res.render('auth/signin');
        }
    } catch (error) {
        res.render('auth/signin');
        console.log(error);
    }
});

router.post('/', async(req, res) => {
    const person_username = req.user.username;
    const { password_old, password_new, password_confirm } = req.body;
    console.log('Datass', password_old, password_new, password_confirm);
    const Password = await Consulta(`SELECT password FROM tusuario WHERE username = "${person_username}";`);
    const Existencia_Password = await helpers.matchPassword(password_old, Password[0].password);

    if (Existencia_Password) {
        if (password_new == password_confirm) {
            const encript_password_new = await helpers.encryptPassword(password_confirm);

            await Consulta(`UPDATE tusuario SET password ="${encript_password_new}" WHERE username = "${person_username}"`);

            // Enviar a email Su nueva contraseña
            const Email_Usuario = await Consulta(`SELECT email FROM v_tusuario_tpersona WHERE username = "${person_username}";`);
            console.log('EMAIL,', Email_Usuario);
            const cuerpoMensage = `<ul>\
          <li><b>Usuario:</b>${person_username}</li>\
          <li><b>Nueva contraseña:</b>${password_confirm}</li>\
          </ul>`;
            helpers.EnviarMensage(Email_Usuario[0].email, 'Actualizacion de contraseña', cuerpoMensage);

            req.flash('confirmation', 'La contraseña se actualizo correctamente');
            res.redirect('/');
        } else {
            req.flash('confirmation', 'Las contraseña no coinciden');
            res.redirect('/edit-password');
        }
    } else {
        req.flash('confirmation', 'La contraseña antigua no existe');
        res.redirect('/edit-password');
    }
});

router.get('/nueva-orden', isLoggedIn, (req, res) => {
    // res.rendesr("loggin");
    res.render("nuevo");
});

router.get('/listar/delete/:id', async(req, res) => {
    const { id } = req.params;
    await Consulta('delete from torden where id= ?', [id]);
    req.flash('success', 'Orden finalizada correctamente');
    res.redirect('/listar');
});

router.get('/listar/edit/:id', async(req, res) => {
    const { id } = req.params;
    const ordenes = await Consulta('SELECT * FROM torden WHERE id= ?', [id]);
    res.render('editarOrden', { ordenes: ordenes[0] });
});

router.post('/listar/edit/:id', async(req, res) => {
    const { id } = req.params;
    const { title, description, url } = req.body;
    const newLink = {
        title,
        description,
        url
    };
    // console.log(newLink);
    // res.send('actualizado');
    await Consulta('UPDATE torden set ? WHERE id = ?', [newLink, id]);
    req.flash('success', 'Orden actualizada correctamente');
    res.redirect('/listar');
});

router.route('/consultar')
    .get(isLoggedIn, HacerConsulta);

router.get('/checklist', isLoggedIn, (req, res) => {
    res.render('FormCkeckList');
});
router.get('/horas', async(req, res) => {
    // I (fecha string formato ISO ,Nombre timezone)
    Convercion_ISO_String2 = (pStr_pfecha, TimeZOne) => {
        const date = new Date(pStr_pfecha).toLocaleString('en-US', {
            hour12: false,
            timeZone: TimeZOne
        }).split(" ");

        const time = date[1];
        let mdy = date[0];

        mdy = mdy.split('/');
        const month = parseInt(mdy[0]);
        const day = parseInt(mdy[1]);
        const year = parseInt(mdy[2]);

        const formattedDate = `${year}-${month}-${day} ${time}`;
        return formattedDate;
    }; // O dddd-mm-dd hh:mm:ss

    // I (fecha Date formato ISO ,Nombre timezone)
    Convercion_ISO_String = (pISO_pfecha, TimeZOne) => {
        const pStr_pfecha = pISO_pfecha.toISOString();
        const date = new Date(pStr_pfecha).toLocaleString('en-US', {
            hour12: false,
            timeZone: TimeZOne
        }).split(" ");

        const time = date[1];
        let mdy = date[0];

        mdy = mdy.split('/');
        const month = parseInt(mdy[0]);
        const day = parseInt(mdy[1]);
        const year = parseInt(mdy[2]);

        const formattedDate = `${year}-${month}-${day} ${time}`;
        const eu_iso_str = new Date(formattedDate).toISOString();

        const eu_fecha_creada = new Date(eu_iso_str);

        return eu_fecha_creada;
    }; // O dddd-mm-dd hh:mm:ss

    const fecha_entrada = new Date('2019-12-02 12:00:00');

    const iso_str = new Date(fecha_entrada).toISOString();

    const fecha_creada = new Date(iso_str);

    const salida_date = Convercion_ISO_String(fecha_creada, 'Asia/Oral');

    const salida = {
        hora: Convercion_ISO_String2(salida_date, 'Europe/Lisbon'),
        timeago: helpers.timeago(salida_date)
    };
    res.send(salida);
});
router.get('/studio', async(req, res) => {
    Convercion_ISO_String = (pStr_pfecha, TimeZOne) => {
        // Now we can access our time at date[1], and monthdayyear @ date[0]
        const date = new Date(pStr_pfecha).toLocaleString('en-US', {
            hour12: false,
            timeZone: TimeZOne
        }).split(" ");

        const time = date[1];
        let mdy = date[0];

        // We then parse  the mdy into parts
        mdy = mdy.split('/');
        const month = parseInt(mdy[0]);
        const day = parseInt(mdy[1]);
        const year = parseInt(mdy[2]);

        // Putting it all together
        const formattedDate = `${year}-${month}-${day} ${time}`;
        return formattedDate;
    };

    const fecha_sql = await Consulta('SELECT creacionVehiculo FROM tvehiculo where id_vehiculo = 515;');
    const date_pfecha = fecha_sql[0].creacionVehiculo;
    // 2019-11-30 11:38:38
    console.log('▼▼▼▼▼▼▼▼▼▼▼▼▼▼ MI FECHA ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼');

    console.log(' Entrada Fecha Formato ISO-Date ', date_pfecha);
    const str_pfecha = date_pfecha.toISOString();
    console.log(' Convercion Fecha Formato ISO-String ', str_pfecha);

    const My_format_dDate = Convercion_ISO_String(str_pfecha, 'Europe/Lisbon'); // donde estas?
    console.log(' Convercion Fecha Formato yyyy-mm-dd ', My_format_dDate);

    const fecha_creada = new Date(str_pfecha);

    console.log(' Convercion de ISO-String => ISO-Date ', fecha_creada);

    console.log('▼▼▼▼▼▼▼▼▼▼▼▼▼▼ FECHA EUROPE ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼');

    console.log(' Entrada Fecha Formato ISO-Date ', date_pfecha);
    const eu_ISOstr_pfecha = date_pfecha.toISOString();
    console.log(' Convercion Fecha Formato ISO-String ', eu_ISOstr_pfecha);

    const eu_dddd_str = Convercion_ISO_String(eu_ISOstr_pfecha, 'Asia/Oral');

    // Desde aca se considera fecha de 'Europe/Lisbon'
    console.log(' Convercion Fecha Formato yyyy-mm-dd ', eu_dddd_str);

    // Convertimos a formato iso string


    // Convercion fecha europea a AMerica/Lima
    const am_dddd_str = Convercion_ISO_String(eu_ISOstr_pfecha, 'America/Lima');
    console.log(' Convercion Fecha Formato yyyy-mm-dd (America) ', am_dddd_str);

    const am_iso_str = new Date(am_dddd_str).toISOString();
    console.log(' Convercion de yyyy-mm-dd a ISO-String (America) ', am_iso_str);

    const formatTime = helpers.formatTime(date_pfecha);
    res.send(formatTime);
});

router.route('/crear-checklist')
    .post(asinarOrden);

router.get('/edit-password', isLoggedIn, async(req, res) => {
    res.render('edit-password');
});

router.post('/registro-completo', isLoggedIn, async(req, res, next) => {
    const InfoUser = await helpers.InfoUser(req.user.id_usuario); // Info Usuario Logueado
    const {
        tipo_usuario,
        nombre,
        apellido_paterno,
        apellido_materno,
        telefono,
        dni,
        direccion,
        sexo,
        edad,
        email
    } = req.body;

    // Datos para TUsuario
    const Username = await helpers.GenerarUsername(email);
    const Password = await helpers.GenerarPassword();
    const password_ecript = await helpers.encryptPassword(Password);
    const query = `CALL SP_Crear_Nuevo_Usuario2(${tipo_usuario},"${nombre}","${apellido_paterno}","${apellido_materno}","${telefono}",\
  ${dni},"${direccion}","${sexo}",${edad},"${email}","${Username}","${password_ecript}")`;
    console.log('query', query);

    try {
        await Consulta(query);
        console.log('pasword_encriptado', password_ecript);

        console.log('Username:', Username);
        console.log('Password', Password);

        const cuerpoMensage = `<ul>\
    <li><b>Usuario:</b>${Username}</li>\
    <li><b>Password:</b>${Password}</li>\
    <li>List item</li>\
    <li>List item</li>\
  </ul>`;
        await helpers.EnviarMensage(`${email}`, 'UN MENSAGE NUEVO', cuerpoMensage);
        console.log('req.body', req.body);
    } catch (error) {
        console.log('error: ', error);
    }
    req.flash('messages', 'Se ha registrado correctamente el Usuario');
    const data = { InfoUser };
    res.render('FormExito_registro', { data: data });
    next();
});

router.post('/detalle-pedido', isLoggedIn, async(req, res) => {
    const { id_detalle_pedido, mis_Observaciones } = req.body;

    console.log('mis_Observaciones', req.body);
    await Consulta(`UPDATE tdetallepedido SET Detalle_requerimiento = "${mis_Observaciones}" WHERE (id_detallePedido = ${id_detalle_pedido});`);

    // SELECCIONARA EL ID DE CAJA RANDOM XD soi telible
    const consulta_id_caja = await Consulta('SELECT id_usuario FROM v_cajeros_habilitados ORDER BY RAND() limit 1;');
    const { id_usuario } = consulta_id_caja[0];

    // INGRESAMOS UN NUEVO DETALLE PEDIDO PARA FACTURACION

    await Consulta(`CALL SP_ADD_Detalle_Facturacion(${id_usuario},${id_detalle_pedido});`);
    req.flash('messages', 'Se ha enviado a facturar esta orden con exito');
    res.redirect('/profile');
});

router.get('/detalle-pedido', isLoggedIn, async(req, res) => {
    // === === === ESTA RUTA SOLO SERA PARA EL MECANICO :( === === ===

    // RECIBIMOS LAS BARIABLES POR LA DIRECCION URL
    // El id_receptor = yo / El idDetallePedido = al que me asignaron.
    const InfoUser = await helpers.InfoUser(req.user.id_usuario);
    console.log('req.query', req.query);
    console.log('InfoUser', InfoUser);
    const { id_receptor, idDetallePedido, idDNotificacion } = req.query;

    const consultaVerificacion = await Consulta(`SELECT id_tipo_usuario FROM tusuario_ttipousuario WHERE id_usuario = ${id_receptor};`);
    const { id_tipo_usuario } = consultaVerificacion[0];

    console.log('idTipo_usuario => ', id_tipo_usuario);
    /*   const query_Detalle_mis_pedidos_asignados = `CALL SP_Mis_pedidos_asignados(${id_receptor})`;
      const consulta_Detalle_mis_pedidos_asignados = await Consulta(query_Detalle_mis_pedidos_asignados);
      console.log('consulta_Detalle_mis_pedidos_asignados:', consulta_Detalle_mis_pedidos_asignados[0], 'para mi id: ', id_receptor); */

    // SOLAMENTE QUIERO VER LA INFORMACION DEL PEDIDO CON ESTE ID_DETALLE_PEDIDO
    const queryDetallePedidoTerminado = `CALL SP_Mis_facturaciones_asignadas(${idDetallePedido})`;

    const consultaDetallePedidoTerminado = await Consulta(queryDetallePedidoTerminado);
    console.log('Respuesta detalle-pedido:', consultaDetallePedidoTerminado[0]);

    const Detalle_Pedido = consultaDetallePedidoTerminado[0];
    const data = {
        InfoUser,
        Detalle_Pedido,
        id_tipo_usuario,
        idDNotificacion,
        idDetallePedido
    };

    console.log('informacion pedido', data);
    console.log('Detalle_Pedido.length =>', Detalle_Pedido.length);
    // REnderizamos enviando los datos
    res.render('Detalle_Pedido', { data: data });
    // }
});

router.post('/detalle-pedido-facturacion', isLoggedIn, async(req, res, next) => {
    const { id_detalle_pedido, id_Notificacion } = req.body;
    console.log('req.body', req.body);

    console.log('INICIO CAJERO SUBMIT______________________________________________________________________________________________');

    // SABER LA FECHA DE INICIO Y nro_orden de este id_detalle_pedido
    const query_fecha_inicio = `SELECT fecha,nro_Orden FROM tdetallepedido where id_detallePedido = ${id_detalle_pedido};`;
    const consulta_fecha_inicio = await Consulta(query_fecha_inicio);
    const { fecha, nro_Orden } = consulta_fecha_inicio[0];

    // ordenamos la fecha para incertar en TABLA ORDENES GENERALES
    const date = `${fecha.getFullYear()}-${fecha.getMonth() + 1}-${fecha.getDate()}`;
    const time = `${fecha.getHours()}:${fecha.getMinutes()}:${fecha.getSeconds()}`;
    const dateTime = `${date} ${time}`;
    let pFechaHoy = helpers.new_Date(new Date());
    pFechaHoy = helpers.formatDateTime(pFechaHoy);
    // la salida es esta
    console.log('La Fecha de iniciacion es', dateTime, 'Y numero de orden es : ', nro_Orden);

    // CAMBIAR EL ESTADO DE ORDEN A 5 = finalizado DE ORDENES ACTUALES
    await Consulta(`UPDATE tordenes_actuales SET id_estadoOrden = 5 WHERE (nro_orden = ${nro_Orden});`);
    await Consulta(`UPDATE tdetallepedido SET id_estadoOrden = 5 WHERE (nro_orden = ${nro_Orden});`);

    // INCERTANDO EN ORDENES GENERALES
    await Consulta(`CALL SP_ADD_OrdenesGenerales(${nro_Orden},"${dateTime}","${pFechaHoy}",${id_detalle_pedido});`);

    // ACTUALIZAMOS EL DETALLE FACTURACION A 2 PARA SABER QUE SE HA FACTURADO
    await Consulta(`UPDATE tdetalle_facturacion SET id_estado_facturacion = 2 where (id_detalle_pedido = ${id_detalle_pedido});`);

    // ELIMINAR ESTA NOTIFICACION DE PEDIDO QUE ME ENVIO EL ASIGNADOR
    await Consulta(`UPDATE tnotificaciones SET id_estado_notificacion = 2 where (id_notificaciones = ${id_Notificacion});`);

    // ELIMINAR ESTA NOTIFICACION DE PEDIDO QUE ME ENVIO EL ASIGNADOR
    const consulta_IdServicios_Usados = await Consulta(`SELECT id_servicio FROM tpedido where (id_detallePedido = ${id_detalle_pedido});`);
    const id_servicio = consulta_IdServicios_Usados;
    console.log('id_servicio', id_servicio);

    // RANKEAR LOS SERVICIOS QUE SE UTILIZARON
    for (let cont = 0; cont <= id_servicio.length - 1; cont++) {
        const consulta_veces = await Consulta(`SELECT veces_usada FROM tservicios_generales WHERE id_servicios_generales = ${id_servicio[cont].id_servicio};`);
        let veces = consulta_veces[0].veces_usada;
        veces++;
        await Consulta(`UPDATE tservicios_generales SET veces_usada = ${veces} WHERE id_servicios_generales = ${id_servicio[cont].id_servicio};`);
    }

    // await Consulta('DELETE FROM tnotificaciones WHERE (id_user_emisor = '+id_usuario_asignador+' && id_user_receptor = '+req.user.id_persona+');');
    req.flash('messages', 'Se ha acabado con esta orden');
    console.log('FIN CAJERO SUBMIT______________________________________________________________________________________________');
    res.redirect('/profile');
    next();
});

router.get('/detalle-pedido-facturacion', isLoggedIn, async(req, res) => {
    console.log('req.query', req.query);
    const InfoUser = await helpers.InfoUser(req.user.id_usuario);
    const { id_receptor, idDetallePedido, idDNotificacion } = req.query;

    // SABER CUANTOS ID_DETALLEPEDIDO_TENGO ASIGNADO COMO CAJA
    const query_id_detalle_pedido_caja = `CALL SP_GET_idDetalle_Pedido_caja(${id_receptor});`;
    const consulta_id_detalle_pedido_caja = await Consulta(query_id_detalle_pedido_caja);

    console.log('Mi id:', id_receptor, ' tiene ', consulta_id_detalle_pedido_caja);

    // SOLAMENTE QUIERO VER LA INFORMACION DEL PEDIDO CON ESTE ID_DETALLE_PEDIDO
    const queryDetallePedidoTerminado = `CALL SP_Mis_facturaciones_asignadas(${idDetallePedido})`;
    const consultaDetallePedidoTerminado = await Consulta(queryDetallePedidoTerminado);
    console.log('Respuesta:', consultaDetallePedidoTerminado[0]);

    const Detalle_Pedido = consultaDetallePedidoTerminado[0];
    const data = { InfoUser, Detalle_Pedido, idDNotificacion };
    console.log('Detalle_Pedido.length =>', Detalle_Pedido.length);

    res.render('Detalle_Facturacion', { data: data });
});

router.get('/pdf', async(req, res) => {

    let fecha_de_barras = await helpers.Fecha_barras();

    console.log('Esta es la fecha de  Barras', fecha_de_barras);

    let datos_orden = {
        nro_orden: "000666",
        fecha: "15/03/20"
    }

    let datos_cliente = {
        nombre_cliente_razon_social: "Oliver Heldens",
        dni_ruc: "78546952",
        telefono: "985 632 512"
    }

    let datos_vehiculo = {
        placa: "XYZ-123",
        marca: "Bugatti",
        modelo: "Veyron",
        generacion: "generacion 2015",
        color: "Blanco",
        kilometrage: "322,322"
    }

    //var result = "<img src='" + imgSrc + "' alt='logo Autolinea' /><div style='text-align: center;'>Author: Marc Bachmann</div>";
    //var result2 = `<img src='` + imgSrc + `' alt='logo Autolinea' /><div style='text-align: center;'>Author: Marc Bachmann</div>`;

    //console.log('La direccion de la imagen es:',imgSrc);
    var options = {
        format: 'A4',
        orientation: 'portrait'
    }

    let plantillaPDF = await helpers.Plantilla_Orden_pdf(datos_orden, datos_cliente, datos_vehiculo);
    pdf.create(plantillaPDF, options).toFile('./Downloads/salida.pdf', function(err, res) {
        if (err) {
            console.log(err);
        } else {
            console.log(res);
        }
    });

    res.render('Download');
})

router.post('/pdfd', async(req, res) => {
    const file = './Downloads/salida.pdf';
    console.log('Se esta descargandoel archibo');
    res.download(file);
});

router.get('/historial', isLoggedIn, async(req, res) => {
    const InfoUser = await helpers.InfoUser(req.user.id_usuario); // Info Usuario Logueado
    // const query_data_historial_resumen = 'SELECT * FROM v_historial_resumen;';
    const query_data_historial_resumen = 'CALL SP_GET_Historial_Ultimos_Vehiculos();';

    const consulta_data_historial_resumen = await Consulta(query_data_historial_resumen);
    const historial = consulta_data_historial_resumen[0];

    const Tiempo_Inicio = [];
    const Tiempo_Inicio_corto = [];
    let n = 0;
    historial.forEach(() => {
        Tiempo_Inicio[n] = helpers.timeago_int(historial[n].fecha_iniciacion);
        Tiempo_Inicio_corto[n] = helpers.formatDate(historial[n].fecha_iniciacion);
        n++;
    });
    // console.log('Resumen de Historial',data);
    const data = {
        historial,
        Tiempo_Inicio,
        Tiempo_Inicio_corto,
        InfoUser
    };

    res.render('plantilla', { data: data });
});

router.get('/detalle-seguimiento', isLoggedIn, async(req, res) => {
    console.log('req.query', req.query);
    const InfoUser = await helpers.InfoUser(req.user.id_usuario);
    const {
        idSeguimiento,
        id_cliente,
        id_vehiculo
    } = req.query;

    // RECUPERAR HISTORIAL DE SERVICIOS DEL VEHICULO
    const query_historial_servicios = `SELECT * FROM v_historial_resumen where id_vehiculo = ${id_vehiculo};`;
    const consulta_historial_servicios = await Consulta(query_historial_servicios);
    const historial_servicios = consulta_historial_servicios;

    // RECUPERAR DATOS "Principales" DEL VEHICULO
    const Info_vehiculo = {
        placa,
        vehiculo_marca,
        modelo,
        color
    } = historial_servicios[0];

    const Tiempo_Inicio = [];
    const Tiempo_Inicio_corto = [];
    let n = 0;

    historial_servicios.forEach(() => {
        Tiempo_Inicio[n] = helpers.timeago_int(historial_servicios[n].fecha_iniciacion);
        Tiempo_Inicio_corto[n] = helpers.formatDate(historial_servicios[n].fecha_iniciacion);
        n++;
    });

    // RECUPERAR DATOS "Principales" DEL CLIENTE
    const query_info_Cliente = `SELECT * FROM v_cliente_tipo_cliente WHERE id_cliente = ${id_cliente};`;
    const consulta_info_Cliente = await Consulta(query_info_Cliente);
    console.log('Datos del cliente', consulta_info_Cliente);

    const Info_Cliente = {
        nombre_cliente,
        telefono,
        dni,
        ruc,
        tipo_cliente
    } = consulta_info_Cliente[0];

    // RECUPERAR HISTORIUAL DE LLAMADAS
    const query_historial_seguimiento = `SELECT * FROM v_ids_detalle_seguimiento where id_vehiculo = ${id_vehiculo} && id_usuario is not null;`;
    const consulta_historial_seguimiento = await Consulta(query_historial_seguimiento);
    const historial_seguimiento = consulta_historial_seguimiento;

    Validar_Usuario_Seguimiento = async(pId_usuario) => {
        // let Info_Usuario = {};
        // if(pId_usuario != null){
        const query_info_Usuario = `SELECT nombre,apellido_paterno FROM v_tusuario_tpersona WHERE id_usuario = ${pId_usuario};`;
        const consulta_info_Usuario = await Consulta(query_info_Usuario);
        const { nombre, apellido_paterno } = consulta_info_Usuario[0];
        console.log('No es nulo el id_usuario', consulta_info_Usuario);
        // }else{
        // Info_Usuario = {nombre:'SIN ',apellido_paterno:'NOMBRE'}
        // console.log('SI es nulo el id_usuario')
        // }
        const data = { nombre: nombre, apellido_paterno: apellido_paterno };
        return data;
    };

    if (historial_seguimiento.length != 0) {
        const Tiempo_Seguimiento = [];
        const Tiempo_Seguimiento_corto = [];
        let info_emisor = {};

        /*     historial_seguimiento.forEach(element => {
          Tiempo_Seguimiento[i]       = helpers.timeago(historial_seguimiento[i].fecha_seguimiento)
          Tiempo_Seguimiento_corto[i] = helpers.formatDate(historial_seguimiento[i].fecha_seguimiento)
          info_emisor = {nombre:nombre,apellido_paterno:apellido_paterno} = await Validar_Usuario_Seguimiento(historial_seguimiento[i].id_usuario)
          console.log('BOOCLE',info_emisor)
          await Object.assign(element[i],info_emisor)
          i++
        }); */

        for (let index = 0; index <= historial_seguimiento.length - 1; index++) {
            Tiempo_Seguimiento[index] = helpers.timeago_int(historial_seguimiento[index].fecha_seguimiento);
            Tiempo_Seguimiento_corto[index] = helpers.formatDate(historial_seguimiento[index].fecha_seguimiento);
            info_emisor = { nombre, apellido_paterno } = await Validar_Usuario_Seguimiento(historial_seguimiento[index].id_usuario);
            console.log('BOOCLE', info_emisor);
            await Object.assign(historial_seguimiento[index], info_emisor);
        }

        // console.log('Salida de la funcion',info_emisor);

        console.log('Data Historial Seguimiento', historial_seguimiento);
        // HACER OBJETO PARA LA VISTA
        const data = {
            InfoUser,
            historial_servicios,
            historial_seguimiento,
            Tiempo_Inicio,
            Tiempo_Inicio_corto,
            Tiempo_Seguimiento,
            Tiempo_Seguimiento_corto,
            Info_vehiculo,
            Info_Cliente,
            idSeguimiento,
            estado: true
        };
        res.render('Form_detalle_seguimiento', { data: data });
    } else {
        const data = {
            InfoUser,
            historial_servicios,
            Tiempo_Inicio,
            Tiempo_Inicio_corto,
            Info_vehiculo,
            Info_Cliente,
            idSeguimiento,
            estado: false
        };
        res.render('Form_detalle_seguimiento', { data: data });
    }
});

router.post('/detalle-seguimiento', isLoggedIn, async(req, res) => {
    const InfoUser = await helpers.InfoUser(req.user.id_usuario);
    const { id_seguimiento, detalle_seguimiento } = req.body;
    const d_hoy = {
        d_date: helpers.new_Date(new Date()),
        d_str: helpers.formatDateTime(helpers.new_Date(new Date()))
    };

    // RECUPERAR INFORMACION DE ESTE SEGUIMIENTO
    const query_info_seguimiento = `SELECT * FROM tseguimiento WHERE id_seguimiento = ${id_seguimiento};`;
    const consulta_info_seguimiento = await Consulta(query_info_seguimiento);
    const info_seguimiento = consulta_info_seguimiento[0];

    const {
        id_detalle_pedido,
        id_vehiculo,
        id_cliente,
        id_estado_seguimiento,
        id_etapa_seguimiento,
        fecha_salida
    } = info_seguimiento;

    console.log('Convercion de fecha', helpers.formatDateTime(fecha_salida));
    console.log('info_seguimiento', info_seguimiento);

    console.log('SP_', id_seguimiento,
        id_detalle_pedido,
        id_cliente,
        id_vehiculo,
        InfoUser.id_usuario,
        id_estado_seguimiento,
        id_etapa_seguimiento,
        detalle_seguimiento,
        helpers.formatDateTime(fecha_salida));

    const query_registrar_seguimiento = `CALL SP_Registrar_Seguimiento(
    ${id_seguimiento},
    ${id_detalle_pedido},
    ${id_cliente},
    ${id_vehiculo},
    ${InfoUser.id_usuario},
    ${id_estado_seguimiento},
    ${id_etapa_seguimiento},
    "${detalle_seguimiento}",
    "${helpers.formatDateTime(fecha_salida)}",
    "${d_hoy.d_str}"
    );`;
    await Consulta(query_registrar_seguimiento);
    // console.log('Salida de ESTE SEGUIMIENTO',info_seguimiento[0]);
    const data = { InfoUser };
    res.render('F_Registro_seguimiento_exito', { data: data });
});
// Nueva ruta
router.route('/reportes')
  .get(recuperarReporte_get);

router.route('/ordenes-hoy')
	.get(isLoggedIn, recuperarOrdenes_hoy_get);
	
router.route('/api/orden/:numeroOrden')
	.get(isLoggedIn, getDatosOrdenesApi);

module.exports = router; // 859