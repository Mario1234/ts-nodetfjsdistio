import * as servidorHttp from 'http';
import * as tradURL from 'url';
import * as sistemaArchivos from 'fs';
let ahora = require('performance-now');
const maestro = require('dist.io').Master;

let puerto : number = 9615;// parseInt(process.env.PORT);
let listasImagenes : Object = {};//string[][];
let mensajerror : string;
let l_predicciones : Object[][];

//<grupo de solicitud> es el conjunto de peticiones de subidas de imagenes y de la peticion de prediccion para clasificar dichas imagenes
//cada grupo identifica una solicitud por parte del cliente de querer clasificar un conjunto de imagenes

//lee el contenido del cuerpo(body) de la peticion y lo devuelve como string de manera asincrona
function leerCuerpo(peticion: servidorHttp.IncomingMessage):Promise<string>{
    return new Promise(function(resolve,reject){
        let acum:string='';
        peticion.on('readable', function() {
            acum += peticion.read();
        });
        peticion.on('end', function() {
            acum=acum.substring(0,acum.length-4);//quita el null del final
            resolve(acum);
        });
    });
}

//atiende la peticion de subir una de las imagenes del <grupo de solicitud>
//funcion asincrona devuelve void, es asincrona para poder usar await
async function atiendeSubir(peticion : servidorHttp.IncomingMessage, respuesta : servidorHttp.ServerResponse):Promise<void>{
    let s_json:string= await leerCuerpo(peticion);     
    let j_idEimagen: Object = JSON.parse(s_json);
    let s_imagenBase64:string=j_idEimagen['imagen'];//recoge la imagen, es un string con los datos de imagen en b64
    //recoge el identificador que define a que <grupo de solicitud> pertenece esta imagen
    let s_id:string =j_idEimagen['id']; 
    console.log('subido por: '+s_id);
    let listaImagenes : string[];
    if(listasImagenes[s_id]==undefined){//si no estaba definida la creamos
        listaImagenes = [];
        //se anaide a la objeto global listasImagenes
        //la lista de imagenes (listaImagenes) de este <grupo de solicitud>
        //se aniade como atributo nuevo del objeto
        listasImagenes[s_id] = listaImagenes;
    }
    else{
        listaImagenes = listasImagenes[s_id];//acceso a un atributo anteriormente creado
    }
    listaImagenes.push(s_imagenBase64);
    //responde que todo ha ido bien
    respuesta.writeHead(200);
    respuesta.end();
}

//atiende la peticion de clasificar cada una de las imagenes del <grupo de solicitud>
//funcion asincrona devuelve void, es asincrona para poder usar await
async function atiendePredecir(peticion : servidorHttp.IncomingMessage, respuesta : servidorHttp.ServerResponse, anfitrionYpuerto:string):Promise<void>{
    let s_json:string = await leerCuerpo(peticion);        
    let j_id : Object = JSON.parse(s_json);
    let s_id:string =j_id['id'];//recoge el identificador del <grupo de solicitud> de clasificacion de imagenes
    if(s_id!=undefined){
        console.log('prediciendo imagenes de: '+s_id);
        let listaImagenes : string[] = listasImagenes[s_id];//recoge la lista de imagenes subidas en este <grupo solicitud>
        l_predicciones = [];//lista de predicciones, cada prediccion es de tipo Object[]
        mensajerror = undefined;
        const tiempoInicio : number = ahora();
        let listaTrabajos : Object[]= [];
        //por cada imagen ejecutar prediccion en red neuronal, para que la clasifique
        //manda una lista de trabajos a los esclavos
        //cada imagen y 'la url del maestro' son un trabajo        
        let i:number;
        for(i=0;i<listaImagenes.length;i++){
            listaTrabajos.push({urlmaestro: anfitrionYpuerto, imagenb64:listaImagenes[i]});
        }

        //se distribuyen los trabajos
        //si hay 4 trabajos y 2 esclavos, 2 trabajos por esclavo
        maestro.shouldCatchAll = true;
        let promesaEsclavos : Promise<Object[]> = await maestro.create.scatter('mensajeimagen')
        .data(...listaTrabajos)
        .gather(maestro.slaves.remote)        
        .catch( (e : Error)=>{
            mensajerror=e.message;
            console.log('error al hacer scatter-gather: '+e);
        });
        
        //bloquea la ejecucion hasta que terminen todos los trabajos
        //patron scatter gather de programacion distribuida
        console.log('espera respuestas esclavos');
        let listaResEsclavos: void | Object[] = await promesaEsclavos;
        
        console.log('recibidas predicciones o error');  
        //esclavos.close();//cierra los esclavos, puede que esto no este bien

        const tiempoTotal : number = ahora() - tiempoInicio;
        console.log('Clasificadas en '+Math.floor(tiempoTotal)+'ms');

        //recoge todas las repuestas(y errores) de los esclavos y las guarda en la lista de predicciones
        let numres : number = 0;
        if(listaResEsclavos instanceof Array){
            numres=listaResEsclavos.length;
        }
        else{
            mensajerror = 'listaRespuestas es void';
        }
        let resEsclavo : Object = undefined;
        i=0;
        while(i<numres && mensajerror==undefined){
            resEsclavo=listaResEsclavos[i];
            if(resEsclavo['error']==null){                
                l_predicciones.push(resEsclavo['data']);
            }
            else{
                mensajerror = resEsclavo['error'];
                console.log('error al predecir: '+mensajerror);
            }
            i++;
        }        

        //envia respuesta http
        if(mensajerror==undefined){
            //si no hubo error envia la lista de predicciones al cliente
            let s_json : string = JSON.stringify(l_predicciones);
            respuesta.writeHead(200,{'Content-Type': 'application/json'});
            respuesta.end(s_json);
        }
        else{
            respuesta.writeHead(404,{'Content-Type': 'text/plain'});
            respuesta.write('error');
            respuesta.end('error');
        }
        listasImagenes[s_id]=undefined;//vacia la lista de imagenes del <grupo de solicitud>
    }
}

