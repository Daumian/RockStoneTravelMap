const uiLabels = {
    itineraryTitle: { es: "📋 Cosas por hacer", en: "📋 My Bucket List", pt: "📋 Coisas a fazer" },
    emptyMsg: { es: "Tu lista está vacía. ¡Añade lugares desde el mapa!", en: "Your list is empty. Add places from the map!", pt: "Sua lista está vazia. Adicione lugares do mapa!" },
    startBtn: { es: "Explorar Mapa", en: "Explore Map", pt: "Explorar Mapa" }
};
// 1. DICCIONARIO DE LA PÁGINA (Puedes agregar aquí todas las frases que necesites)
const pageTranslations = {
    // Textos del Login
    "login_desc": { es: "Ingresa tu código de acceso exclusivo:", en: "Enter your exclusive access code:", pt: "Insira seu código de acesso exclusivo:" },
    "login_btn": { es: "Ingresar", en: "Enter", pt: "Entrar" },
    "login_error": { es: "Código incorrecto. Inténtalo de nuevo.", en: "Incorrect code. Please try again.", pt: "Código incorreto. Tente novamente." },
    "login_placeholder": { es: "Código de acceso...", en: "Access code...", pt: "Código de acesso..." },
    
    // Textos repetidos del Carrusel
    "card_desde": { es: "Desde", en: "From", pt: "A partir de" },
    "card_personas": { es: "por 2 personas", en: "for 2 people", pt: "para 2 pessoas" },
    "card_traslados": { es: "🚗 Incluye traslados", en: "🚗 Includes transfers", pt: "🚗 Inclui traslados" },
    "card_consultar": { es: "Consultar por WhatsApp", en: "Inquire via WhatsApp", pt: "Consultar via WhatsApp" },
    
    // Si quieres traducir los títulos de las tarjetas, los agregas así:
    "lujan_titulo": { es: "Tour Premium por Bodegas", en: "Premium Winery Tour", pt: "Tour Premium por Vinícolas" }
};

// 2. FUNCIÓN PARA TRADUCIR EL HTML ESTÁTICO
function translateStaticUI() {
    // Traducir textos normales
    document.querySelectorAll('[data-i18n]').forEach(elemento => {
        const key = elemento.getAttribute('data-i18n');
        if (pageTranslations[key] && pageTranslations[key][currentLang]) {
            elemento.innerText = pageTranslations[key][currentLang];
        }
    });

    // Traducir los placeholders (el texto fantasma de los inputs)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(input => {
        const key = input.getAttribute('data-i18n-placeholder');
        if (pageTranslations[key] && pageTranslations[key][currentLang]) {
            input.placeholder = pageTranslations[key][currentLang];
        }
    });
}
const map = L.map('map').setView([-32.8895, -68.845], 13);
let currentLang = 'es';
let markerMap = new Map();
let selectedPlaces = new Set(); 
let activeCategoryFilter = null; // Null significa "mostrar todo"
let geoData = { categorias: {}, lugares: [] };

L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
}).addTo(map);

function getIconByCategoria(cat) {
    // Definimos colores elegantes para cada categoría
    const colores = {
        "puntos_de_interes": "#4A90E2", // Azul claro
        "museos": "#4A90E2", 
        "hoteles_centro": "#1b2a4a", // Azul marino de tu marca
        "restaurantes": "#E67E22", // Naranja
        "restaurantes_estrella_michelin": "#F1C40F", // Dorado
        "tiendas": "#9B59B6", // Púrpura
        "tour_alta_montana": "#7F8C8D", // Gris montaña
        "lujan_de_cuyo_bodegas": "#8B0000", // Rojo vino
        "maipu_bodegas": "#8B0000", // Rojo vino
        "valle_de_uco__(bodegas)": "#8B0000", // Rojo vino
        "olivicolas": "#C3CE94" // Verde oliva de tu marca
    };
    
    // Si la categoría no está en la lista, usa el verde oliva por defecto
    const color = colores[cat] || "#C3CE94"; 
    
    // Creamos el nuevo pin circular con CSS
    return L.divIcon({
        className: 'custom-premium-pin',
        html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4); transition: transform 0.2s;"></div>`,
        iconSize: [16, 16], 
        iconAnchor: [8, 8], // Centra el círculo exacto en la coordenada
        popupAnchor: [0, -10] // Abre el cartelito justo arriba del círculo
    });
}


