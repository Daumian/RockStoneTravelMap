// Descarga UNA VEZ los tiles del mapa (estilo CARTO Voyager: minimalista,
// sin iconos de comercios, pero con colores/verdes en vez de todo blanco)
// y los deja en tiles/{z}/{x}/{y}.png para que build-www.js los empaquete
// dentro de la app. Pensado para correr en el runner de GitHub Actions
// (ver .github/workflows/build-apk.yml), no en las tablets.
//
// Dos niveles de detalle:
//  - Toda la provincia de Mendoza, zoom 6-15 (navegación y ubicación general).
//  - Zonas puntuales con muchos lugares cargados, zoom 16 (detalle de calle).
//
// Es resumible: si un tile ya existe en disco, no se vuelve a pedir. Eso es
// lo que permite cachear la carpeta tiles/ entre builds de CI y no volver a
// golpear el servidor gratuito salvo que cambiemos el área/zoom.

const fs = require('fs');
const path = require('path');
const https = require('https');

const TILES_DIR = path.join(__dirname, '..', 'tiles');
const TILE_SERVER = 'https://a.basemaps.cartocdn.com/rastertiles/voyager';
const USER_AGENT = 'RockStoneTravelMapApp/1.0 (offline map build; contacto: daumianruiz@gmail.com)';
const CONCURRENCY = 8; // conexiones simultáneas: moderado a propósito, es un servidor gratuito comunitario

// Provincia completa: navegación general entre zonas.
const ZONA_PROVINCIA = { latMin: -34.6, latMax: -32.6, lngMin: -70.0, lngMax: -67.5, zMin: 6, zMax: 15 };

// Zonas con concentración real de lugares cargados: detalle de calle.
const ZONAS_DETALLE = [
    { nombre: 'Gran Mendoza / Centro', latMin: -32.97, latMax: -32.85, lngMin: -68.90, lngMax: -68.78, zMin: 16, zMax: 16 },
    { nombre: 'Luján de Cuyo (bodegas)', latMin: -33.20, latMax: -32.95, lngMin: -68.95, lngMax: -68.75, zMin: 16, zMax: 16 },
    { nombre: 'Maipú (bodegas)', latMin: -33.05, latMax: -32.95, lngMin: -68.82, lngMax: -68.72, zMin: 16, zMax: 16 },
    { nombre: 'Valle de Uco (bodegas)', latMin: -33.65, latMax: -33.20, lngMin: -69.35, lngMax: -69.00, zMin: 16, zMax: 16 },
];

function deg2tile(lat, lng, zoom) {
    const latRad = (lat * Math.PI) / 180;
    const n = 2 ** zoom;
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
    return { x, y };
}

function tilesForZona(zona) {
    const tiles = [];
    for (let z = zona.zMin; z <= zona.zMax; z++) {
        const nw = deg2tile(zona.latMax, zona.lngMin, z);
        const se = deg2tile(zona.latMin, zona.lngMax, z);
        for (let x = nw.x; x <= se.x; x++) {
            for (let y = nw.y; y <= se.y; y++) {
                tiles.push({ z, x, y });
            }
        }
    }
    return tiles;
}

function descargarTile(z, x, y) {
    return new Promise((resolve) => {
        const destDir = path.join(TILES_DIR, String(z), String(x));
        const destFile = path.join(destDir, `${y}.png`);

        if (fs.existsSync(destFile)) {
            resolve('cache');
            return;
        }

        const url = `${TILE_SERVER}/${z}/${x}/${y}.png`;
        https
            .get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
                if (res.statusCode !== 200) {
                    res.resume();
                    resolve('error');
                    return;
                }
                fs.mkdirSync(destDir, { recursive: true });
                const tmpFile = `${destFile}.tmp`;
                const fileStream = fs.createWriteStream(tmpFile);
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close(() => {
                        fs.renameSync(tmpFile, destFile);
                        resolve('ok');
                    });
                });
            })
            .on('error', () => resolve('error'));
    });
}

async function descargarEnLotes(tiles) {
    let hechos = 0;
    let descargados = 0;
    let enCache = 0;
    let errores = 0;
    const total = tiles.length;

    for (let i = 0; i < tiles.length; i += CONCURRENCY) {
        const lote = tiles.slice(i, i + CONCURRENCY);
        const resultados = await Promise.all(lote.map((t) => descargarTile(t.z, t.x, t.y)));
        for (const r of resultados) {
            if (r === 'ok') descargados++;
            else if (r === 'cache') enCache++;
            else errores++;
        }
        hechos += lote.length;
        if (hechos % 500 < CONCURRENCY) {
            process.stdout.write(`  ${hechos}/${total} (nuevos: ${descargados}, cache: ${enCache}, errores: ${errores})\n`);
        }
    }
    return { descargados, enCache, errores };
}

async function main() {
    fs.mkdirSync(TILES_DIR, { recursive: true });

    const zonas = [{ nombre: 'Provincia de Mendoza', ...ZONA_PROVINCIA }, ...ZONAS_DETALLE];
    let totalTiles = 0;
    for (const zona of zonas) totalTiles += tilesForZona(zona).length;

    console.log(`Total de tiles a asegurar: ${totalTiles}`);

    for (const zona of zonas) {
        const tiles = tilesForZona(zona);
        console.log(`\n== ${zona.nombre} (zoom ${zona.zMin}-${zona.zMax}, ${tiles.length} tiles) ==`);
        const r = await descargarEnLotes(tiles);
        console.log(`   -> nuevos: ${r.descargados}, ya en cache: ${r.enCache}, errores: ${r.errores}`);
    }

    console.log('\nListo. Tiles en', TILES_DIR);
}

main();