function enciendeServidorHTTP(){
    //atendedor de peticiones, todas las posibles
    servidorHttp.createServer(function (peticion : servidorHttp.IncomingMessage, respuesta : servidorHttp.ServerResponse) {    
        let urlPeticion: string =(tradURL.parse(peticion.url)).href;
        let anfitrionYpuerto : string = peticion.headers.host;
        //console.log('url pedida: '+urlPeticion);
        if(/.*js$/.test(urlPeticion)){
            console.log('toma js');
            respuesta.writeHead(200,{'Content-Type': 'text/javascript'});
            sistemaArchivos.createReadStream('paginaPrincipal.js').pipe(respuesta);
        }
        else if(/.*json$/.test(urlPeticion)){
            console.log('toma json');//devuelve la matriz de la red neuronal, esta peticion la hace el servidor a si mismo
            respuesta.writeHead(200,{'Content-Type': 'application/json'});
            sistemaArchivos.createReadStream('model.json').pipe(respuesta);
        }
        else if(/group.*-shard1of1$/.test(urlPeticion)){
            //console.log('toma octet');//devuelve los ficheros de datos de la red neuronal, estas peticiones las hace el servidor a si mismo
            respuesta.writeHead(200,{'Content-Type': 'application/octet-stream'});
            //se le quita el caracter barra inclinada
            sistemaArchivos.createReadStream(urlPeticion.substring(1,urlPeticion.length)).pipe(respuesta);
        }
        else if(/.*ico$/.test(urlPeticion)){
            console.log('toma ico');
            respuesta.writeHead(200,{'Content-Type': 'image/ico'});
            sistemaArchivos.createReadStream('favicon.ico').pipe(respuesta);
        }
        else if(/.*subir$/.test(urlPeticion)){  
            atiendeSubir(peticion,respuesta);
        }
        else if(/.*predecir$/.test(urlPeticion)){    
            atiendePredecir(peticion,respuesta,anfitrionYpuerto);     
        }
        else{
            console.log('toma html');//pagina principal, es lo que devuelve por defecto
            respuesta.writeHead(200,{'Content-Type': 'text/html'});
            sistemaArchivos.createReadStream('paginaPrincipal.html').pipe(respuesta);
        }
    }).listen(puerto);
    console.log('escuchando http en: '+puerto);
}

//----------------EJECUCION PRINCIPAL----------------
sistemaArchivos.readFile('dirIPsEsclavos.json', (err : Error, datos : Buffer) => {
    if (err)console.error('error leyendo dirIPsEsclavos.json: '+err);
    let j_datos : Object = JSON.parse(datos.toString());
    //console.log(j_datos);
    let l_IPs : [] = j_datos['lista'];
    if(l_IPs!=undefined){
        let i:number;
        for(i=0;i<l_IPs.length;i++){
            console.log(l_IPs[i]);
            maestro.create.remote.slaves(2, {
                script: 'miesclavo.js',
                host: l_IPs[i]+':3000'
            });
        }
    }
});
//.catch( (e:Error)=>{console.error(e)});

enciendeServidorHTTP();
