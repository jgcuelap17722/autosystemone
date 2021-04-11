// Especificar que ba a ser la biblioteca " timeago.js "
const { format } = require('timeago.js'); // importamos la biblioteca

const helpers = {}; // despues utilizaremos esa instancia

// creamos la funcion
// convertir en formato 3 minutos atras
// conole.log(timestamp) -- p

helpers.timeago_int = (timestamp) => format(timestamp);

module.exports = helpers;