function updateMapMarkers() {
    markerMap.forEach((marker, lugar) => {
        // Si no hay filtro, o si la categoría coincide con el filtro activo
        if (activeCategoryFilter === null || lugar.categoria === activeCategoryFilter) {
            if (!map.hasLayer(marker)) {
                marker.addTo(map); // Lo mostramos en el mapa
            }
        } else {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker); // Lo quitamos del mapa temporalmente
            }
        }
    });
}

window.activarModoMapa = function(event) {
    // 1. Evita el salto brusco del link
    event.preventDefault(); 

    // 2. Hace el deslizamiento suave hacia el mapa
    document.getElementById('map-experience').scrollIntoView({ behavior: 'smooth' });

    // 3. Simplemente actualizamos el mapa para que no salgan zonas grises, 
    // PERO sin ocultar nada ni bloquear el scroll.
    setTimeout(() => {
        map.invalidateSize();
    }, 600);
};

function loadData() {
    fetch('lugares.json?v=' + new Date().getTime())
        .then(response => {
            if (!response.ok) throw new Error("No se pudo cargar lugares.json");
            return response.json();
        })
        .then(data => {
            if (data.mapa_mendoza) {
             const categoryMapping = {
    "puntos_de_interes": { "clase": "color-puntos", "es": "Puntos de Interés", "en": "Points of Interest", "pt": "Pontos de Interesse" },
    "museos": { "clase": "color-puntos", "es": "Museos", "en": "Museums", "pt": "Museus" },
    "hoteles_centro": { "clase": "color-hoteles", "es": "Hoteles", "en": "Hotels", "pt": "Hotéis" },
    "restaurantes": { "clase": "color-restaurantes", "es": "Restaurantes", "en": "Restaurants", "pt": "Restaurantes" },
    "restaurantes_estrella_michelin": { "clase": "color-michelin", "es": "Estrellas Michelin", "en": "Michelin Stars", "pt": "Estrelas Michelin" },
    "tiendas": { "clase": "color-tiendas", "es": "Tiendas", "en": "Shops", "pt": "Lojas" },
    "tour_alta_montana": { "clase": "color-alta-montana", "es": "Alta Montaña", "en": "High Mountain", "pt": "Alta Montanha" },
    "lujan_de_cuyo_bodegas": { "clase": "color-lujan", "es": "Zona Luján", "en": "Luján Area", "pt": "Zona Luján" },
    "maipu_bodegas": { "clase": "color-maipu", "es": "Zona Maipú", "en": "Maipú Area", "pt": "Zona Maipú" },
    "valle_de_uco__(bodegas)": { "clase": "color-uco", "es": "Valle de Uco", "en": "Uco Valley", "pt": "Valle de Uco" },
    "olivicolas": { "clase": "color-olivicolas", "es": "Olivícolas", "en": "Olive Farms", "pt": "Olivícolas" }
};
                geoData.categorias = categoryMapping;
                geoData.lugares = [];

                for (const cat in data.mapa_mendoza) {
                    data.mapa_mendoza[cat].forEach((lugar, index) => {
                        let lat = parseFloat(lugar.latitud);
                        let lng = parseFloat(lugar.longitud);
                        
                        if (isNaN(lat) || isNaN(lng)) { lat = -32.8895; lng = -68.845; }

                        // LÓGICA NUEVA PARA LAS FOTOS
                        let rutasFotos = [];
                        if (lugar.imagenA) {
                            rutasFotos.push(`img/map_img/${lugar.imagenA}`);
                        }
                        if (lugar.imagenB) {
                            rutasFotos.push(`img/map_img/${lugar.imagenB}`);
                        }

                        geoData.lugares.push({
                            id: `${cat}_${index}`,
                            categoria: cat,
                            coordenadas: [lat, lng],
                            nombre: { es: lugar.nombre, en: lugar.nombre, pt: lugar.nombre },
                            resena: { 
                                es: lugar.descripcion || "Sin descripción disponible.", 
                                en: lugar.descripcion || "No description available.", 
                                pt: lugar.descripcion || "Sem descrição disponível." 
                            },
                            fotos: rutasFotos // ASIGNAMOS EL ARREGLO CON LAS RUTAS
                        });
                    });
                }
            } else {
                geoData = data; 
            }
            
            buildInterface(); 
        })
        .catch(error => {
            console.error("Error al cargar JSON:", error);
            document.getElementById('categoriesContainer').innerHTML = `<p style="padding: 20px; color: #e53e3e; font-weight: bold;">Error al cargar datos. ¿Estás usando un servidor local?</p>`;
        });
}

