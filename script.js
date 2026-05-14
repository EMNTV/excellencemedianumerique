// ============================================================
// Excellence Media Numérique - Main Application Script
// ============================================================

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://hzzbtatdkafqyyepoowz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4W3M0O0IH4Bmi-J3A-gidw_Pk6UzXYw';
let supabaseClient;

// --- Cloudinary Configuration ---
const CLOUDINARY_CLOUD_NAME = 'dv36bmp5e';
const CLOUDINARY_UPLOAD_PRESET = 'excellence_media';
const CLOUDINARY_API_KEY = '691489143536825';

// --- App State ---
let currentSection = 'accueil';
let carouselIndex = 0;
let carouselInterval;
let adminUser = null;
let currentDashTab = 'presse';
let paginationState = {
  audiovisuel: { page: 1, perPage: 6 },
  emissions: { page: 1, perPage: 6 },
  spots: { page: 1, perPage: 6 },
  nocomment: { page: 1, perPage: 6 }
};

// --- Data Cache ---
let dataCache = {
  presse: [],
  audiovisuel: [],
  emissions: [],
  spots: [],
  nocomment: []
};

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  await loadAllData();
  initCarousel();
  initScrollTop();
  initHeaderScroll();
  checkExistingSession();
});

document.getElementById('search-input')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleSearch(e.target.value);
  }
});

function initSupabase() {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase initialisé');
  } else {
    console.error('Supabase non trouvé');
  }
}

async function checkExistingSession() {
  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      adminUser = {
        email: session.user.email,
        name: session.user.user_metadata?.full_name || session.user.email,
        picture: session.user.user_metadata?.avatar_url
      };
      console.log('Session existante trouvée:', adminUser.email);
      updateDashboardButton();
    }
  }
}

function updateDashboardButton() {
  const dashboardLink = document.querySelector('.nav-link[data-section="dashboard"]');
  if (dashboardLink && adminUser) {
    dashboardLink.innerHTML = '<i class="fas fa-shield-halved text-xs"></i> Dashboard ✓';
    dashboardLink.classList.add('text-[#188ab8]');
  }
}

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(section) {
  // Arrêter toutes les vidéos en cours avant de changer de section
  stopAllVideos();

  // Hide all sections
  document.querySelectorAll('[id^="section-"]').forEach(s => {
    s.classList.remove('section-visible');
    s.classList.add('section-hidden');
  });

  // Show target section
  const target = document.getElementById('section-' + section);
  if (target) {
    target.classList.remove('section-hidden');
    target.classList.add('section-visible');
  }

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.section === section) link.classList.add('active');
  });

  currentSection = section;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Refresh section data
  if (section === 'accueil') renderHomePreviews();
  else if (section === 'presse') renderPresse();
  else if (section === 'audiovisuel') renderVideoSection('audiovisuel');
  else if (section === 'emissions') renderVideoSection('emissions');
  else if (section === 'spots') renderVideoSection('spots');
  else if (section === 'nocomment') renderVideoSection('nocomment');

  return false;
}

function playVideoInline(element, videoId) {
  if (!videoId) return;

  // Arrêter les autres vidéos avant d'en lancer une nouvelle
  stopAllVideos();

  const container = element.querySelector('.aspect-video') || element.querySelector('.youtube-card');
  if (container) {
    container.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }
}

function stopAllVideos() {
  document.querySelectorAll('iframe').forEach(iframe => {
    // Réinitialiser le src arrête immédiatement la lecture
    const src = iframe.src;
    iframe.src = '';
    iframe.src = src.replace('autoplay=1', 'autoplay=0');
  });
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-overlay');
  menu.classList.toggle('open');
  overlay.classList.toggle('hidden');
}

// ============================================================
// CAROUSEL
// ============================================================
function initCarousel() {
  carouselGo(0);
  carouselInterval = setInterval(() => carouselNext(), 5000);
}

function carouselGo(index) {
  carouselIndex = index;
  const track = document.getElementById('carousel-track');
  if (track) {
    track.style.transform = `translateX(-${index * 100}%)`;
  }
  document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
    dot.className = `carousel-dot w-3 h-3 rounded-full transition ${i === index ? 'bg-primary-500 scale-110' : 'bg-gray-600'}`;
  });
  clearInterval(carouselInterval);
  carouselInterval = setInterval(() => carouselNext(), 5000);
}

function carouselNext() {
  carouselGo((carouselIndex + 1) % 3);
}

function carouselPrev() {
  carouselGo((carouselIndex - 1 + 3) % 3);
}

// ============================================================
// SUPABASE DATA OPERATIONS
// ============================================================
async function loadAllData() {
  const tables = ['presse', 'audiovisuel', 'emissions', 'spots', 'nocomment'];
  
  for (const table of tables) {
    try {
      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from(table)
          .select('*')
          .order('position', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        dataCache[table] = data || [];
        console.log(`${table} chargé:`, dataCache[table].length);
      } else {
        dataCache[table] = [];
      }
    } catch (err) {
      console.warn(`Error loading ${table}:`, err.message);
      dataCache[table] = [];
    }
  }

  // Render current section
  if (currentSection === 'presse') renderPresse();
  else if (currentSection === 'accueil') renderHomePreviews();
  else if (['audiovisuel', 'emissions', 'spots', 'nocomment'].includes(currentSection)) {
    renderVideoSection(currentSection);
  }
}

