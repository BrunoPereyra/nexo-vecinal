const API_URL = "https://deploy.pinkker.tv/9000";
const TOKEN = 'Bearer TU_TOKEN_DE_PRUEBA'; // Asegúrate de reemplazar 'TU_TOKEN_DE_PRUEBA' con tu token real si lo tienes.

const tagsContainer = document.getElementById('tags-container');
const toggleTagsBtn = document.getElementById('toggle-tags-btn');
const tagsGrid = document.querySelector('.tags-grid');
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
    const defaultCoords = [-31.4167, -64.1833]; // Córdoba Capital
    const defaultZoom = 11;

    if (!navigator.geolocation) {
        currentCoords = defaultCoords;
        map = L.map('map').setView(currentCoords, defaultZoom);
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

        map = L.map('map').setView(currentCoords, defaultZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
        }).addTo(map);

        marker = L.marker(currentCoords, { draggable: true }).addTo(map);
        setMarkerDragHandler();
        updateRadiusCircle();
    }, () => {
        // Fallback if user denies permission or geo-location fails
        currentCoords = defaultCoords;
        map = L.map('map').setView(currentCoords, defaultZoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
        }).addTo(map);
        marker = L.marker(currentCoords, { draggable: true }).addTo(map);
        setMarkerDragHandler();
        updateRadiusCircle();
    });
}
document.addEventListener('DOMContentLoaded', initMap);
// Control de radio con botones
radiusMinus.addEventListener('click', () => {
    let val = parseInt(radiusInput.value, 10) || 0;
    if (val > 5000) {
        radiusInput.value = val - 5000;
        updateRadiusCircle();
    } else if (val > 0 && val <= 5000) { // Goes to 0 if 5000 or less
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

// Cambia el valor por defecto del radio a 15000
radiusInput.value = 15000;

// Modifica fetchTags para seleccionar los primeros 4 tags y buscar automáticamente
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

        // Selecciona los primeros 4 tags automáticamente
        setTimeout(() => {
            const tagElements = tagsContainer.querySelectorAll('.tag');
            for (let i = 0; i < Math.min(4, tagElements.length); i++) {
                tagElements[i].classList.add('selected');
            }
            // Llama a la búsqueda automáticamente
            searchUsers();
        }, 0);
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
            coordinates: [currentCoords[1], currentCoords[0]], // Leaflet gives [lat, lng], API expects [lng, lat]
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
        const users = data.users || data; // Assuming users might be directly in data if no pagination wrapper
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
window.users = [];
function renderUsers(users) {
    window.users = users;
    resultsContainer.innerHTML = "";
    users.forEach(user => {
        const tagsHtml = (user.tags || [])
            .map(tag => `<span class="user-tag${tag.prime ? ' prime' : ''}">${tag.name || tag}</span>`)
            .join(" ");

        resultsContainer.innerHTML += `
      <div class="user-card">
        <div class="user-card-avatar">
          <img src="${user.Avatar || 'assets/avatar-default.png'}" alt="${user.NameUser}" class="user-avatar">
        </div>
        <div class="user-card-content">
          <div class="user-card-header">
            <h3 class="user-card-name">${user.NameUser || user.FullName || "Sin nombre"}</h3>
          </div>
          <div class="user-tags">${tagsHtml}</div>
          <button class="ver-perfil-btn" data-user-id="${user.id}">Ver perfil</button>
        </div>
      </div>
    `;
    });
}
// --- MODAL DE CONTACTO JS ---
const contactModal = document.getElementById('contact-modal');
const closeModal = document.getElementById('close-modal');
const acceptContact = document.getElementById('accept-contact');
const goToApp = document.getElementById('go-to-app');
const contactInfo = document.getElementById('contact-info');
const contactEmail = document.getElementById('contact-email');
const copyEmailBtn = document.getElementById('copy-email');
const copyMsg = document.getElementById('copy-msg');

let currentEmail = ""; // Variable para almacenar el email del trabajador actual

// Event Listener para los botones 'Contactar' (usa delegación de eventos)
resultsContainer.addEventListener('click', function (e) {
    // Verifica si el clic fue en un botón con la clase 'contactar-btn'
    if (e.target.classList.contains('contactar-btn')) {
        currentEmail = e.target.getAttribute('data-email') || ''; // Obtiene el email del atributo data
        contactModal.classList.add('active'); // Muestra el modal añadiendo la clase 'active'

        // Reinicia el estado del modal cada vez que se abre
        contactInfo.style.display = 'none'; // Oculta la información de contacto
        copyMsg.style.display = 'none';     // Oculta el mensaje de "Copiado"
        copyEmailBtn.textContent = 'Copiar Email'; // Restaura el texto del botón
    }
});
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('contactar-btn')) {
        const email = event.target.getAttribute('data-email');

        // Opcional: Rellenar campos del modal con info del usuario
        const emailField = document.getElementById('modal-email');
        if (emailField) emailField.value = email;

        // Mostrar el modal
        const modal = document.getElementById('contact-modal');
        if (modal) modal.style.display = 'block';
    }
});