function validateLogin() {
    const input = document.getElementById('passInput');
    const overlay = document.getElementById('login-overlay');
    const box = document.getElementById('loginBox');
    const error = document.getElementById('errorMsg');
    
    // Validamos pasando todo a minúsculas
    if (input.value.toLowerCase().trim() === 'rockstonemdz'.toLowerCase()) {
        // Login correcto: ocultamos el overlay
        overlay.classList.add('hidden');
    } else {
        // Login incorrecto: mostramos error y sacudimos la caja
        error.style.display = 'block';
        box.classList.add('shake');
        
        // Limpiamos el input para que vuelva a intentar
        input.value = '';
        input.focus();
        
        // Removemos la clase shake después de que termine la animación para poder repetirla
        // Agregalo al final de buildInterface() o en un setTimeout
        setTimeout(() => {
            map.invalidateSize();
        }, 400);
    }
}

function togglePasswordVisibility() {
    const input = document.getElementById('passInput');
    const btn = document.getElementById('togglePassBtn');
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerText = '🙈'; // Cambia el ícono para indicar que se puede ocultar
    } else {
        input.type = 'password';
        btn.innerText = '👁️'; // Cambia el ícono para indicar que se puede ver
    }
    
    // Devolvemos el foco al input para que el usuario pueda seguir escribiendo de una
    input.focus();
}


function checkEnter(event) {
    if (event.key === 'Enter') {
        validateLogin();
    }
}


