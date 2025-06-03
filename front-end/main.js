const API_URL = "https://deploy.pinkker.tv/9000";
const TOKEN = 'Bearer TU_TOKEN_DE_PRUEBA';

const tagsContainer = document.getElementById('tags-container');
const toggleTagsBtn = document.getElementById('toggle-tags-btn'); // New element
const tagsGrid = document.querySelector('.tags-grid'); // New element to control height
const searchBtn = document.getElementById('search-btn');
const resultsContainer = document.getElementById('results-container');
const featuredContainer = document.getElementById('featured-workers');
const radiusInput = document.getElementById('radius-input');
const radiusMinus = document.getElementById('radius-minus');
const radiusPlus = document.getElementById('radius-plus');
const searchNameInput = document.getElementById('search-name');

const MAX_VISIBLE_TAGS = 6; // How many tags to show initially

let map, marker, currentCoords = null;
let radiusCircle = null; // Círculo del radio
let allTags = []; // Store all fetched tags

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
        // Optional: Trigger a search or update a display for the new location
    });
}

// Inicializar mapa con Leaflet y geolocalización
function initMap() {
    if (!navigator.geolocation) {
        currentCoords = [-31.4167, -64.1833]; // Córdoba Capital
        map = L.map('map').setView(currentCoords, 11); // Initial zoom for bigger map
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
        }).addTo(map);
        marker = L.marker(currentCoords, { draggable: true }).addTo(map);
        setMarkerDragHandler();
        updateRadiusCircle();
        return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        currentCoords = [lat, lng];

        map = L.map('map').setView(currentCoords, 11); // Initial zoom for bigger map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
        }).addTo(map);

        marker = L.marker(currentCoords, { draggable: true }).addTo(map);
        setMarkerDragHandler();
        updateRadiusCircle();
    }, () => {
        // Fallback if user denies permission
        currentCoords = [-31.4167, -64.1833]; // Córdoba Capital
        map = L.map('map').setView(currentCoords, 8); // Slightly zoomed out for a broader view
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
    } else if (val > 0 && val <= 5000) {
        radiusInput.value = 0;
        updateRadiusCircle();
    }
});
radiusPlus.addEventListener('click', () => {
    let val = parseInt(radiusInput.value, 10) || 0;
    radiusInput.value = val + 5000;
    updateRadiusCircle();
});
radiusInput.addEventListener('input', updateRadiusCircle); // Keep this for direct input changes if allowed

// Obtener tags de la API
async function fetchTags() {
    tagsContainer.innerHTML = '<div class="loading-spinner"></div><p>Cargando categorías...</p>';
    toggleTagsBtn.style.display = 'none'; // Hide toggle button during loading

    try {
        const res = await fetch(`${API_URL}/admin/tags`, {
            headers: {
                Authorization: TOKEN,
                'Content-Type': 'application/json',
            }
        });

        if (!res.ok) throw new Error('No se pudo obtener tags');
        allTags = await res.json(); // Store all tags
        renderTags(allTags);
    } catch (err) {
        console.error('Error al obtener tags:', err);
        tagsContainer.innerHTML = '<p>Error al cargar categorías. Inténtalo de nuevo más tarde.</p>';
        toggleTagsBtn.style.display = 'none';
    }
}

function renderTags(tagsToRender) {
    tagsContainer.innerHTML = ''; // Clear existing tags
    tagsGrid.classList.remove('expanded'); // Start collapsed

    const tagsToShow = tagsToRender.slice(0, MAX_VISIBLE_TAGS);
    const hiddenTagsExist = tagsToRender.length > MAX_VISIBLE_TAGS;

    tagsToShow.forEach(tag => {
        const el = document.createElement('div');
        el.className = 'tag';
        el.innerText = tag;
        el.addEventListener('click', () => el.classList.toggle('selected'));
        tagsContainer.appendChild(el);
    });

    if (hiddenTagsExist) {
        // Render hidden tags but keep them hidden by default for the 'expanded' class
        const hiddenTags = tagsToRender.slice(MAX_VISIBLE_TAGS);
        hiddenTags.forEach(tag => {
            const el = document.createElement('div');
            el.className = 'tag';
            el.innerText = tag;
            el.addEventListener('click', () => el.classList.toggle('selected'));
            tagsContainer.appendChild(el);
        });
        toggleTagsBtn.style.display = 'block'; // Show the toggle button
        toggleTagsBtn.textContent = 'Ver más categorías';
    } else {
        toggleTagsBtn.style.display = 'none'; // Hide if all tags are visible
    }
}