// Event Listener para cerrar el modal (botón 'x')
closeModal.onclick = () => {
    contactModal.classList.remove('active'); // Oculta el modal quitando la clase 'active'
};

// Event Listener para cerrar el modal al hacer clic fuera del contenido
window.onclick = (e) => {
    if (e.target === contactModal) { // Si el clic fue directamente en el overlay del modal
        contactModal.classList.remove('active'); // Oculta el modal
    }
};

if (acceptContact && contactInfo && contactEmail) {
    acceptContact.onclick = () => {
        contactInfo.style.display = 'block';
        contactEmail.textContent = window.emailToCopy || currentEmail || "Email no disponible";

        // Copia el email al portapapeles solo si viene del perfil
        if (window.emailToCopy) {
            navigator.clipboard.writeText(window.emailToCopy);
            copyMsg.style.display = 'inline';
            copyEmailBtn.textContent = '¡Copiado!';
            setTimeout(() => {
                copyMsg.style.display = 'none';
                copyEmailBtn.textContent = 'Copiar Email';
            }, 1500);
            // Limpia la variable temporal
            window.emailToCopy = null;
            // Cierra el modal de contacto después de mostrar el mensaje
            setTimeout(() => {
                contactModal.classList.remove('active');
            }, 1200);
        }
    };
}


// Event Listener para el botón 'Copiar Email'
copyEmailBtn.onclick = () => {
    if (currentEmail) {
        // Intenta el método moderno
        navigator.clipboard.writeText(currentEmail).then(() => {
            copyMsg.style.display = 'inline';
            copyEmailBtn.textContent = '¡Copiado!';
            setTimeout(() => {
                copyMsg.style.display = 'none';
                copyEmailBtn.textContent = 'Copiar Email';
            }, 1500);
        }).catch(() => {
            // Fallback para móviles
            const tempInput = document.createElement('input');
            tempInput.value = currentEmail;
            document.body.appendChild(tempInput);
            tempInput.select();
            try {
                document.execCommand('copy');
                copyMsg.style.display = 'inline';
                copyEmailBtn.textContent = '¡Copiado!';
                setTimeout(() => {
                    copyMsg.style.display = 'none';
                    copyEmailBtn.textContent = 'Copiar Email';
                }, 1500);
            } catch (err) {
                alert('No se pudo copiar el email. Copialo manualmente.');
            }
            document.body.removeChild(tempInput);
        });
    }
};

// Event Listener para el botón 'Ir a la App'
goToApp.onclick = () => {
    // Abre el enlace de la app en una nueva pestaña
    window.open('https://play.google.com/store/apps/details?id=com.nexovecinal.app&pcampaignid=web_share', '_blank');
    contactModal.classList.remove('active'); // Oculta el modal
};

function renderFeaturedUsers(users) {
    featuredContainer.innerHTML = '';
    if (!users || users.length === 0) {
        featuredContainer.innerHTML = '<p>No hay trabajadores destacados disponibles en este momento.</p>';
        return;
    }

    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'card'; // Asumiendo que 'card' es la clase de tus tarjetas destacadas
        card.innerHTML = `
            <img src="${user.Avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.NameUser || 'U')}" alt="Avatar de ${user.NameUser || 'trabajador'}" />
            <div style="font-weight:700; font-size:1.09rem; margin-bottom:2px;">${user.NameUser || "Nombre de trabajador"}</div>
            <div class="user-prof">${user.profession || "Profesión no especificada"}</div>
            <div class="user-location">${user.Ciudad || "Ubicación no especificada"}</div>
        `;
        featuredContainer.appendChild(card);
    });
}

// Ejecutar funciones al cargar el script
fetchTags();
searchBtn.addEventListener('click', searchUsers); // Asigna el listener al botón de búsqueda