function buildInterface() {
    document.getElementById('itineraryTitle').innerText = uiLabels.itineraryTitle[currentLang];
    document.getElementById('startBtn').innerText = uiLabels.startBtn[currentLang];

    const container = document.getElementById('categoriesContainer');
    container.innerHTML = ''; 

    markerMap.forEach(marker => map.removeLayer(marker));
    markerMap.clear();

    for (const [key, catInfo] of Object.entries(geoData.categorias)) {
        const lugaresFiltrados = geoData.lugares.filter(l => l.categoria === key);
        if (lugaresFiltrados.length === 0) continue;

        const section = document.createElement('div');
        section.className = 'category-section';

        // NUEVO: Contenedor para el título (acordeón) y el botón (filtro)
        const headerContainer = document.createElement('div');
        headerContainer.className = 'category-header-container';

        // Título que ahora funciona como Acordeón
        const title = document.createElement('h3');
        title.className = `category-title ${catInfo.clase}`;
        // Por defecto las dejamos abiertas (▼), si quieres que arranquen cerradas usa ▶
        title.innerHTML = `<span class="accordion-icon">▼</span> ${catInfo[currentLang]}`;
        
        // Botón de Filtro Exclusivo
        const filterBtn = document.createElement('button');
        filterBtn.className = 'map-filter-btn';
        filterBtn.innerHTML = '📍 Ver en mapa';
        // Si al cambiar de idioma este filtro estaba activo, lo mantenemos pintado
        if (activeCategoryFilter === key) filterBtn.classList.add('active');

        headerContainer.appendChild(title);
        headerContainer.appendChild(filterBtn);
        section.appendChild(headerContainer);

        const list = document.createElement('ul');
        list.className = 'places-list';
        list.classList.add('collapsed');    
        title.querySelector('.accordion-icon').innerText = '▶';

        lugaresFiltrados.forEach(lugar => {
            const item = document.createElement('li');
            item.className = 'place-item';
            item.innerText = lugar.nombre[currentLang];
            item.onclick = () => {
                const marker = markerMap.get(lugar);
                if (marker) { map.setView(lugar.coordenadas, 14); marker.openPopup(); }
            };
            list.appendChild(item);

            let fotosHTML = '';
            if (lugar.fotos && lugar.fotos.length > 0) {
                lugar.fotos.forEach(fotoUrl => { fotosHTML += `<img src="${fotoUrl}">`; });
            }

            const popupTemplate = `
                <div class="popup-content">
                    <div class="popup-header-row">
                        <div class="popup-title">${lugar.nombre[currentLang]}</div>
                        <button class="add-itinerary-btn" onclick="addToItinerary('${lugar.id}')">+</button>
                    </div>
                    <div class="popup-category ${catInfo.clase}">${catInfo[currentLang]}</div>
                    <p class="popup-review">${lugar.resena[currentLang]}</p>
                    ${fotosHTML ? `<div class="popup-gallery">${fotosHTML}</div>` : ''}
                </div>
            `;

            const marker = L.marker(lugar.coordenadas, { icon: getIconByCategoria(key) })
                            .bindPopup(popupTemplate); // Nota: Ya no le hacemos .addTo(map) aquí directamente
            
            markerMap.set(lugar, marker);
        });

        section.appendChild(list);
        container.appendChild(section);

        // --- LÓGICA DE EVENTOS (ACORDEÓN Y FILTRO) ---

        // 1. Al tocar el Título (Acordeón)
        title.onclick = () => {
            list.classList.toggle('collapsed');
            const icon = title.querySelector('.accordion-icon');
            if (list.classList.contains('collapsed')) {
                icon.innerText = '▶'; // Flecha cerrada
            } else {
                icon.innerText = '▼'; // Flecha abierta
            }
        };

        // 2. Al tocar el Botón de Filtro
        filterBtn.onclick = () => {
            if (activeCategoryFilter === key) {
                // Si lo toco y ya estaba activo, desactivo todo (muestro todos los marcadores)
                activeCategoryFilter = null;
            } else {
                // Si toco uno nuevo, filtro para ver SOLO este
                activeCategoryFilter = key;
            }

            // Actualizo los colores de los botones
            document.querySelectorAll('.map-filter-btn').forEach(btn => btn.classList.remove('active'));
            if (activeCategoryFilter === key) {
                filterBtn.classList.add('active');
            }

            // Llamo a la función que esconde/muestra en el mapa
            updateMapMarkers();
        };

        updateMapMarkers();
    }
    
    updateItineraryUI();
    filterPlaces(); // Añadido para que mantenga el filtro al cambiar de idioma
}

window.addToItinerary = function(id) {
    selectedPlaces.add(id);
    updateItineraryUI();
    map.closePopup(); 
};

window.removeFromItinerary = function(id) {
    selectedPlaces.delete(id);
    updateItineraryUI();
};

function updateItineraryUI() {
    const listContainer = document.getElementById('itineraryList');
    listContainer.innerHTML = '';

    if (selectedPlaces.size === 0) {
        listContainer.innerHTML = `<li class="empty-msg">${uiLabels.emptyMsg[currentLang]}</li>`;
        return;
    }

    selectedPlaces.forEach(id => {
        const lugarData = geoData.lugares.find(l => l.id === id);
        if (lugarData) {
            const li = document.createElement('li');
            li.className = 'itinerary-item';
            li.innerHTML = `
                <span>${lugarData.nombre[currentLang]}</span>
                <button class="remove-btn" onclick="removeFromItinerary('${lugarData.id}')">×</button>
            `;
            listContainer.appendChild(li);
        }
    });
}

