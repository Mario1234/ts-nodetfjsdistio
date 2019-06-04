"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var tensorflow = require("@tensorflow/tfjs-node");
var imagenet_classes_1 = require("./imagenet_classes");
var libreriaCanvas = require("canvas");
var ahora = require("performance-now");
var FuncsRedNeur = /** @class */ (function () {
    function FuncsRedNeur() {
        this.TAMANIO_IMAGEN = 224; //120
        this.TOPX_PREDICCIONES = 10;
        this.b_modeloCargado = false;
    }
    //metodo general que recibe una imagen y la devuelve clasificada utilizando mobilenet con tensorflow
    FuncsRedNeur.prototype.predecirConModeloMobilenet = function (s_imagenBase64, anfitrionYpuerto) {
        return __awaiter(this, void 0, void 0, function () {
            var ancho, alto, canvas, ctx, imagen, elementoCanvas, camino, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        ancho = this.TAMANIO_IMAGEN;
                        alto = this.TAMANIO_IMAGEN;
                        canvas = libreriaCanvas.createCanvas(ancho, alto);
                        ctx = canvas.getContext('2d');
                        imagen = new libreriaCanvas.Image;
                        imagen.src = s_imagenBase64;
                        ctx.drawImage(imagen, 0, 0, ancho, alto);
                        elementoCanvas = ctx.canvas;
                        if (!!this.b_modeloCargado) return [3 /*break*/, 2];
                        //el servidor pide la matriz de la red neuronal a si mismo
                        console.log('Cargando modelo...');
                        camino = 'http://' + anfitrionYpuerto + '/model.json';
                        console.log(camino);
                        _a = this;
                        return [4 /*yield*/, tensorflow.loadLayersModel(camino)];
                    case 1:
                        _a.modeloMobileNet = _b.sent();
                        console.log('Modelo cargado');
                        this.b_modeloCargado = true;
                        //calienta el modelo
                        this.modeloMobileNet.predict(tensorflow.zeros([1, this.TAMANIO_IMAGEN, this.TAMANIO_IMAGEN, 3])); //.dispose();
                        _b.label = 2;
                    case 2: 
                    //predice, se le pasa el canvas con la imagen pintada
                    return [2 /*return*/, this.predecir(elementoCanvas)];
                }
            });
        });
    };
    FuncsRedNeur.prototype.predecir = function (elementoCanvas) {
        return __awaiter(this, void 0, void 0, function () {
            var mapaProbabilidades;
            var _this = this;
            return __generator(this, function (_a) {
                mapaProbabilidades = tensorflow.tidy(function () {
                    console.log('Convolucionando imagen');
                    // tf.fromPixels() devuelve el tensor de los pixeles de la imagen (imagen en bytes para mi)   
                    var imagenBytes = tensorflow.browser.fromPixels(elementoCanvas).toFloat();
                    var desplazamiento = tensorflow.scalar(127.5);
                    // Normaliza la imagen de [0, 255] a [-1, 1]
                    //tensorflow.Tensor<tensorflow.Rank.R3>
                    var imagenNormalizada = imagenBytes.sub(desplazamiento).div(desplazamiento);
                    //redimensiona la imagen para que tenga solo una dimension y pueda meterla en la red neuronal
                    //tensorflow.ShapeMap[tensorflow.Rank.R2] = [this.TAMANIO_IMAGEN, this.TAMANIO_IMAGEN];
                    var siluetaMapa = [1, _this.TAMANIO_IMAGEN, _this.TAMANIO_IMAGEN, 3];
                    var imagenUnaDim = imagenNormalizada.reshape(siluetaMapa);
                    console.log('Imagen convolucionada');
                    console.log('Comienza prediccion...');
                    //La red predice la clase de la imagen, llamada a la libreria TensorFlow
                    return _this.modeloMobileNet.predict(imagenUnaDim);
                });
                //predecir devuelve la promesa prediceMasProbables(medir tiempo y traduce clases)
                //prediceMasProbables espera que se resuelva la promesa dameXPrimerasPredicciones (traduce nombres de clases)
                //dameXPrimerasPredicciones espera que se resuelva la promesa mapaProbabilidades.data() (espera fin de la prediccion con mobilenet)
                //mapaProbabilidades.data() espera a que termine el modeloMobileNet.predict (hace la prediccion con mobilenet)
                return [2 /*return*/, this.dameXPrimerasPredicciones(mapaProbabilidades, this.TOPX_PREDICCIONES)];
            });
        });
    };
    FuncsRedNeur.prototype.dameXPrimerasPredicciones = function (mapaProbabilidades, topX) {
        return __awaiter(this, void 0, void 0, function () {
            var tiempoInicio, valoresMapa, tiempoTotal, valoresIndices, i, objProb, topXValues, topXIndices, i, topClasesProbs, i, promesaClases;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('Prediciendo...');
                        tiempoInicio = ahora();
                        return [4 /*yield*/, mapaProbabilidades.data()];
                    case 1:
                        valoresMapa = _a.sent();
                        console.log('Prediccion terminada');
                        tiempoTotal = ahora() - tiempoInicio;
                        console.log("Hecho en " + Math.floor(tiempoTotal) + "ms");
                        valoresIndices = [];
                        for (i = 0; i < valoresMapa.length; i++) {
                            objProb = { valor: valoresMapa[i], indice: i };
                            valoresIndices.push(objProb);
                        }
                        valoresIndices.sort(function (a, b) {
                            return b.valor - a.valor;
                        });
                        topXValues = new Float32Array(topX);
                        topXIndices = new Int32Array(topX);
                        for (i = 0; i < topX; i++) {
                            topXValues[i] = valoresIndices[i].valor;
                            topXIndices[i] = valoresIndices[i].indice;
                        }
                        topClasesProbs = [];
                        for (i = 0; i < topXIndices.length; i++) {
                            topClasesProbs.push({
                                nombreClase: imagenet_classes_1.IMAGENET_CLASSES[topXIndices[i]],
                                probabilidad: topXValues[i]
                            });
                        }
                        promesaClases = new Promise(function (resolve, reject) { resolve(topClasesProbs); });
                        return [2 /*return*/, promesaClases];
                }
            });
        });
    };
    return FuncsRedNeur;
}());
exports.FuncsRedNeur = FuncsRedNeur;
var ObjetoProbabilidad = /** @class */ (function () {
    function ObjetoProbabilidad() {
    }
    return ObjetoProbabilidad;
}());
