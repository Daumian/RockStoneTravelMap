// Arma la carpeta www/ que Capacitor empaqueta dentro de la app Android.
// www/ es contenido generado (está en .gitignore): este script la reconstruye
// a partir de los archivos fuente que sí viven en el repo (index.html, app.js,
// style.css, lugares.json, img/, Carrusel/) y, si existen, de los tiles
// descargados por scripts/download-tiles.js.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WWW = path.join(ROOT, 'www');

const FILES_TO_COPY = ['index.html', 'app.js', 'style.css', 'lugares.json'];
const DIRS_TO_COPY = ['img', 'Carrusel'];
const OPTIONAL_DIRS_TO_COPY = ['tiles']; // generado por download-tiles.js, puede no existir todavía

function copyDirRecursive(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });

for (const file of FILES_TO_COPY) {
    fs.copyFileSync(path.join(ROOT, file), path.join(WWW, file));
}

for (const dir of DIRS_TO_COPY) {
    copyDirRecursive(path.join(ROOT, dir), path.join(WWW, dir));
}

for (const dir of OPTIONAL_DIRS_TO_COPY) {
    const srcDir = path.join(ROOT, dir);
    if (fs.existsSync(srcDir)) {
        copyDirRecursive(srcDir, path.join(WWW, dir));
    } else {
        console.warn(`Aviso: no existe ${dir}/ todavía (corré "npm run download:tiles" antes de empaquetar la app final).`);
    }
}

console.log('www/ lista en', WWW);