// Helper pour vérifier l'authentification
async function isAuthenticated() {
  if (adminUser) return true;
  
  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      adminUser = {
        email: session.user.email,
        name: session.user.user_metadata?.full_name || session.user.email,
        picture: session.user.user_metadata?.avatar_url
      };
      updateDashboardButton();
      return true;
    }
  }
  return false;
}

async function addItem(table, item) {
  try {
    if (!await isAuthenticated()) {
      showNotification('Vous devez vous connecter pour ajouter du contenu', 'error');
      openDashboard();
      return;
    }

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from(table)
        .insert([item])
        .select();
      
      if (error) throw error;
      
      showNotification('Élément ajouté avec succès !', 'success');
      await loadAllData();
      renderCurrentDashTab();
      
      // Refresh public view
      if (table === 'presse') renderPresse();
      else if (['audiovisuel', 'emissions', 'spots', 'nocomment'].includes(table)) {
        renderVideoSection(table);
      }
      return data;
    }
  } catch (err) {
    console.error('Add error:', err);
    showNotification('Erreur lors de l\'ajout : ' + err.message, 'error');
  }
}

async function updateItem(table, id, updates) {
  try {
    if (!await isAuthenticated()) {
      showNotification('Vous devez vous connecter pour modifier', 'error');
      openDashboard();
      return;
    }

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from(table)
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      showNotification('Élément mis à jour !', 'success');
      await loadAllData();
      renderCurrentDashTab();
      return data;
    }
  } catch (err) {
    console.error('Update error:', err);
    showNotification('Erreur lors de la mise à jour : ' + err.message, 'error');
  }
}

async function deleteItem(table, id) {
  if (!confirm('Supprimer cet élément ?')) return;
  
  try {
    if (!await isAuthenticated()) {
      showNotification('Vous devez vous connecter pour supprimer', 'error');
      openDashboard();
      return;
    }

    if (supabaseClient) {
      const { error } = await supabaseClient
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      showNotification('Élément supprimé !', 'success');
      await loadAllData();
      renderCurrentDashTab();
      
      // Refresh public view
      if (table === 'presse') renderPresse();
      else if (['audiovisuel', 'emissions', 'spots', 'nocomment'].includes(table)) {
        renderVideoSection(table);
      }
    }
  } catch (err) {
    console.error('Delete error:', err);
    showNotification('Erreur lors de la suppression : ' + err.message, 'error');
  }
}

async function updatePositions(table, items) {
  try {
    if (!await isAuthenticated()) {
      showNotification('Vous devez vous connecter pour réorganiser', 'error');
      return;
    }

    if (supabaseClient) {
      for (const item of items) {
        await supabaseClient.from(table).update({ position: item.position }).eq('id', item.id);
      }
      showNotification('Ordre mis à jour !', 'success');
      await loadAllData();
    }
  } catch (err) {
    console.error('Reorder error:', err);
    showNotification('Erreur lors de la réorganisation : ' + err.message, 'error');
  }
}

// ============================================================
// GOOGLE SIGN-IN
// ============================================================
async function handleGoogleSignIn(response) {
  try {
    // Décoder le token Google pour vérifier l'email
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const email = payload.email;
    const ADMIN_EMAIL = 'excellencemedianumerique@gmail.com';

    // Vérifier si c'est l'email admin
    if (email !== ADMIN_EMAIL) {
      showNotification('Accès refusé. Seul l\'administrateur peut accéder.', 'error');
      closeAuthModal();
      return;
    }

    // Connecter avec Supabase
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential
      });

      if (error) throw error;
      
      adminUser = {
        email: data.user.email,
        name: data.user.user_metadata?.full_name || data.user.email,
        picture: data.user.user_metadata?.avatar_url
      };

      showNotification(`Bienvenue ${adminUser.name} !`, 'success');
      closeAuthModal();
      updateDashboardButton();
      openDashboardPanel();
    } else {
      throw new Error('Supabase non initialisé');
    }

  } catch (err) {
    console.error('Google sign-in error:', err);
    showNotification('Erreur lors de la connexion: ' + err.message, 'error');
  }
}

window.handleGoogleSignIn = handleGoogleSignIn;

// Déconnexion
async function logout() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  adminUser = null;
  showNotification('Déconnecté avec succès', 'info');
  closeDashboard();
  navigateTo('accueil');
  updateDashboardButton();
}

