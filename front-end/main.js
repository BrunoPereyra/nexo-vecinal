const API_URL = "https://deploy.pinkker.tv/9000";
const TOKEN = 'Bearer TU_TOKEN_DE_PRUEBA';

const tagsContainer = document.getElementById('tags-container');
const searchBtn = document.getElementById('search-btn');
const resultsContainer = document.getElementById('results-container');
const featuredContainer = document.getElementById('featured-workers');
const radiusInput = document.getElementById('radius-input');
const radiusMinus = document.getElementById('radius-minus');
const radiusPlus = document.getElementById('radius-plus');

let map, marker, currentCoords = null;
let radiusCircle = null; // Círculo del radio

function updateRadiusCircle() {
    if (!map || !currentCoords) return;
    const radius = Number(radiusInput.value) || 0;
    if (radiusCircle) {
        map.removeLayer(radiusCircle);
    }
    if (radius > 0) {
        radiusCircle = L.circle(currentCoords, {
            radius: radius,
            color: "#3AAFA9",
            fillColor: "#3AAFA9",
            fillOpacity: 0.15,
            weight: 2
        }).addTo(map);
    }
}

function setMarkerDragHandler() {
    marker.on('dragend', function (e) {
        const { lat, lng } = e.target.getLatLng();
        currentCoords = [lat, lng];
        updateRadiusCircle();
    });
}

// Inicializar mapa con Leaflet y geolocalización
function initMap() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        currentCoords = [lat, lng];

        map = L.map('map').setView(currentCoords, 11); // <-- Cambia 14 por 11

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
        }).addTo(map);

        marker = L.marker(currentCoords, { draggable: true }).addTo(map);
        setMarkerDragHandler();
        updateRadiusCircle();
    }, () => {
        // Si el usuario no da permiso, centra el mapa en una ubicación por defecto
        currentCoords = [-31.4167, -64.1833]; // Córdoba Capital
        map = L.map('map').setView(currentCoords, 8); // <-- Cambia 12 por 10
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
        }).addTo(map);
        marker = L.marker(currentCoords, { draggable: true }).addTo(map);
        setMarkerDragHandler();
        updateRadiusCircle();
    });
}

window.addEventListener('DOMContentLoaded', initMap);

// Control de radio con botones
radiusMinus.addEventListener('click', () => {
    let val = parseInt(radiusInput.value, 10) || 0;
    if (val > 5000) {
        radiusInput.value = val - 5000;
        updateRadiusCircle();
    }
});
radiusPlus.addEventListener('click', () => {
    let val = parseInt(radiusInput.value, 10) || 0;
    radiusInput.value = val + 5000;
    updateRadiusCircle();
});
radiusInput.addEventListener('input', updateRadiusCircle);

// Obtener tags de la API
async function fetchTags() {
    try {
        const res = await fetch(`${API_URL}/admin/tags`, {
            headers: {
                Authorization: TOKEN,
                'Content-Type': 'application/json',
            }
        });

        if (!res.ok) throw new Error('No se pudo obtener tags');
        const tags = await res.json();
        renderTags(tags);
    } catch (err) {
        console.error('Error al obtener tags:', err);
    }
}

function renderTags(tags) {
    tagsContainer.innerHTML = '';
    tags.forEach(tag => {
        const el = document.createElement('div');
        el.className = 'tag';
        el.innerText = tag;
        el.addEventListener('click', () => el.classList.toggle('selected'));
        tagsContainer.appendChild(el);
    });
}

// Buscar usuarios por nombre, tags y ubicación seleccionada en el mapa
async function searchUsers() {
    const selectedTags = Array.from(document.querySelectorAll('.tag.selected')).map(tag => tag.innerText);
    const nameUser = document.getElementById('search-name').value.trim();
    const radiusInMeters = Number(radiusInput.value) || 0;

    let location = undefined;
    if (currentCoords) {
        // Leaflet usa [lat, lng], tu backend espera [lng, lat]
        location = {
            type: "Point",
            coordinates: [currentCoords[1], currentCoords[0]],
        };
    }

    try {
        const res = await fetch(`${API_URL}/user/search`, {
            method: 'POST',
            headers: {
                Authorization: TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nameUser: nameUser || undefined,
                tags: selectedTags.length ? selectedTags : undefined,
                location: location || undefined,
                radiusInMeters: location && radiusInMeters ? radiusInMeters : undefined,
                page: 1
            }),
        });

        const data = await res.json();
        const users = data.users || data;
        renderUsers(users);
    } catch (err) {
        console.error('Error buscando usuarios:', err);
    }
}