// Toggle tags button functionality
toggleTagsBtn.addEventListener('click', () => {
    tagsGrid.classList.toggle('expanded');
    if (tagsGrid.classList.contains('expanded')) {
        toggleTagsBtn.textContent = 'Ver menos categorías';
    } else {
        toggleTagsBtn.textContent = 'Ver más categorías';
        // Optional: Scroll back to the top of the tags section when collapsing
        tagsGrid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
});


// Buscar usuarios por nombre, tags y ubicación seleccionada en el mapa
async function searchUsers() {
    searchBtn.disabled = true;
    searchBtn.innerHTML = 'Buscando...';

    resultsContainer.innerHTML = '<div class="loading-spinner"></div><p>Buscando trabajadores...</p>';

    const selectedTags = Array.from(document.querySelectorAll('.tag.selected')).map(tag => tag.innerText);
    const nameUser = searchNameInput.value.trim();
    const radiusInMeters = Number(radiusInput.value) || 0;

    let location = undefined;
    if (currentCoords) {
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
                radiusInMeters: location && radiusInMeters > 0 ? radiusInMeters : undefined,
                page: 1
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${res.statusText} - ${errorText}`);
        }

        const data = await res.json();
        const users = data.users || data;
        renderUsers(users);
    } catch (err) {
        console.error('Error buscando usuarios:', err);
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <img src="https://via.placeholder.com/60?text=!" alt="Error" class="empty-state-icon"/>
                <p>Hubo un problema al buscar trabajadores. Por favor, inténtalo de nuevo.</p>
                <p>Detalle: ${err.message || 'Error desconocido'}</p>
            </div>
        `;
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Buscar';
    }
}

// Permitir buscar con Enter
searchNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        searchUsers();
    }
});

function renderUsers(users) {
    resultsContainer.innerHTML = '';
    if (!users || users.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <img src="https://via.placeholder.com/80?text=🔍" alt="No hay resultados" class="empty-state-icon"/>
                <h3>¡Vaya! No encontramos trabajadores.</h3>
                <p>Intenta:</p>
                <ul>
                    <li>Revisar el nombre o los tags seleccionados.</li>
                    <li>Ampliar el radio de búsqueda.</li>
                    <li>Arrastrar el marcador en el mapa a otra ubicación.</li>
                </ul>
            </div>
        `;
        return;
    }

    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        userCard.innerHTML = `
            <img src="${user.Avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.NameUser || 'U')}" alt="Avatar de ${user.NameUser || 'usuario'}" />
            <div class="user-card-content">
                <h3>${user.NameUser || "Sin nombre"}</h3>
                <div class="user-tags">
                    ${user.tags && user.tags.length
                ? user.tags.map(tag =>
                    `<span class="user-tag${tag.toLowerCase() === 'prime' ? ' prime' : ''}">${tag}</span>`
                ).join('')
                : '<span class="user-tag no-tags">Sin tags</span>'
            }
                </div>
                <div class="user-location">
                    <strong>Ubicación:</strong> ${user.Ciudad || "No especificada"}
                </div>
                <button class="main-btn contactar-btn" data-email="${user.Email || ''}">Contactar</button>
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
        copyEmailBtn.textContent = 'Copiar Email';
    }
});

closeModal.onclick = () => { contactModal.style.display = 'none'; };
window.onclick = (e) => { if (e.target === contactModal) contactModal.style.display = 'none'; };

acceptContact.onclick = () => {
    contactInfo.style.display = 'block';
    contactEmail.textContent = currentEmail || "Email no disponible";
};

copyEmailBtn.onclick = () => {
    if (currentEmail) {
        navigator.clipboard.writeText(currentEmail);
        copyMsg.style.display = 'inline';
        copyEmailBtn.textContent = '¡Copiado!';
        setTimeout(() => {
            copyMsg.style.display = 'none';
            copyEmailBtn.textContent = 'Copiar Email';
        }, 1500);
    }
};

goToApp.onclick = () => {
    window.open('https://play.google.com/store/apps/details?id=com.nexovecinal.app&pcampaignid=web_share', '_blank');
    contactModal.style.display = 'none';
};

// Mostrar trabajadores destacados (primeros 4 usuarios)
async function fetchFeaturedUsers() {
    featuredContainer.innerHTML = '<div class="loading-spinner"></div><p>Cargando destacados...</p>';
    try {
        const res = await fetch(`${API_URL}/user/search`, {
            method: 'POST',
            headers: {
                Authorization: TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tags: [], page: 1 }),
        });

        if (!res.ok) throw new Error('No se pudo obtener trabajadores destacados');

        const data = await res.json();
        const users = data.users || data;
        renderFeaturedUsers(users.slice(0, 4));
    } catch (err) {
        console.error('Error cargando destacados:', err);
        featuredContainer.innerHTML = '<p>No se pudieron cargar los trabajadores destacados.</p>';
    }
}

function renderFeaturedUsers(users) {
    featuredContainer.innerHTML = '';
    if (!users || users.length === 0) {
        featuredContainer.innerHTML = '<p>No hay trabajadores destacados disponibles en este momento.</p>';
        return;
    }
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'card'; // Use a generic "card" class, not "user-card" if visually different
        card.innerHTML = `
            <img src="${user.Avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.NameUser || 'U')}" alt="Avatar de ${user.NameUser || 'trabajador'}" />
            <div style="font-weight:700; font-size:1.09rem; margin-bottom:2px;">${user.NameUser || "Nombre de trabajador"}</div>
            <div class="user-prof">${user.profession || "Profesión no especificada"}</div>
            <div class="user-location">${user.Ciudad || "Ubicación no especificada"}</div>
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