// ============================================================
// RENDER: HOME PREVIEWS (3 Most Recent Items per Category)
// ============================================================
function renderHomePreviews() {
  const container = document.getElementById('home-previews');
  if (!container) return;

  const previewSections = [
    { key: 'presse', label: 'Presse Écrite', icon: 'fa-newspaper' },
    { key: 'audiovisuel', label: 'Audio-visuel', icon: 'fa-video' },
    { key: 'emissions', label: 'Émissions', icon: 'fa-tv' },
    { key: 'spots', label: 'Spots Publicitaires', icon: 'fa-bullhorn' },
    { key: 'nocomment', label: 'No-Comment', icon: 'fa-volume-xmark' }
  ];

  let html = '';

  previewSections.forEach(s => {
    const items = (dataCache[s.key] || []).slice(0, 3);
    if (items.length === 0) return;

    html += `
      <div class="mb-16 fade-in">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-emnBlue/10 flex items-center justify-center">
              <i class="fas ${s.icon} text-emnBlue"></i>
            </div>
            <h3 class="text-2xl font-bold text-emnBlue">${s.label}</h3>
          </div>
          <button onclick="navigateTo('${s.key}')" class="text-sm text-emnBlue hover:opacity-70 font-medium transition flex items-center gap-2">
            Voir tout <i class="fas fa-arrow-right text-xs"></i>
          </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          ${items.map(item => {
            if (s.key === 'presse') {
              return `
                <div class="glass rounded-2xl overflow-hidden card-hover cursor-pointer" onclick="openArticleModal(${item.id})">
                  <div class="aspect-video relative overflow-hidden">
                    <img src="${item.image_url || 'https://via.placeholder.com/400x225?text=Article'}" class="w-full h-full object-cover">
                  </div>
                  <div class="p-5">
                    <h4 class="font-bold text-[#188ab8] text-base line-clamp-1 mb-2">${escapeHtml(item.title)}</h4>
                    <p class="text-gray-600 text-xs line-clamp-2">${escapeHtml(item.description || '')}</p>
                  </div>
                </div>
              `;
            } else {
              const videoId = extractYouTubeId(item.youtube_url);
              return `
                <div class="glass rounded-2xl overflow-hidden card-hover cursor-pointer" onclick="playVideoInline(this, '${videoId}')">
                  <div class="aspect-video relative overflow-hidden bg-dark-300">
                    ${videoId ? `<img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" class="w-full h-full object-cover">` : '<div class="flex items-center justify-center h-full"><i class="fas fa-video text-gray-700"></i></div>'}
                    <div class="absolute inset-0 flex items-center justify-center">
                      <div class="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg"><i class="fas fa-play text-emnBlue text-sm"></i></div>
                    </div>
                  </div>
                  <div class="p-4">
                    <h4 class="font-semibold text-[#188ab8] text-sm line-clamp-1">${escapeHtml(item.title)}</h4>
                  </div>
                </div>
              `;
            }
          }).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html || '<p class="text-center text-gray-500 py-10">Aucun contenu récent à afficher.</p>';
}

window.logout = logout;

function openDashboard() {
  stopAllVideos();
  
  if (adminUser) {
    openDashboardPanel();
  } else {
    document.getElementById('auth-modal').classList.add('show');
  }
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('show');
}

function openDashboardPanel() {
  document.getElementById('dashboard-modal').classList.add('show');
  document.getElementById('admin-email-display').textContent = adminUser?.email || '';
  
  // Ajouter bouton déconnexion dans le dashboard
  const dashboardHeader = document.querySelector('#dashboard-modal .flex.items-center.justify-between');
  if (dashboardHeader && !document.getElementById('logout-btn')) {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.onclick = () => logout();
    logoutBtn.className = 'ml-3 px-3 py-2 rounded-lg glass text-red-400 hover:bg-red-500/10 transition text-sm flex items-center gap-2';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Déconnexion';
    dashboardHeader.appendChild(logoutBtn);
  }
  
  switchDashTab('presse');
}

function closeDashboard() {
  document.getElementById('dashboard-modal').classList.remove('show');
}

// ============================================================
// RENDER: PRESSE ÉCRITE
// ============================================================
function renderPresse() {
  const container = document.getElementById('presse-scroll');
  const empty = document.getElementById('presse-empty');
  const items = dataCache.presse || [];

  if (!container) return;

  if (items.length === 0) {
    container.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  empty.classList.add('hidden');

  container.innerHTML = items.map(item => `
    <div class="flex-shrink-0 w-72 sm:w-80 glass rounded-2xl overflow-hidden card-hover cursor-pointer" onclick="openArticleModal(${item.id})">
      <div class="relative aspect-[4/3] overflow-hidden">
        <img src="${item.image_url || 'https://via.placeholder.com/400x300?text=Article'}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover hover:scale-110 transition duration-500">
        <div class="absolute inset-0 bg-gradient-to-t from-dark-500/80 to-transparent"></div>
      </div>
      <div class="p-5">
        <h3 class="font-semibold text-[#188ab8] text-sm line-clamp-2 mb-2">${escapeHtml(item.title)}</h3>
        <p class="text-gray-600 text-xs line-clamp-3">${escapeHtml(item.description || '')}</p>
        <div class="flex items-center gap-1 mt-3 text-primary-400 text-xs font-medium">
          <span>Lire plus</span> <i class="fas fa-arrow-right text-[10px]"></i>
        </div>
      </div>
    </div>
  `).join('');
}

function scrollPresse(direction) {
  const container = document.getElementById('presse-scroll');
  if (container) container.scrollBy({ left: direction * 320, behavior: 'smooth' });
}

function openArticleModal(id) {
  const item = dataCache.presse.find(a => a.id === id);
  if (!item) return;
  document.getElementById('article-modal-img').src = item.image_url || 'https://via.placeholder.com/640x360';
  document.getElementById('article-modal-title').textContent = item.title;
  document.getElementById('article-modal-desc').textContent = item.description || '';
  document.getElementById('article-modal').classList.add('show');
}

function closeArticleModal() {
  document.getElementById('article-modal').classList.remove('show');
}

// ============================================================
// RENDER: VIDEO SECTIONS
// ============================================================
function renderVideoSection(section) {
  const grid = document.getElementById(section + '-grid');
  const empty = document.getElementById(section + '-empty');
  const pagination = document.getElementById(section + '-pagination');
  const items = dataCache[section] || [];

  if (!grid) return;

  const state = paginationState[section];
  const totalPages = Math.ceil(items.length / state.perPage) || 1;
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page - 1) * state.perPage;
  const pageItems = items.slice(start, start + state.perPage);

  if (items.length === 0) {
    grid.innerHTML = '';
    grid.classList.add('hidden');
    empty.classList.remove('hidden');
    pagination.innerHTML = '';
    return;
  }

  grid.classList.remove('hidden');
  empty.classList.add('hidden');

  grid.innerHTML = pageItems.map(item => {
    const videoId = extractYouTubeId(item.youtube_url);
    return `
      <div class="glass rounded-2xl overflow-hidden card-hover cursor-pointer" onclick="playVideoInline(this, '${videoId}')">
        <div class="aspect-video relative overflow-hidden bg-dark-300">
          ${videoId 
            ? `<img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" class="w-full h-full object-cover">` 
            : '<div class="flex items-center justify-center h-full"><i class="fas fa-video text-gray-400"></i></div>'
          }
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <i class="fas fa-play text-emnBlue text-sm"></i>
            </div>
          </div>
        </div>
        <div class="p-4">
          <h3 class="font-semibold text-[#188ab8] text-sm line-clamp-2">${escapeHtml(item.title)}</h3>
        </div>
      </div>
    `;
  }).join('');

  // Pagination
  if (totalPages > 1) {
    pagination.innerHTML = `
      <button onclick="changePage('${section}', ${state.page - 1})" class="w-10 h-10 rounded-lg glass flex items-center justify-center ${state.page <= 1 ? 'opacity-30 pointer-events-none' : 'hover:bg-primary-500/20'} transition" ${state.page <= 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left text-sm"></i>
      </button>
      ${Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
        const pageNum = i + 1;
        return `
          <button onclick="changePage('${section}', ${pageNum})" class="w-10 h-10 rounded-lg flex items-center justify-center transition text-sm font-medium ${pageNum === state.page ? 'btn-gold' : 'glass hover:bg-primary-500/20 text-gray-400'}">${pageNum}</button>
        `;
      }).join('')}
      <button onclick="changePage('${section}', ${state.page + 1})" class="w-10 h-10 rounded-lg glass flex items-center justify-center ${state.page >= totalPages ? 'opacity-30 pointer-events-none' : 'hover:bg-primary-500/20'} transition" ${state.page >= totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right text-sm"></i>
      </button>
    `;
  } else {
    pagination.innerHTML = '';
  }
}

function changePage(section, page) {
  paginationState[section].page = page;
  renderVideoSection(section);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// YOUTUBE HELPERS
// ============================================================
function extractYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// ============================================================
// SEARCH
// ============================================================
function handleSearch(query) {
  const homeMain = document.getElementById('home-main-content');
  const searchArea = document.getElementById('home-search-results');
  const searchGrid = document.getElementById('home-search-grid');
  const searchEmpty = document.getElementById('home-search-empty');
  const searchTitle = document.getElementById('home-search-title');

  if (!homeMain || !searchArea) return;

  // Si recherche vide, revenir à l'accueil normal
  if (!query || query.trim().length < 2) {
    homeMain.classList.remove('hidden');
    searchArea.classList.add('hidden');
    return;
  }

  stopAllVideos();

  // Si on n'est pas à l'accueil, naviguer vers l'accueil
  if (currentSection !== 'accueil') {
    navigateTo('accueil');
  }

  const q = query.toLowerCase().trim();
  let results = [];

  // Rechercher dans toutes les sections
  const sections = ['presse', 'audiovisuel', 'emissions', 'spots', 'nocomment'];
  
  sections.forEach(section => {
    (dataCache[section] || []).forEach(item => {
      const title = (item.title || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      if (title.includes(q) || desc.includes(q)) {
        results.push({ ...item, section });
      }
    });
  });

  // Cacher l'accueil, montrer la zone de recherche
  homeMain.classList.add('hidden');
  searchArea.classList.remove('hidden');
  searchTitle.textContent = `Résultats pour "${query}" (${results.length})`;

  if (results.length === 0) {
    searchGrid.classList.add('hidden');
    searchEmpty.classList.remove('hidden');
    return;
  }

  searchGrid.classList.remove('hidden');
  searchEmpty.classList.add('hidden');

  // Afficher les résultats
  const sectionLabels = {
    presse: 'Presse Écrite',
    audiovisuel: 'Audio-visuel',
    emissions: 'Émissions',
    spots: 'Spots Publicitaires',
    nocomment: 'No-Comment'
  };

  searchGrid.innerHTML = results.map(item => {
    const isPresse = item.section === 'presse';
    const videoId = isPresse ? null : extractYouTubeId(item.youtube_url);
    
    if (isPresse) {
      return `
        <div class="glass rounded-2xl overflow-hidden card-hover cursor-pointer" onclick="openArticleModal(${item.id})">
          <div class="relative aspect-video overflow-hidden">
            <img src="${item.image_url || 'https://via.placeholder.com/640x360'}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover">
          </div>
          <div class="p-4">
            <span class="text-xs text-primary-400 font-medium">${sectionLabels[item.section]}</span>
            <h3 class="font-bold text-[#188ab8] mt-1 text-lg line-clamp-2">${escapeHtml(item.title)}</h3>
            ${item.description ? `<p class="text-gray-600 text-xs mt-1 line-clamp-2">${escapeHtml(item.description)}</p>` : ''}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="glass rounded-2xl overflow-hidden card-hover cursor-pointer" onclick="playVideoInline(this, '${videoId || ''}')">
          <div class="relative aspect-video overflow-hidden bg-dark-300 flex items-center justify-center">
            ${videoId ? `
              <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <i class="fas fa-play text-emnBlue text-sm"></i>
                </div>
              </div>
            ` : `
              <div class="aspect-video bg-dark-300 flex items-center justify-center">
                <i class="fas fa-video text-3xl text-gray-600"></i>
              </div>
            `}
          </div>
          <div class="p-4">
            <span class="text-xs text-primary-400 font-medium">${sectionLabels[item.section]}</span>
            <h3 class="font-bold text-[#188ab8] mt-1 text-sm line-clamp-2">${escapeHtml(item.title)}</h3>
          </div>
        </div>
      `;
    }
  }).join('');
}

// ============================================================
// DASHBOARD TABS & RENDERING
// ============================================================
function switchDashTab(tab) {
  currentDashTab = tab;
  document.querySelectorAll('.dash-tab').forEach(t => {
    t.classList.remove('tab-active');
    t.classList.add('text-gray-400');
  });
  const activeTab = document.querySelector(`.dash-tab[data-tab="${tab}"]`);
  if (activeTab) {
    activeTab.classList.add('tab-active');
    activeTab.classList.remove('text-gray-400');
  }
  renderCurrentDashTab();
}

function renderCurrentDashTab() {
  const content = document.getElementById('dashboard-content');
  if (!content) return;

  if (currentDashTab === 'reorder') {
    renderReorderTab(content);
  } else if (currentDashTab === 'presse') {
    renderPresseDashTab(content);
  } else {
    renderVideoDashTab(content, currentDashTab);
  }
}

// --- Presse Dashboard Tab ---
function renderPresseDashTab(container) {
  const items = dataCache.presse || [];
  container.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <h4 class="text-lg font-semibold text-emnBlue">Articles (${items.length})</h4>
      <button onclick="showPresseForm()" class="btn-gold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"><i class="fas fa-plus"></i> Ajouter un article</button>
    </div>
    <div id="presse-form-container"></div>
    <div class="space-y-3">
      ${items.map(item => `
        <div class="bg-gray-50 rounded-xl p-4 flex items-center gap-4 group hover:border-emnBlue/30 border border-transparent transition">
          <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            <img src="${item.image_url || 'https://via.placeholder.com/200x200'}" alt="" class="w-full h-full object-cover">
          </div>
          <div class="flex-1 min-w-0">
            <h5 class="font-medium text-emnBlue text-sm truncate">${escapeHtml(item.title)}</h5>
            <p class="text-gray-500 text-xs truncate">${escapeHtml(item.description || '')}</p>
          </div>
          <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
            <button onclick="editPresseItem(${item.id})" class="w-8 h-8 rounded-lg bg-emnBlue/10 flex items-center justify-center text-emnBlue hover:bg-emnBlue/20 transition"><i class="fas fa-pen text-xs"></i></button>
            <button onclick="deleteItem('presse', ${item.id})" class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition"><i class="fas fa-trash text-xs"></i></button>
          </div>
        </div>
      `).join('')}
      ${items.length === 0 ? '<p class="text-center text-gray-500 py-8">Aucun article. Ajoutez votre premier article !</p>' : ''}
    </div>
  `;
}

function showPresseForm(existing = null) {
  const container = document.getElementById('presse-form-container');
  const isEdit = existing !== null;
  const item = isEdit ? existing : {};

  container.innerHTML = `
    <div class="bg-gray-50 rounded-xl p-6 mb-6 border border-emnBlue/20">
      <h4 class="font-semibold text-emnBlue mb-4">${isEdit ? 'Modifier l\'article' : 'Nouvel article'}</h4>
      <div class="space-y-4">
        <div>
          <label class="text-sm text-gray-500 mb-1 block">Titre *</label>
          <input type="text" id="presse-title" value="${escapeHtml(item.title || '')}" class="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-emnBlue focus:border-emnBlue focus:outline-none transition text-sm" placeholder="Titre de l'article">
        </div>
        <div>
          <label class="text-sm text-gray-500 mb-1 block">Description</label>
          <textarea id="presse-desc" rows="4" class="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-emnBlue focus:border-emnBlue focus:outline-none transition text-sm resize-none" placeholder="Description de l'article">${escapeHtml(item.description || '')}</textarea>
        </div>
        <div>
          <label class="text-sm text-gray-500 mb-1 block">Image</label>
          <div class="flex gap-3">
            <input type="text" id="presse-img" value="${escapeHtml(item.image_url || '')}" class="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-emnBlue focus:border-emnBlue focus:outline-none transition text-sm" placeholder="URL de l'image">
            <button onclick="uploadPresseImage()" class="px-4 py-3 rounded-xl bg-gray-100 hover:bg-emnBlue/10 text-emnBlue text-sm transition flex items-center gap-2 border border-gray-200"><i class="fas fa-cloud-arrow-up"></i> Uploader</button>
          </div>
        </div>
        <div class="flex gap-3 pt-2">
          <button onclick="savePresseItem(${isEdit ? item.id : 'null'})" class="bg-emnBlue text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition"><i class="fas fa-save mr-2"></i>${isEdit ? 'Mettre à jour' : 'Ajouter'}</button>
          <button onclick="document.getElementById('presse-form-container').innerHTML=''" class="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm transition font-medium">Annuler</button>
        </div>
      </div>
    </div>
  `;
}

function editPresseItem(id) {
  const item = dataCache.presse.find(a => a.id === id);
  if (item) showPresseForm(item);
}

async function savePresseItem(existingId) {
  const title = document.getElementById('presse-title')?.value?.trim();
  const desc = document.getElementById('presse-desc')?.value?.trim();
  const img = document.getElementById('presse-img')?.value?.trim();

  if (!title) {
    showNotification('Le titre est obligatoire', 'error');
    return;
  }

  const item = { title, description: desc, image_url: img };

  if (existingId) {
    await updateItem('presse', existingId, item);
  } else {
    await addItem('presse', item);
  }

  document.getElementById('presse-form-container').innerHTML = '';
  renderPresse();
}

function uploadPresseImage() {
  openCloudinaryWidget((url) => {
    const input = document.getElementById('presse-img');
    if (input) input.value = url;
    showNotification('Image uploadée !', 'success');
  });
}

// --- Video Dashboard Tabs ---
function renderVideoDashTab(container, section) {
  const sectionLabels = { audiovisuel: 'Audio-visuel', emissions: 'Émissions', spots: 'Spots Publicitaires', nocomment: 'No-Comment' };
  const items = dataCache[section] || [];

  container.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <h4 class="text-lg font-semibold text-emnBlue">${sectionLabels[section]} (${items.length})</h4>
      <button onclick="showVideoForm('${section}')" class="btn-gold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"><i class="fas fa-plus"></i> Ajouter une vidéo</button>
    </div>
    <div id="video-form-container"></div>
    <div class="space-y-3">
      ${items.map(item => {
        const videoId = extractYouTubeId(item.youtube_url);
        return `
          <div class="bg-gray-50 rounded-xl p-4 flex items-center gap-4 group hover:border-emnBlue/30 border border-transparent transition">
            ${videoId ? `
              <div class="w-24 h-14 rounded-lg overflow-hidden flex-shrink-0 relative">
                <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" class="w-full h-full object-cover">
              </div>
            ` : `
              <div class="w-24 h-14 rounded-lg bg-gray-200 flex-shrink-0 flex items-center justify-center"><i class="fas fa-video text-gray-400"></i></div>
            `}
            <div class="flex-1 min-w-0">
              <h5 class="font-medium text-emnBlue text-sm truncate">${escapeHtml(item.title)}</h5>
              <p class="text-gray-500 text-xs truncate">${escapeHtml(item.youtube_url || '')}</p>
            </div>
            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
              <button onclick="editVideoItem('${section}', ${item.id})" class="w-8 h-8 rounded-lg bg-emnBlue/10 flex items-center justify-center text-emnBlue hover:bg-emnBlue/20 transition"><i class="fas fa-pen text-xs"></i></button>
              <button onclick="deleteItem('${section}', ${item.id})" class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition"><i class="fas fa-trash text-xs"></i></button>
            </div>
          </div>
        `;
      }).join('')}
      ${items.length === 0 ? `<p class="text-center text-gray-500 py-8">Aucun contenu. Ajoutez votre premier élément !</p>` : ''}
    </div>
  `;
}

function showVideoForm(section, existing = null) {
  const sectionLabels = { audiovisuel: 'Audio-visuel', emissions: 'Émission', spots: 'Spot publicitaire', nocomment: 'No-Comment' };
  const isEdit = existing !== null;
  const item = isEdit ? existing : {};
  const container = document.getElementById('video-form-container');

  container.innerHTML = `
    <div class="bg-gray-50 rounded-xl p-6 mb-6 border border-emnBlue/20">
      <h4 class="font-semibold text-emnBlue mb-4">${isEdit ? 'Modifier' : 'Nouveau'} ${sectionLabels[section]}</h4>
      <div class="space-y-4">
        <div>
          <label class="text-sm text-gray-500 mb-1 block">Titre *</label>
          <input type="text" id="video-title" value="${escapeHtml(item.title || '')}" class="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-emnBlue focus:border-emnBlue focus:outline-none transition text-sm" placeholder="Titre de la vidéo">
        </div>
        <div>
          <label class="text-sm text-gray-500 mb-1 block">URL YouTube *</label>
          <input type="text" id="video-url" value="${escapeHtml(item.youtube_url || '')}" class="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-emnBlue focus:border-emnBlue focus:outline-none transition text-sm" placeholder="https://www.youtube.com/watch?v=...">
        </div>
        <div class="flex gap-3 pt-2">
          <button onclick="saveVideoItem('${section}', ${isEdit ? item.id : 'null'})" class="bg-emnBlue text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition"><i class="fas fa-save mr-2"></i>${isEdit ? 'Mettre à jour' : 'Ajouter'}</button>
          <button onclick="document.getElementById('video-form-container').innerHTML=''" class="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm transition font-medium">Annuler</button>
        </div>
      </div>
    </div>
  `;
}

function editVideoItem(section, id) {
  const item = dataCache[section].find(a => a.id === id);
  if (item) showVideoForm(section, item);
}

async function saveVideoItem(section, existingId) {
  const title = document.getElementById('video-title')?.value?.trim();
  const url = document.getElementById('video-url')?.value?.trim();

  if (!title || !url) {
    showNotification('Le titre et l\'URL YouTube sont obligatoires', 'error');
    return;
  }

  const item = { title, youtube_url: url };

  if (existingId) {
    await updateItem(section, existingId, item);
  } else {
    await addItem(section, item);
  }

  document.getElementById('video-form-container').innerHTML = '';
  renderVideoSection(section);
}

// --- Reorder Tab ---
function renderReorderTab(container) {
  const sections = ['presse', 'audiovisuel', 'emissions', 'spots', 'nocomment'];
  const sectionLabels = { presse: 'Presse Écrite', audiovisuel: 'Audio-visuel', emissions: 'Émissions', spots: 'Spots Publicitaires', nocomment: 'No-Comment' };

  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-wrap gap-2 mb-4">
        ${sections.map(s => `
          <button onclick="this.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('tab-active'));this.classList.add('tab-active');loadReorderList('${s}')" class="px-4 py-2 rounded-xl text-sm transition bg-gray-100 hover:bg-emnBlue/10 text-emnBlue font-medium ${s === 'presse' ? 'tab-active' : ''}" data-reorder-section="${s}">${sectionLabels[s]}</button>
        `).join('')}
      </div>
      <div id="reorder-list" class="space-y-2"></div>
      <div class="flex flex-wrap gap-3 mt-6">
        <button onclick="saveReorder()" class="bg-emnBlue text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition flex items-center gap-2"><i class="fas fa-save"></i> Sauvegarder l'ordre</button>
        <button onclick="downloadBackup()" class="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm flex items-center gap-2 transition font-medium"><i class="fas fa-download"></i> Télécharger sauvegarde</button>
      </div>
    </div>
  `;

  loadReorderList('presse');
}

let reorderSection = 'presse';

function loadReorderList(section) {
  reorderSection = section;
  const list = document.getElementById('reorder-list');
  if (!list) return;
  const items = dataCache[section] || [];

  if (items.length === 0) {
    list.innerHTML = '<p class="text-center text-gray-500 py-8">Aucun élément à réorganiser</p>';
    return;
  }

  list.innerHTML = items.map((item, index) => `
    <div class="bg-gray-50 border border-transparent rounded-xl p-3 flex items-center gap-3 cursor-grab transition hover:border-emnBlue/30" draggable="true" data-reorder-id="${item.id}" ondragstart="onDragStart(event)" ondragover="onDragOver(event)" ondrop="onDrop(event)" ondragend="onDragEnd(event)">
      <div class="w-6 h-6 flex items-center justify-center text-gray-500"><i class="fas fa-grip-vertical"></i></div>
      <span class="w-6 h-6 rounded-full bg-emnBlue/10 flex items-center justify-center text-emnBlue text-xs font-medium">${index + 1}</span>
      <span class="flex-1 text-sm text-emnBlue truncate">${escapeHtml(item.title)}</span>
    </div>
  `).join('');
}

let draggedItem = null;

function onDragStart(e) {
  draggedItem = e.target.closest('[data-reorder-id]');
  if (draggedItem) {
    draggedItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedItem.dataset.reorderId);
  }
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.target.closest('[data-reorder-id]');
  if (target && target !== draggedItem) {
    target.classList.add('drag-over');
  }
}

function onDrop(e) {
  e.preventDefault();
  const target = e.target.closest('[data-reorder-id]');
  if (target && draggedItem && target !== draggedItem) {
    const list = document.getElementById('reorder-list');
    const items = [...list.children];
    const fromIndex = items.indexOf(draggedItem);
    const toIndex = items.indexOf(target);
    if (fromIndex < toIndex) {
      target.after(draggedItem);
    } else {
      target.before(draggedItem);
    }
    list.querySelectorAll('[data-reorder-id]').forEach((el, i) => {
      const num = el.querySelector('.rounded-full');
      if (num) num.textContent = i + 1;
    });
  }
  target?.classList.remove('drag-over');
}

function onDragEnd(e) {
  if (draggedItem) draggedItem.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  draggedItem = null;
}

async function saveReorder() {
  const list = document.getElementById('reorder-list');
  if (!list) return;

  const items = [...list.querySelectorAll('[data-reorder-id]')];
  const updates = items.map((el, i) => ({
    id: parseInt(el.dataset.reorderId),
    position: i
  }));

  await updatePositions(reorderSection, updates);
}

function downloadBackup() {
  const backup = JSON.stringify(dataCache, null, 2);
  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `emn-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('Sauvegarde téléchargée !', 'success');
}

// ============================================================
// CLOUDINARY UPLOAD
// ============================================================
function openCloudinaryWidget(callback) {
  if (window.cloudinary) {
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET,
        apiKey: CLOUDINARY_API_KEY,
        sources: ['local', 'url'],
        cropping: false,  // Désactiver temporairement pour éviter les erreurs
        multiple: false,
        resourceType: 'image',
        clientAllowedFormats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
        maxFileSize: 5000000, // 5MB max
        showPoweredBy: false,
        styles: {
          palette: {
            window: '#0f172a',
            windowBorder: '#f59e0b',
            tabIcon: '#f59e0b',
            tab: '#1e293b',
            textPlaceholder: '#94a3b8'
          }
        }
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary error:', error);
          showNotification('Erreur: ' + (error.message || 'Upload failed'), 'error');
          return;
        }
        
        if (result.event === 'success') {
          callback(result.info.secure_url);
          showNotification('Image uploadée avec succès!', 'success');
        }
      }
    );
    widget.open();
  } else {
    // Fallback si Cloudinary n'est pas chargé
    const url = prompt('Entrez l\'URL de l\'image (ou utilisez un hébergement gratuit) :');
    if (url) callback(url);
  }
}

function loadCloudinaryScript() {
  return new Promise((resolve) => {
    if (window.cloudinary) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://widget.cloudinary.com/v2.0/global/all.js';
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
  });
}

// ============================================================
// UI UTILITIES
// ============================================================
function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  const colors = {
    success: 'bg-green-500/20 border-green-500/30 text-green-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    info: 'bg-primary-500/20 border-primary-500/30 text-primary-400',
    warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
  };
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle'
  };

  const notif = document.createElement('div');
  notif.className = `notification flex items-center gap-3 px-5 py-4 rounded-xl border ${colors[type] || colors.info} shadow-xl backdrop-blur-md text-sm`;
  notif.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span class="flex-1">${message}</span><button onclick="this.parentElement.remove()" class="opacity-50 hover:opacity-100"><i class="fas fa-times text-xs"></i></button>`;
  container.appendChild(notif);

  requestAnimationFrame(() => notif.classList.add('show'));

  setTimeout(() => {
    notif.classList.remove('show');
    setTimeout(() => notif.remove(), 400);
  }, 4000);
}

function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.remove('opacity-0', 'pointer-events-none');
      btn.classList.add('opacity-100', 'pointer-events-auto');
    } else {
      btn.classList.add('opacity-0', 'pointer-events-none');
      btn.classList.remove('opacity-100', 'pointer-events-auto');
    }
  });
}

function initHeaderScroll() {
  const header = document.getElementById('main-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('shadow-xl');
      header.style.borderBottom = '1px solid rgba(245,158,11,0.1)';
    } else {
      header.classList.remove('shadow-xl');
      header.style.borderBottom = 'none';
    }
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function downloadBrochure() {
  showNotification('Téléchargement de la brochure en cours...', 'info');
  const link = document.createElement('a');
  link.href = 'Brochure.pdf';
  link.download = 'Brochure.pdf';
  link.click();
}

// ============================================================
// INITIALIZATION
// ============================================================
loadCloudinaryScript();
