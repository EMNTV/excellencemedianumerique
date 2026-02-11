// script.js - VERSION FINALE 100% CLOUDINARY ✅
document.addEventListener('DOMContentLoaded', async function() {
    
    // ================ VARIABLES GLOBALES ================
    let isAdmin = false;
    let currentEditingId = null;
    let currentReorderType = 'presse';
    let currentReorderItemId = null;
    let isSearching = false;
    
    // Pagination
    let currentAudioPage = 1;
    let currentEmissionPage = 1;
    let currentSpotPage = 1;
    let currentNocommentPage = 1;
    const videosPerPage = 3;
    
    // ================ INITIALISATION ================
    async function init() {
        console.log("=== INITIALISATION ===");
        
        // 1. Attendre le chargement des données Cloudinary
        if (window.ExcellenceMediaData) {
            await window.ExcellenceMediaData.load();
        }
        
        // 2. Initialiser l'interface
        await refreshAllSections();
        initEventListeners();
        initDashboardTabs();
        initDashboardForms();
        
        console.log("✅ Application prête");
    }
    
    // ================ RAFRAÎCHISSEMENT ================
    async function refreshAllSections() {
        await loadPressData();
        await loadVideoData('audioVisuel', currentAudioPage);
        await loadVideoData('emission', currentEmissionPage);
        await loadVideoData('spot', currentSpotPage);
        await loadVideoData('nocomment', currentNocommentPage);
    }
    
    // ================ CHARGEMENT PRESSE ================
    async function loadPressData() {
        const container = document.getElementById('pressEcriteScroll');
        if (!container) return;
        
        container.innerHTML = '';
        const pressData = window.ExcellenceMediaData?.pressData || [];
        
        if (pressData.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-newspaper"></i><p>Aucun article disponible</p></div>';
            return;
        }
        
        pressData.forEach(item => {
            const article = document.createElement('div');
            article.className = 'press-ecrite-item';
            article.dataset.id = item.id;
            article.innerHTML = `
                <img src="${item.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'}" 
                     alt="${escapeHTML(item.title)}" 
                     class="press-ecrite-img" 
                     loading="lazy">
                <div class="press-ecrite-title">${escapeHTML(item.title)}</div>
            `;
            article.onclick = () => openPressModal(item);
            container.appendChild(article);
        });
    }
    
    // ================ CHARGEMENT VIDÉOS ================
    async function loadVideoData(sectionId, page) {
        if (isSearching) return;
        
        const container = document.getElementById(`${sectionId}Videos`);
        const pagination = document.getElementById(`${sectionId}Pagination`);
        if (!container) return;
        
        container.innerHTML = '';
        
        let data = [];
        if (sectionId === 'audioVisuel') data = window.ExcellenceMediaData?.audioVisuelData || [];
        if (sectionId === 'emission') data = window.ExcellenceMediaData?.emissionData || [];
        if (sectionId === 'spot') data = window.ExcellenceMediaData?.spotData || [];
        if (sectionId === 'nocomment') data = window.ExcellenceMediaData?.nocommentData || [];
        
        if (data.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-video"></i><p>Aucune vidéo disponible</p></div>`;
            if (pagination) pagination.innerHTML = '';
            return;
        }
        
        const start = (page - 1) * videosPerPage;
        const end = start + videosPerPage;
        
        data.slice(start, end).forEach(item => {
            const video = document.createElement('div');
            video.className = 'video-item';
            video.innerHTML = `
                <div class="video-wrapper">
                    <iframe src="${item.url}" 
                            title="${escapeHTML(item.title)}" 
                            allowfullscreen loading="lazy">
                    </iframe>
                </div>
                <div class="video-info">
                    <div class="video-title">${escapeHTML(item.title)}</div>
                </div>
            `;
            container.appendChild(video);
        });
        
        if (pagination) generatePagination(data.length, page, sectionId, pagination);
    }
    
    // ================ PAGINATION ================
    function generatePagination(total, current, sectionId, container) {
        const totalPages = Math.ceil(total / videosPerPage);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        if (current > 1) {
            html += `<button class="page-btn" onclick="window.changePage('${sectionId}', ${current - 1})">Précédent</button>`;
        }
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= current - 2 && i <= current + 2)) {
                html += `<button class="page-btn ${i === current ? 'active' : ''}" 
                               onclick="window.changePage('${sectionId}', ${i})">${i}</button>`;
            } else if (i === current - 3 || i === current + 3) {
                html += `<span class="page-dots">...</span>`;
            }
        }
        
        if (current < totalPages) {
            html += `<button class="page-btn" onclick="window.changePage('${sectionId}', ${current + 1})">Suivant</button>`;
        }
        
        container.innerHTML = html;
    }
    
    window.changePage = function(sectionId, page) {
        if (sectionId === 'audioVisuel') { currentAudioPage = page; loadVideoData('audioVisuel', page); }
        if (sectionId === 'emission') { currentEmissionPage = page; loadVideoData('emission', page); }
        if (sectionId === 'spot') { currentSpotPage = page; loadVideoData('spot', page); }
        if (sectionId === 'nocomment') { currentNocommentPage = page; loadVideoData('nocomment', page); }
    };
    
    // ================ AJOUT D'ARTICLE - CORRIGÉ ! ================
    window.addArticle = async function() {
        console.log("📝 Ajout article...");
        
        const title = document.getElementById('articleTitle')?.value.trim();
        const description = document.getElementById('articleDescription')?.value.trim();
        const imageInput = document.getElementById('articleImage');
        
        if (!title || !description) {
            alert('Veuillez remplir tous les champs');
            return;
        }
        
        // Désactiver le bouton
        const btn = document.getElementById('addArticle');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...'; }
        
        try {
            // 1. Upload image si présente
            let imageUrl = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';
            
            if (imageInput?.files?.[0]) {
                const upload = await CloudinaryConfig.uploadImage(imageInput.files[0]);
                if (upload?.success) imageUrl = upload.url;
            }
            
            // 2. Créer l'article
            const article = { title, description, image: imageUrl };
            
            // 3. Sauvegarder sur Cloudinary
            const result = await ExcellenceMediaData.addPressArticle(article);
            
            if (result?.success) {
                // 4. FORCER LE RECHARGEMENT COMPLET
                await ExcellenceMediaData.load();
                await loadPressData();
                await loadArticlesList();
                await loadReorderList('reorderPress', ExcellenceMediaData.pressData);
                
                // 5. Réinitialiser le formulaire
                document.getElementById('articleTitle').value = '';
                document.getElementById('articleDescription').value = '';
                if (imageInput) imageInput.value = '';
                document.getElementById('imagePreview').innerHTML = '';
                
                alert('✅ Article ajouté avec succès !');
            }
        } catch (error) {
            console.error('❌ Erreur:', error);
            alert('❌ Erreur lors de l\'ajout');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Ajouter Article'; }
        }
    };
    
    // ================ MODAL PRESSE ================
    window.openPressModal = function(item) {
        document.getElementById('modalTitle').textContent = item.title;
        document.getElementById('modalImage').src = item.image;
        document.getElementById('modalDescription').textContent = item.description;
        document.getElementById('pressModal').style.display = 'flex';
    };
    
    window.closePressModal = function() {
        document.getElementById('pressModal').style.display = 'none';
    };
    
    // ================ DASHBOARD ================
    window.openDashboard = function() {
        if (!isAdmin) {
            document.getElementById('passwordModal').style.display = 'flex';
            return;
        }
        
        document.getElementById('dashboardModal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Charger les listes
        loadArticlesList();
        loadVideosList('audio', ExcellenceMediaData?.audioVisuelData || []);
        loadVideosList('emission', ExcellenceMediaData?.emissionData || []);
        loadVideosList('spot', ExcellenceMediaData?.spotData || []);
        loadVideosList('nocomment', ExcellenceMediaData?.nocommentData || []);
        loadReorderLists();
    };
    
    window.closeDashboard = function() {
        document.getElementById('dashboardModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    };
    
    // ================ LISTES DASHBOARD ================
    async function loadArticlesList() {
        const container = document.getElementById('articlesList');
        if (!container) return;
        
        container.innerHTML = '';
        const data = ExcellenceMediaData?.pressData || [];
        
        if (data.length === 0) {
            container.innerHTML = '<p class="section-empty">Aucun article</p>';
            return;
        }
        
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'sortable-item';
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <i class="fas fa-grip-vertical"></i>
                    <strong>${escapeHTML(item.title)}</strong>
                </div>
                <div>
                    <button class="btn btn-edit btn-sm" onclick="editArticle('${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteArticle('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    
    window.editArticle = async function(id) {
        const article = ExcellenceMediaData?.pressData.find(a => a.id === id);
        if (!article) return;
        
        document.getElementById('articleTitle').value = article.title;
        document.getElementById('articleDescription').value = article.description;
        document.getElementById('addArticle').style.display = 'none';
        document.getElementById('updateArticle').style.display = 'inline-block';
        
        currentEditingId = { type: 'article', id };
    };
    
    window.updateArticle = async function() {
        if (!currentEditingId) return;
        
        const title = document.getElementById('articleTitle').value.trim();
        const description = document.getElementById('articleDescription').value.trim();
        
        if (!title || !description) {
            alert('Veuillez remplir tous les champs');
            return;
        }
        
        await ExcellenceMediaData.updatePressArticle(currentEditingId.id, { title, description });
        await ExcellenceMediaData.load();
        await loadPressData();
        await loadArticlesList();
        
        document.getElementById('articleTitle').value = '';
        document.getElementById('articleDescription').value = '';
        document.getElementById('addArticle').style.display = 'inline-block';
        document.getElementById('updateArticle').style.display = 'none';
        currentEditingId = null;
    };
    
    window.deleteArticle = async function(id) {
        if (!confirm('Supprimer cet article ?')) return;
        await ExcellenceMediaData.deletePressArticle(id);
        await ExcellenceMediaData.load();
        await loadPressData();
        await loadArticlesList();
    };
    
    // ================ VIDÉOS ================
    window.addVideo = async function(type) {
        const title = document.getElementById(`${type}Title`)?.value.trim();
        const url = document.getElementById(`${type}Url`)?.value.trim();
        
        if (!title || !url) {
            alert('Veuillez remplir tous les champs');
            return;
        }
        
        // Convertir URL YouTube
        let videoId = '';
        if (url.includes('youtube.com/watch?v=')) videoId = url.split('v=')[1].split('&')[0];
        else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
        else if (url.includes('embed/')) videoId = url.split('embed/')[1].split('?')[0];
        
        if (!videoId) {
            alert('URL YouTube invalide');
            return;
        }
        
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        
        await ExcellenceMediaData.addVideo(type, { title, url: embedUrl });
        await ExcellenceMediaData.load();
        
        // Rafraîchir
        if (type === 'audio') { await loadVideoData('audioVisuel', 1); currentAudioPage = 1; }
        if (type === 'emission') { await loadVideoData('emission', 1); currentEmissionPage = 1; }
        if (type === 'spot') { await loadVideoData('spot', 1); currentSpotPage = 1; }
        if (type === 'nocomment') { await loadVideoData('nocomment', 1); currentNocommentPage = 1; }
        
        document.getElementById(`${type}Title`).value = '';
        document.getElementById(`${type}Url`).value = '';
    };
    
    // ================ RÉORGANISATION ================
    async function loadReorderLists() {
        await loadReorderList('reorderPress', ExcellenceMediaData?.pressData || []);
        await loadReorderList('reorderAudio', ExcellenceMediaData?.audioVisuelData || []);
        await loadReorderList('reorderEmission', ExcellenceMediaData?.emissionData || []);
        await loadReorderList('reorderSpot', ExcellenceMediaData?.spotData || []);
        await loadReorderList('reorderNocomment', ExcellenceMediaData?.nocommentData || []);
    }
    
    async function loadReorderList(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (data.length === 0) {
            container.innerHTML = '<li class="sortable-item empty-state">Aucun élément</li>';
            return;
        }
        
        data.forEach(item => {
            const li = document.createElement('li');
            li.className = 'sortable-item';
            li.dataset.id = item.id;
            li.innerHTML = `
                <div class="item-content">
                    <i class="fas fa-grip-vertical"></i>
                    <span class="item-title">${escapeHTML(item.title)}</span>
                </div>
            `;
            container.appendChild(li);
        });
    }
    
    window.saveNewOrder = async function() {
        const pressOrder = Array.from(document.querySelectorAll('#reorderPress .sortable-item')).map(el => el.dataset.id);
        if (pressOrder.length) await ExcellenceMediaData.reorderSection('pressData', pressOrder);
        
        await ExcellenceMediaData.load();
        await loadPressData();
        alert('✅ Ordre sauvegardé');
    };
    
    // ================ GOOGLE SIGN-IN ================
    window.handleGoogleSignIn = function(response) {
        try {
            const token = response.credential;
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            if (payload.email === 'excellencemedianumerique@gmail.com') {
                isAdmin = true;
                document.getElementById('passwordModal').style.display = 'none';
                sessionStorage.setItem('userEmail', payload.email);
                openDashboard();
            }
        } catch (e) {
            console.error('Erreur Google:', e);
        }
    };
    
    // ================ UTILITAIRES ================
    function escapeHTML(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // ================ ÉVÉNEMENTS ================
    function initEventListeners() {
        // Navigation
        document.getElementById('navToggle')?.addEventListener('click', function() {
            document.getElementById('navMenu')?.classList.toggle('active');
        });
        
        // Dashboard link
        document.getElementById('dashboardLink')?.addEventListener('click', function(e) {
            e.preventDefault();
            openDashboard();
        });
        
        // Fermeture modales
        document.getElementById('closeModal')?.addEventListener('click', closePressModal);
        document.getElementById('closeDashboard')?.addEventListener('click', closeDashboard);
        document.getElementById('cancelPassword')?.addEventListener('click', function() {
            document.getElementById('passwordModal').style.display = 'none';
        });
        
        // Scroll presse
        document.getElementById('scrollLeftBtn')?.addEventListener('click', function() {
            document.getElementById('pressEcriteScroll')?.scrollBy({ left: -300, behavior: 'smooth' });
        });
        document.getElementById('scrollRightBtn')?.addEventListener('click', function() {
            document.getElementById('pressEcriteScroll')?.scrollBy({ left: 300, behavior: 'smooth' });
        });
        
        // Boutons formulaire
        document.getElementById('addArticle')?.addEventListener('click', window.addArticle);
        document.getElementById('updateArticle')?.addEventListener('click', window.updateArticle);
        document.getElementById('cancelEdit')?.addEventListener('click', function() {
            document.getElementById('articleTitle').value = '';
            document.getElementById('articleDescription').value = '';
            document.getElementById('articleImage').value = '';
            document.getElementById('imagePreview').innerHTML = '';
            document.getElementById('addArticle').style.display = 'inline-block';
            document.getElementById('updateArticle').style.display = 'none';
            currentEditingId = null;
        });
        
        // Boutons vidéos
        document.getElementById('addAudioVideo')?.addEventListener('click', () => window.addVideo('audio'));
        document.getElementById('addEmission')?.addEventListener('click', () => window.addVideo('emission'));
        document.getElementById('addSpot')?.addEventListener('click', () => window.addVideo('spot'));
        document.getElementById('addNocomment')?.addEventListener('click', () => window.addVideo('nocomment'));
        
        // Sauvegarder ordre
        document.getElementById('saveOrder')?.addEventListener('click', window.saveNewOrder);
    }
    
    function initDashboardTabs() {
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                if (this.dataset.tab === 'logout') {
                    isAdmin = false;
                    sessionStorage.clear();
                    closeDashboard();
                    return;
                }
                
                document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                this.classList.add('active');
                document.getElementById(`${this.dataset.tab}-tab`)?.classList.add('active');
            });
        });
    }
    
    function initDashboardForms() {
        // Preview image
        document.getElementById('articleImage')?.addEventListener('change', function(e) {
            if (e.target.files?.[0]) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    document.getElementById('imagePreview').innerHTML = 
                        `<img src="${ev.target.result}" style="max-width:200px; margin-top:10px; border-radius:5px;">`;
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }
    
    // ================ DÉMARRAGE ================
    await init();
    
    // Exposer globalement
    window.loadPressData = loadPressData;
    window.loadVideoData = loadVideoData;
    window.loadArticlesList = loadArticlesList;
    window.loadVideosList = loadVideosList;
    window.loadReorderLists = loadReorderLists;
    window.loadReorderList = loadReorderList;
});
