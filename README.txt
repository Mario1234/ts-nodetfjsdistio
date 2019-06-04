Solo funciona en sistemas operativos de 64bits:
instalar node
desinstalar python 3.6
instalar python 2.7
abrir consola como administrador
cd "carpeta/del/proyecto"
npm install -g --production windows-build-tools
npm install -g node-gyp
npm install -g @tensorflow/tfjs-node
npm install -g ts-node
npm install -g typescript
npm install -g performance-now
npm install -g canvas
npm install -g rollup
npm install -g sharp
npm install -g dist.io
tsc miesclavo.ts

instalar lo mismo en cada maquina esclavo
abrir consola en cada maquina esclavo:
distio-serve --port=3000

aniadir las dir ips de cada maquina esclavo en el archivo dirIPsEsclavos.json

en la consola del maestro ejecutar:
ts-node miservidor.ts