// Listener para el botón de descarga de la app, si existe
const downloadAppBtn = document.getElementById('download-app-btn');
if (downloadAppBtn) { // Verifica si el elemento existe antes de añadir el listener
    downloadAppBtn.addEventListener('click', function () {
        window.open('https://play.google.com/store/apps/details?id=com.nexovecinal.app&pcampaignid=web_share', '_blank');
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const acceptBtn = document.getElementById("accept-contact");
    const contactInfo = document.getElementById("contact-info");

    if (acceptBtn && contactInfo) {
        acceptBtn.addEventListener("click", () => {
            // Mostrar la sección de contacto si estaba oculta
            contactInfo.style.display = "block";

            // Pequeño timeout por si hay animaciones o cambio de display
            setTimeout(() => {
                contactInfo.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 100); // Delay de 100ms para asegurar que ya se mostró
        });
    }
});

// Corrige la ruta de los íconos de Leaflet para evitar el error 404
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
document.addEventListener('click', async function (e) {
    if (e.target.classList.contains('ver-perfil-btn')) {
        const userId = e.target.getAttribute('data-user-id');
        // Busca el usuario en tu array
        const user = users.find(u => u.id === userId);
        if (!user) return;

        // Llama a tu endpoint para trabajos completados
        let trabajosHtml = '<p>Cargando trabajos completados...</p>';
        try {
            const res = await fetch(`https://deploy.pinkker.tv/9000/job/get-jobs-user-completedvisited?id=${userId}&page=1`);
            const data = await res.json();
            if (data && data.data && data.data.length > 0) {
                trabajosHtml = '<ul class="trabajos-list">' + data.data.map(job => `
          <li style="margin-bottom:16px;">
            <strong>${job.title || 'Sin título'}</strong>
            <div style="font-size: 0.97em; color: #555; margin: 2px 0 4px 0;">
              ${job.description || ''}
            </div>
            <div style="margin-bottom: 2px;">
              ${(job.tags || []).map(tag => `<span class="user-tag">${tag}</span>`).join(' ')}
            </div>
            ${job.employerFeedback && job.employerFeedback.comment ? `
              <div class="job-feedback" style="color:#119b97; font-style:italic; margin-top:2px;">
                <svg width="14" height="14" fill="#FFD166" viewBox="0 0 24 24" style="vertical-align:middle;margin-right:2px;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                ${job.employerFeedback.rating ? job.employerFeedback.rating + '★ - ' : ''}
                "${job.employerFeedback.comment}"
              </div>
            ` : ''}
          </li>
        `).join('') + '</ul>';
            } else {
                trabajosHtml = '<p>Este usuario no tiene trabajos completados.</p>';
            }
        } catch (err) {
            trabajosHtml = '<p>Error al cargar trabajos.</p>';
        }

        // Renderiza el modal
        document.getElementById('perfil-modal-body').innerHTML = `
  <div class="perfil-modal-web">
    <div class="perfil-header">
      <div class="perfil-avatar-border">
        <img src="${user.Avatar || 'assets/avatar-default.png'}" alt="${user.NameUser}" class="perfil-avatar">
      </div>
      <div>
        <div class="perfil-nombre">${user.FullName || user.NameUser || "Sin nombre"}</div>
        <div class="perfil-usuario">@${user.NameUser || "-"}</div>
      </div>
    </div>
    <div class="perfil-bio">${user.biography && user.biography.trim() !== "" ? user.biography : "Biografía no configurada"}</div>
    <div class="perfil-tabs">
      <button class="perfil-tab perfil-tab-activo">Trabajos realizados</button>
      <button class="perfil-tab" disabled>Trabajos creados</button>
    </div>
    <div class="perfil-trabajos">
      ${trabajosHtml}
    </div>
    <button id="contactar-desde-perfil" class="main-btn perfil-contactar-btn">Contactar</button>
  </div>
`;
        document.getElementById('perfil-modal').style.display = 'flex';

        // Event listener para el botón "Contactar" en el modal de perfil
        const btnContactarPerfil = document.getElementById('contactar-desde-perfil');
        if (btnContactarPerfil) {
            btnContactarPerfil.onclick = () => {
                currentEmail = user.Email || "";
                contactInfo.style.display = 'none';
                copyMsg.style.display = 'none';
                copyEmailBtn.textContent = 'Copiar Email';
                contactModal.classList.add('active');
            };
        }
    }
});
// Cerrar modal
document.getElementById('perfil-modal-close').onclick = function () {
    document.getElementById('perfil-modal').style.display = 'none';
};
window.onclick = function (event) {
    if (event.target === document.getElementById('perfil-modal')) {
        document.getElementById('perfil-modal').style.display = 'none';
    }
};