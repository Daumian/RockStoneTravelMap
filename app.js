const uiLabels = {
    itineraryTitle: { es: "📋 Cosas por hacer", en: "📋 My Bucket List", pt: "📋 Coisas a fazer" },
    emptyMsg: { es: "Tu lista está vacía. ¡Añade lugares desde el mapa!", en: "Your list is empty. Add places from the map!", pt: "Sua lista está vazia. Adicione lugares do mapa!" },
    startBtn: { es: "Explorar Mapa", en: "Explore Map", pt: "Explorar Mapa" }
};

const map = L.map('map').setView([-32.8895, -68.845], 11);
let currentLang = 'es';
let markerMap = new Map();
let selectedPlaces = new Set(); 

let geoData = { categorias: {}, lugares: [] };

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap' }).addTo(map);

function getIconByCategoria(cat) {
    const hueShift = { "puntos_de_interes": 200, "museos": 200, "hoteles_centro": 280, "restaurantes": 30, "restaurantes_estrella_michelin": 0, "tiendas": 160, "tour_alta_montana": 230, "bodegas_lujan": 120, "bodegas_maipu": 210, "bodegas_valle_uco": 45, "olivicolas": 80 };
    const shift = hueShift[cat] !== undefined ? hueShift[cat] : 0;
    return L.divIcon({
        className: `custom-pin-${cat}`,
        html: `<img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" style="filter: hue-rotate(${shift}deg);">`,
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
    });
}

function loadData() {
    fetch('lugares.json')
        .then(response => {
            if (!response.ok) throw new Error("No se pudo cargar lugares.json");
            return response.json();
        })
        .then(data => {
            if (data.mapa_mendoza) {
                const categoryMapping = {
                    "puntos_de_interes": { "clase": "color-puntos", "es": "📌 Puntos de Interés", "en": "📌 Points of Interest", "pt": "📌 Pontos de Interesse" },
                    "museos": { "clase": "color-puntos", "es": "🏛️ Museos", "en": "🏛️ Museums", "pt": "🏛️ Museus" },
                    "hoteles_centro": { "clase": "color-hoteles", "es": "🏨 Hoteles", "en": "🏨 Hotels", "pt": "🏨 Hotéis" },
                    "restaurantes": { "clase": "color-restaurantes", "es": "🍴 Restaurantes", "en": "🍴 Restaurants", "pt": "🍴 Restaurantes" },
                    "restaurantes_estrella_michelin": { "clase": "color-michelin", "es": "⭐ Estrellas Michelin", "en": "⭐ Michelin Stars", "pt": "⭐ Estrelas Michelin" },
                    "tiendas": { "clase": "color-tiendas", "es": "🛍️ Tiendas", "en": "🛍️ Shops", "pt": "🛍️ Lojas" },
                    "tour_alta_montana": { "clase": "color-alta-montana", "es": "🏔️ Alta Montaña", "en": "🏔️ High Mountain", "pt": "🏔️ Alta Montanha" },
                    "bodegas_lujan": { "clase": "color-lujan", "es": "🍷 Zona Luján", "en": "🍷 Luján Area", "pt": "🍷 Zona Luján" },
                    "bodegas_maipu": { "clase": "color-maipu", "es": "🍷 Zona Maipú", "en": "🍷 Maipú Area", "pt": "🍷 Zona Maipú" },
                    "bodegas_valle_uco": { "clase": "color-uco", "es": "🍷 Valle de Uco", "en": "🍷 Valle de Uco", "pt": "🍷 Valle de Uco" },
                    "olivicolas": { "clase": "color-olivicolas", "es": "🫒 Olivícolas", "en": "🫒 Olive Farms", "pt": "🫒 Olivícolas" }
                };

                geoData.categorias = categoryMapping;
                geoData.lugares = [];

                for (const cat in data.mapa_mendoza) {
                    data.mapa_mendoza[cat].forEach((lugar, index) => {
                        let lat = parseFloat(lugar.latitud);
                        let lng = parseFloat(lugar.longitud);
                        
                        if (isNaN(lat) || isNaN(lng)) { lat = -32.8895; lng = -68.845; }

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
                            fotos: [] 
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

        const title = document.createElement('h3');
        title.className = `category-title ${catInfo.clase}`;
        title.innerText = catInfo[currentLang];
        section.appendChild(title);

        const list = document.createElement('ul');
        list.className = 'places-list';

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
                            .bindPopup(popupTemplate)
                            .addTo(map);
            
            markerMap.set(lugar, marker);
        });

        section.appendChild(list);
        container.appendChild(section);
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

function changeLanguage() {
    currentLang = document.getElementById('langSelect').value;
    buildInterface();
}

loadData();