function filterPlaces() {
    const searchInput = document.getElementById('menuSearch');
    if (!searchInput) return; // Validación por si el input aún no existe
    
    const query = searchInput.value.toLowerCase().trim();
    const sections = document.querySelectorAll('.category-section');

    sections.forEach(section => {
        const items = section.querySelectorAll('.place-item');
        let hasVisibleItems = false;

        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            if (text.includes(query)) {
                item.style.display = 'block'; 
                hasVisibleItems = true;
            } else {
                item.style.display = 'none';  
            }
        });

        if (hasVisibleItems) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
}
// Búscala y déjala así:
function changeLanguage() {
    currentLang = document.getElementById('langSelect').value;
    buildInterface(); 
    translateFullPage(); // Agregamos esta línea para que traduzca el resto de la página
}

// Opcional pero recomendado: Llama a translateStaticUI() justo antes de la última línea que dice `loadData();` para que la página arranque traducida si cambias el idioma por defecto.
translateStaticUI();
loadData();
// ==========================================
// TRADUCTOR AUTOMÁTICO (SIN TOCAR HTML)
// ==========================================

const uiTranslations = {
    es: {
        loginDesc: "Ingresa tu código de acceso exclusivo:",
        loginBtn: "Ingresar",
        loginPlaceholder: "Código de acceso...",
        loginError: "Código incorrecto. Inténtalo de nuevo.",
        cardDesde: "Desde",
        cardPersonas: "por 2 personas",
        cardTraslados: "🚗 Incluye traslados",
        cardConsultar: "Consultar por WhatsApp",
        startBtnBanner: "Explorar Mapa"
    },
    en: {
        loginDesc: "Enter your exclusive access code:",
        loginBtn: "Enter",
        loginPlaceholder: "Access code...",
        loginError: "Incorrect code. Please try again.",
        cardDesde: "From",
        cardPersonas: "for 2 people",
        cardTraslados: "🚗 Includes transfers",
        cardConsultar: "Inquire via WhatsApp",
        startBtnBanner: " Explore Map"
    },
    pt: {
        loginDesc: "Insira seu código de acesso exclusivo:",
        loginBtn: "Entrar",
        loginPlaceholder: "Código de acesso...",
        loginError: "Código incorreto. Tente novamente.",
        cardDesde: "A partir de",
        cardPersonas: "para 2 pessoas",
        cardTraslados: "🚗 Inclui traslados",
        cardConsultar: "Consultar via WhatsApp",
        startBtnBanner: " Explorar Mapa"
    }
};

function translateFullPage() {
    const texts = uiTranslations[currentLang];
    
    // 1. Traducir el Login
    const loginDesc = document.querySelector('#loginBox p');
    if (loginDesc) loginDesc.innerText = texts.loginDesc;
    
    // El botón de ingresar es el primer botón dentro de loginBox que no tiene ID
    const loginBtn = document.querySelector('#loginBox button:not(#togglePassBtn)');
    if (loginBtn) loginBtn.innerText = texts.loginBtn;
    
    const passInput = document.getElementById('passInput');
    if (passInput) passInput.placeholder = texts.loginPlaceholder;
    
    const errorMsg = document.getElementById('errorMsg');
    if (errorMsg) errorMsg.innerText = texts.loginError;

    // 2. Traducir el botón central de Explorar Mapa
    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.innerText = texts.startBtnBanner;
    
    // 3. Traducir TODO el carrusel de golpe
    document.querySelectorAll('.price-label').forEach(el => el.innerText = texts.cardDesde);
    document.querySelectorAll('.price-note').forEach(el => el.innerText = texts.cardPersonas);
    document.querySelectorAll('.promo-code').forEach(el => el.innerText = texts.cardTraslados);
    document.querySelectorAll('.promo-btn').forEach(el => el.innerText = texts.cardConsultar);
}