// Permitir buscar con Enter
document.getElementById('search-name').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        searchUsers();
    }
});

function renderUsers(users) {
    resultsContainer.innerHTML = '';
    if (!users || users.length === 0) {
        resultsContainer.innerHTML = '<p>No se encontraron trabajadores.</p>';
        return;
    }

    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        userCard.innerHTML = `
            <img src="${user.Avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.NameUser || 'U')}" alt="avatar" />
            <div class="user-card-content">
                <h3>${user.NameUser || "Sin nombre"}</h3>
                <div class="user-tags">
                    ${user.tags && user.tags.length
                ? user.tags.map(tag =>
                    `<span class="user-tag${tag.toLowerCase() === 'prime' ? ' prime' : ''}">${tag}</span>`
                ).join('')
                : '<span class="user-tag">Sin tags</span>'
            }
                </div>
                <div class="user-location">
                    <strong>Ubicación:</strong> ${user.Ciudad || "No especificada"}
                </div>
                <button class="main-btn contactar-btn" style="margin-top:10px; padding:8px 18px; font-size:0.98rem;" data-email="${user.Email || ''}">Contactar</button>
            </div>
        `;
        resultsContainer.appendChild(userCard);
    });
}

// Modal contacto
const contactModal = document.getElementById('contact-modal');
const closeModal = document.getElementById('close-modal');
const acceptContact = document.getElementById('accept-contact');
const goToApp = document.getElementById('go-to-app');
const contactInfo = document.getElementById('contact-info');
const contactEmail = document.getElementById('contact-email');
const copyEmailBtn = document.getElementById('copy-email');
const copyMsg = document.getElementById('copy-msg');

let currentEmail = "";

resultsContainer.addEventListener('click', function (e) {
    if (e.target.classList.contains('contactar-btn')) {
        currentEmail = e.target.getAttribute('data-email') || '';
        contactModal.style.display = 'flex';
        contactInfo.style.display = 'none';
        copyMsg.style.display = 'none';
    }
});

closeModal.onclick = () => { contactModal.style.display = 'none'; };
window.onclick = (e) => { if (e.target === contactModal) contactModal.style.display = 'none'; };

acceptContact.onclick = () => {
    contactInfo.style.display = 'block';
    contactEmail.textContent = currentEmail || "No disponible";
};

copyEmailBtn.onclick = () => {
    if (currentEmail) {
        navigator.clipboard.writeText(currentEmail);
        copyMsg.style.display = 'inline';
        setTimeout(() => { copyMsg.style.display = 'none'; }, 1500);
    }
};

goToApp.onclick = () => {
    window.open('https://play.google.com/store/apps/details?id=com.nexovecinal.app&pcampaignid=web_share', '_blank');
    contactModal.style.display = 'none';
};

// Mostrar trabajadores destacados (primeros 4 usuarios)
async function fetchFeaturedUsers() {
    try {
        const res = await fetch(`${API_URL}/user/search`, {
            method: 'POST',
            headers: {
                Authorization: TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tags: [], page: 1 }),
        });

        const data = await res.json();
        const users = data.users || data;
        renderFeaturedUsers(users.slice(0, 4));
    } catch (err) {
        console.error('Error cargando destacados:', err);
    }
}

function renderFeaturedUsers(users) {
    featuredContainer.innerHTML = '';
    if (!users || users.length === 0) {
        featuredContainer.innerHTML = '<p>No hay trabajadores destacados.</p>';
        return;
    }
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
      <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.nameUser || 'U')}" alt="avatar" />
      <div style="font-weight:700; font-size:1.09rem; margin-bottom:2px;">${user.nameUser || "Nombre de trabajador"}</div>
      <div class="user-prof">${user.profession || "Electricista"}</div>
      <div class="user-location">${user.location?.address || "Córdoba Capital"}</div>
    `;
        featuredContainer.appendChild(card);
    });
}

// Al cargar
fetchTags();
fetchFeaturedUsers();
searchBtn.addEventListener('click', searchUsers);
document.getElementById('download-app-btn').addEventListener('click', function () {
    window.open('https://play.google.com/store/apps/details?id=com.nexovecinal.app&pcampaignid=web_share', '_blank');
});