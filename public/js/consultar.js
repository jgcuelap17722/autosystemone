// console.log(data);
// eslint-disable-next-line camelcase
const { id_vehiculo, Placas } = data;

const inpPlaca = document.getElementById("cbPlaca");
const awesomplete = new Awesomplete(inpPlaca, {
  maxItems: 5,
  minChars: 1,
  filter: Awesomplete.FILTER_STARTSWITH
});
awesomplete.list = Placas;

function KeyPress() {
  let val = this.value.replace(/[^a-zA-Z0-9,-]/g, '');
  if (val.indexOf('-') > -1) {
    this.value = this.value.substr(0, 7);
    awesomplete.evaluate();
  } else if (val.length < 7) {
    let newVal = '';
    while (val.length > 3) {
      newVal += `${val.substr(0, 3)}-`;
      val = val.substr(3);
    }
    newVal += val;
    this.value = newVal;
    awesomplete.evaluate();
  } else {
    this.value = this.value.substr(0, 7);
    awesomplete.evaluate();
  }
}

// EVENTO PRESIONAR TECLA
inpPlaca.addEventListener('input', KeyPress);

inpPlaca.addEventListener('focus', () => {
  awesomplete.evaluate();
});

document.getElementById('cbPlaca').addEventListener('awesomplete-selectcomplete', function () {
  // MOSTRAR UNA PRUEBA DE LO SELECCIONADO
  const i = Placas.indexOf(this.value);
  console.log('Seleccionaste esta placa', this.value, 'Con este id:', id_vehiculo[i]);

  $('#id_Vehiculo').val(id_vehiculo[i]);
  $('#Placa').val(this.value);
  $('#form-get').submit();
});
