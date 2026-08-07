// ============================================
// SOPORTE OFFLINE: registro del Service Worker
// y descarga completa del mapa de la provincia
// ============================================

// 1. Registrar el Service Worker (agregar cerca del final de app.js, después de loadData())
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker registrado: la app puede funcionar offline.'))
        .catch((err) => console.error('Error registrando Service Worker:', err));
}

// 2. Bounding box de toda la provincia de Mendoza (calculado desde tus lugares + Aconcagua)
const OFFLINE_BBOX = {
    latMin: -34.5869034,
    latMax: -32.5910827,
    lngMin: -69.9237139,
    lngMax: -67.5708536
};

// Rango de zoom a descargar. 6-13 = ~4100 tiles / ~60MB (recomendado).
// Si querés más detalle de calles, subí ZOOM_MAX a 14 (~234MB total).
const OFFLINE_ZOOM_MIN = 6;
const OFFLINE_ZOOM_MAX = 13;

function deg2tile(lat, lng, zoom) {
    const latRad = lat * Math.PI / 180;
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y };
}

function generarListaDeTiles() {
    const urls = [];
    for (let z = OFFLINE_ZOOM_MIN; z <= OFFLINE_ZOOM_MAX; z++) {
        const nw = deg2tile(OFFLINE_BBOX.latMax, OFFLINE_BBOX.lngMin, z);
        const se = deg2tile(OFFLINE_BBOX.latMin, OFFLINE_BBOX.lngMax, z);
        for (let x = nw.x; x <= se.x; x++) {
            for (let y = nw.y; y <= se.y; y++) {
                urls.push(`https://a.tile.openstreetmap.fr/hot/${z}/${x}/${y}.png`);
            }
        }
    }
    return urls;
}

// 3. Función que descarga todo el mapa offline con barra de progreso simple
window.descargarMapaOffline = async function () {
    if (!('caches' in window)) {
        alert('Tu navegador no soporta descarga offline.');
        return;
    }

    const urls = generarListaDeTiles();
    const total = urls.length;
    const btn = document.getElementById('btnDescargarOffline');
    const cache = await caches.open('mapa-tiles-v1');

    let hechos = 0;
    const LOTE = 20; // descarga en tandas para no saturar la red

    for (let i = 0; i < urls.length; i += LOTE) {
        const tanda = urls.slice(i, i + LOTE);
        await Promise.all(tanda.map(async (url) => {
            try {
                const yaEsta = await cache.match(url);
                if (!yaEsta) {
                    const resp = await fetch(url);
                    if (resp.ok) await cache.put(url, resp);
                }
            } catch (e) {
                // Si falla un tile puntual, seguimos con el resto
            }
            hechos++;
            if (btn) {
                const pct = Math.round((hechos / total) * 100);
                btn.innerText = `Descargando mapa... ${pct}%`;
            }
        }));
    }

    if (btn) {
        btn.innerText = '✅ Mapa descargado';
        btn.disabled = true;
    }
    alert('¡Listo! El mapa de Mendoza ya está disponible sin conexión.');
};