'use strict';
import {FuncsRedNeur} from './funcsredneuronal';
const esclavo = require('dist.io').Slave;
let frn: FuncsRedNeur;
 
async function atiendeAmaestro(datos : Object, hecho : CallableFunction):Promise<void>{
	console.log('el esclavo numero '+esclavo.id+' ha recibido datos desde maestro');
	let s_imagenBase64 : string = datos['imagenb64'];
	let anfitrionYpuerto : string = datos['urlmaestro'];	
	//intenta clasificar la imagen
	let j_clases : any = await frn.predecirConModeloMobilenet(s_imagenBase64,anfitrionYpuerto)
	.catch((e)=>{
		console.log('error al predecir: '+e);
		j_clases=e;//si hay error, manda el error en vez de las clases
	});
	//devuelve la clasificacion
	hecho(j_clases);
}

frn = new FuncsRedNeur();
esclavo.task('mensajeimagen', atiendeAmaestro);
esclavo.on('uncaughtException', () => {console.log('error excepcion no contemplada')});
console.log('el esclavo numero '+esclavo.id+' te saluda, oh! cesar!');