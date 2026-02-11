// script.js - VERSION FINALE COMPLÈTE ✅
document.addEventListener('DOMContentLoaded', async function() {
    
    // ================ VARIABLES GLOBALES ================
    let isAdmin = false;
    let currentEditingId = null;
    let currentReorderType = 'presse';
    let currentReorderItemId = null;
    let isSearching = false;
    let searchResults = {};
    
    // Pagination
    let currentAudioPage = 1;
    let currentEmissionPage = 1;
    let currentSpotPage = 1;
    let currentNocommentPage = 1;
    const videosPerPage = 3;
    
    // Email autorisé
    const allowedEmail = "excellencemedianumerique@gmail.com";
    
    // ================ INITIALISATION ================
    async function init() {
        console.log("=== INITIALISATION COMPLÈTE ===");
        
        // 1. Attendre le chargement des données Cloudinary
        if (window.ExcellenceMediaData) {
            await window.ExcellenceMediaData.load();
            console.log("✅ Données Cloudinary chargées");
        }
        
        // 2. Vérifier session admin
        checkExistingSession();
        
        // 3. Initialiser tous les composants
        initEventListeners();
        initDashboardTabs();
        initDashboardForms();
        initReorderSection();
        initReorderEditForm();
        initDragAndDrop();
        
        // 4. Charger toutes les sections
        await refreshAllSections();
        
        console.log("✅ Application initialisée avec succès");
    }
    
    // ================ GESTION SESSION ================
    function checkExistingSession() {
        const email = sessionStorage.getItem('userEmail');
        if (email === allowedEmail) {
            isAdmin = true;
            console.log("✅ Session admin restaurée");
        }
    }
    
    // ================ GOOGLE SIGN-IN ================
    window.handleGoogleSignIn = function(response) {
        console.log("🔐 Tentative de connexion Google...");
        
        try {
            // Décoder le token JWT
            const token = response.credential;
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(base64));
            
            console.log("📧 Email Google:", payload.email);
            
            if (payload.email === allowedEmail) {
                isAdmin = true;
                sessionStorage.setItem('userEmail', payload.email);
                
                document.getElementById('passwordModal').style.display = 'none';
                showNotification('✅ Connexion réussie', 'success');
                openDashboard();
            } else {
                showNotification('❌ Email non autorisé', 'error');
            }
        } catch (error) {
            console.error("❌ Erreur Google:", error);
            showNotification('Erreur de connexion', 'error');
        }
    };
    
    // ================ DÉCONNEXION ================
    window.logoutUser = function() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            isAdmin = false;
            sessionStorage.removeItem('userEmail');
            closeDashboard();
            showNotification('Déconnexion réussie', 'info');
        }
    };
    
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
            const article = createPressArticleElement(item);
            container.appendChild(article);
        });
    }
    
    function createPressArticleElement(item) {
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
        
        article.addEventListener('click', () => openPressModal(item));
        return article;
    }
    
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
            let icon = 'fas fa-video', message = 'Aucune vidéo disponible';
            if (sectionId === 'emission') { icon = 'fas fa-tv'; message = 'Aucune émission disponible'; }
            if (sectionId === 'spot') { icon = 'fas fa-ad'; message = 'Aucun spot disponible'; }
            if (sectionId === 'nocomment') { icon = 'fas fa-film'; message = 'Aucune vidéo disponible'; }
            
            container.innerHTML = `<div class="empty-state"><i class="${icon}"></i><p>${message}</p></div>`;
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
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen 
                            loading="lazy">
                    </iframe>
                </div>
                <div class="video-info">
                    <div class="video-title">${escapeHTML(item.title)}</div>
                    <div class="video-date">Ajouté le ${formatDate(item.dateAdded)}</div>
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
        
        const section = document.getElementById(sectionId);
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    };
    
    // ================ RECHERCHE ================
    window.performSearch = function() {
        const searchInput = document.getElementById('global-search');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (!searchTerm) {
            resetSearch();
            return;
        }
        
        isSearching = true;
        
        const pressData = window.ExcellenceMediaData?.pressData || [];
        const audioData = window.ExcellenceMediaData?.audioVisuelData || [];
        const emissionData = window.ExcellenceMediaData?.emissionData || [];
        const spotData = window.ExcellenceMediaData?.spotData || [];
        const nocommentData = window.ExcellenceMediaData?.nocommentData || [];
        
        searchResults = {
            press: pressData.filter(item => 
                item.title.toLowerCase().includes(searchTerm) || 
                item.description?.toLowerCase().includes(searchTerm)
            ),
            audio: audioData.filter(item => item.title.toLowerCase().includes(searchTerm)),
            emission: emissionData.filter(item => item.title.toLowerCase().includes(searchTerm)),
            spot: spotData.filter(item => item.title.toLowerCase().includes(searchTerm)),
            nocomment: nocommentData.filter(item => item.title.toLowerCase().includes(searchTerm))
        };
        
        displaySearchResults();
        
        const total = searchResults.press.length + searchResults.audio.length + 
                     searchResults.emission.length + searchResults.spot.length + 
                     searchResults.nocomment.length;
        
        showNotification(`${total} résultat(s) trouvé(s)`, 'info');
        document.getElementById('resetSearchBtn').style.display = 'block';
    };
    
    function displaySearchResults() {
        if (!isSearching) return;
        
        // Presse
        const pressContainer = document.getElementById('pressEcriteScroll');
        if (pressContainer) {
            pressContainer.innerHTML = '';
            if (searchResults.press.length === 0) {
                pressContainer.innerHTML = '<div class="empty-state"><i class="fas fa-newspaper"></i><p>Aucun article trouvé</p></div>';
            } else {
                searchResults.press.forEach(item => {
                    const article = createPressArticleElement(item);
                    pressContainer.appendChild(article);
                });
            }
        }
        
        // Vidéos
        displayVideoSearchResults('audioVisuel', searchResults.audio);
        displayVideoSearchResults('emission', searchResults.emission);
        displayVideoSearchResults('spot', searchResults.spot);
        displayVideoSearchResults('nocomment', searchResults.nocomment);
    }
    
    function displayVideoSearchResults(sectionId, data) {
        const container = document.getElementById(`${sectionId}Videos`);
        const pagination = document.getElementById(`${sectionId}Pagination`);
        if (!container) return;
        
        container.innerHTML = '';
        if (pagination) pagination.innerHTML = '';
        
        if (data.length === 0) {
            let icon = 'fas fa-video', message = 'Aucune vidéo trouvée';
            if (sectionId === 'emission') { icon = 'fas fa-tv'; message = 'Aucune émission trouvée'; }
            if (sectionId === 'spot') { icon = 'fas fa-ad'; message = 'Aucun spot trouvé'; }
            if (sectionId === 'nocomment') { icon = 'fas fa-film'; message = 'Aucune vidéo trouvée'; }
            
            container.innerHTML = `<div class="empty-state"><i class="${icon}"></i><p>${message}</p></div>`;
        } else {
            data.forEach(item => {
                const video = document.createElement('div');
                video.className = 'video-item';
                video.innerHTML = `
                    <div class="video-wrapper">
                        <iframe src="${item.url}" title="${escapeHTML(item.title)}" allowfullscreen loading="lazy"></iframe>
                    </div>
                    <div class="video-info">
                        <div class="video-title">${highlightSearchTerm(item.title)}</div>
                    </div>
                `;
                container.appendChild(video);
            });
        }
    }
    
    function highlightSearchTerm(text) {
        if (!isSearching || !text) return text;
        const searchTerm = document.getElementById('global-search')?.value.trim();
        if (!searchTerm) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }
    
    window.resetSearch = function() {
        isSearching = false;
        document.getElementById('global-search').value = '';
        document.getElementById('resetSearchBtn').style.display = 'none';
        refreshAllSections();
    };
    
    // ================ CRUD PRESSE ================
    window.addArticle = async function() {
        console.log("📝 Ajout article...");
        
        const title = document.getElementById('articleTitle')?.value.trim();
        const description = document.getElementById('articleDescription')?.value.trim();
        const imageInput = document.getElementById('articleImage');
        
        if (!title || !description) {
            showAlert('presseAlert', 'Veuillez remplir tous les champs', 'error');
            return;
        }
        
        const btn = document.getElementById('addArticle');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload...'; }
        
        try {
            let imageUrl = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';
            
            if (imageInput?.files?.[0]) {
                const upload = await window.CloudinaryConfig?.uploadImage(imageInput.files[0]);
                if (upload?.success) imageUrl = upload.url;
            }
            
            const article = { title, description, image: imageUrl };
            const result = await window.ExcellenceMediaData?.addPressArticle(article);
            
            if (result?.success) {
                await window.ExcellenceMediaData.load();
                await loadPressData();
                await loadArticlesList();
                await loadReorderList('reorderPress', window.ExcellenceMediaData.pressData);
                
                // Réinitialiser formulaire
                document.getElementById('articleTitle').value = '';
                document.getElementById('articleDescription').value = '';
                if (imageInput) imageInput.value = '';
                document.getElementById('imagePreview').innerHTML = '';
                
                showAlert('presseAlert', '✅ Article ajouté avec succès!', 'success');
                showNotification('Article ajouté', 'success');
            }
        } catch (error) {
            console.error('❌ Erreur:', error);
            showAlert('presseAlert', '❌ Erreur lors de l\'ajout', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Ajouter Article'; }
        }
    };
    
    window.editArticle = function(id) {
        const article = window.ExcellenceMediaData?.pressData.find(a => a.id === id);
        if (!article) return;
        
        document.getElementById('articleTitle').value = article.title;
        document.getElementById('articleDescription').value = article.description;
        
        if (article.image) {
            document.getElementById('imagePreview').innerHTML = `
                <img src="${article.image}" alt="Preview" style="max-width:200px; margin-top:10px; border-radius:5px;">
                <div style="font-size:0.8rem; color:#666;">Image actuelle</div>
            `;
        }
        
        document.getElementById('addArticle').style.display = 'none';
        document.getElementById('updateArticle').style.display = 'inline-block';
        
        currentEditingId = { type: 'article', id };
        showAlert('presseAlert', 'Modifiez l\'article', 'info');
    };
    
    window.updateArticle = async function() {
        if (!currentEditingId || currentEditingId.type !== 'article') return;
        
        const title = document.getElementById('articleTitle').value.trim();
        const description = document.getElementById('articleDescription').value.trim();
        
        if (!title || !description) {
            showAlert('presseAlert', 'Veuillez remplir tous les champs', 'error');
            return;
        }
        
        const updates = { title, description };
        const imageInput = document.getElementById('articleImage');
        
        if (imageInput?.files?.[0]) {
            const upload = await window.CloudinaryConfig?.uploadImage(imageInput.files[0]);
            if (upload?.success) updates.image = upload.url;
        }
        
        await window.ExcellenceMediaData?.updatePressArticle(currentEditingId.id, updates);
        await window.ExcellenceMediaData.load();
        await loadPressData();
        await loadArticlesList();
        await loadReorderList('reorderPress', window.ExcellenceMediaData.pressData);
        
        // Reset form
        document.getElementById('articleTitle').value = '';
        document.getElementById('articleDescription').value = '';
        document.getElementById('articleImage').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('addArticle').style.display = 'inline-block';
        document.getElementById('updateArticle').style.display = 'none';
        
        currentEditingId = null;
        showAlert('presseAlert', '✅ Article mis à jour!', 'success');
        showNotification('Article mis à jour', 'success');
    };
    
    window.deleteArticle = async function(id) {
        if (!confirm('Supprimer cet article ?')) return;
        
        await window.ExcellenceMediaData?.deletePressArticle(id);
        await window.ExcellenceMediaData.load();
        await loadPressData();
        await loadArticlesList();
        await loadReorderList('reorderPress', window.ExcellenceMediaData.pressData);
        
        showNotification('Article supprimé', 'success');
    };
    
    // ================ CRUD VIDÉOS ================
    window.addVideo = async function(type) {
        console.log(`📹 Ajout vidéo ${type}...`);
        
        const title = document.getElementById(`${type}Title`)?.value.trim();
        const url = document.getElementById(`${type}Url`)?.value.trim();
        const alertId = `${type}Alert`;
        
        if (!title || !url) {
            showAlert(alertId, 'Veuillez remplir tous les champs', 'error');
            return;
        }
        
        // Convertir URL YouTube
        let videoId = '';
        if (url.includes('youtube.com/watch?v=')) videoId = url.split('v=')[1].split('&')[0];
        else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
        else if (url.includes('embed/')) videoId = url.split('embed/')[1].split('?')[0];
        
        if (!videoId) {
            showAlert(alertId, 'URL YouTube invalide', 'error');
            return;
        }
        
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        
        const btn = document.getElementById(`add${capitalize(type)}`);
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout...'; }
        
        try {
            await window.ExcellenceMediaData?.addVideo(type, { title, url: embedUrl });
            await window.ExcellenceMediaData.load();
            
            // Rafraîchir l'affichage
            if (type === 'audio') { 
                await loadVideoData('audioVisuel', 1); 
                currentAudioPage = 1;
                await loadVideosList('audio', window.ExcellenceMediaData.audioVisuelData);
                await loadReorderList('reorderAudio', window.ExcellenceMediaData.audioVisuelData);
            }
            if (type === 'emission') { 
                await loadVideoData('emission', 1); 
                currentEmissionPage = 1;
                await loadVideosList('emission', window.ExcellenceMediaData.emissionData);
                await loadReorderList('reorderEmission', window.ExcellenceMediaData.emissionData);
            }
            if (type === 'spot') { 
                await loadVideoData('spot', 1); 
                currentSpotPage = 1;
                await loadVideosList('spot', window.ExcellenceMediaData.spotData);
                await loadReorderList('reorderSpot', window.ExcellenceMediaData.spotData);
            }
            if (type === 'nocomment') { 
                await loadVideoData('nocomment', 1); 
                currentNocommentPage = 1;
                await loadVideosList('nocomment', window.ExcellenceMediaData.nocommentData);
                await loadReorderList('reorderNocomment', window.ExcellenceMediaData.nocommentData);
            }
            
            // Reset form
            document.getElementById(`${type}Title`).value = '';
            document.getElementById(`${type}Url`).value = '';
            
            showAlert(alertId, '✅ Vidéo ajoutée!', 'success');
            showNotification('Vidéo ajoutée', 'success');
            
        } catch (error) {
            showAlert(alertId, '❌ Erreur lors de l\'ajout', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-plus"></i> Ajouter ${getTypeLabel(type)}`; }
        }
    };
    
    window.editVideo = function(type, id) {
        let dataKey = '';
        if (type === 'audio') dataKey = 'audioVisuelData';
        if (type === 'emission') dataKey = 'emissionData';
        if (type === 'spot') dataKey = 'spotData';
        if (type === 'nocomment') dataKey = 'nocommentData';
        
        const video = window.ExcellenceMediaData?.[dataKey]?.find(v => v.id === id);
        if (!video) return;
        
        let videoUrl = video.url;
        if (videoUrl.includes('embed/')) {
            const videoId = videoUrl.split('embed/')[1].split('?')[0];
            videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }
        
        document.getElementById(`${type}Title`).value = video.title;
        document.getElementById(`${type}Url`).value = videoUrl;
        
        document.getElementById(`add${capitalize(type)}`).style.display = 'none';
        document.getElementById(`update${capitalize(type)}`).style.display = 'inline-block';
        
        currentEditingId = { type, id };
        showAlert(`${type}Alert`, 'Modifiez la vidéo', 'info');
    };
    
    window.updateVideo = async function(type) {
        if (!currentEditingId || currentEditingId.type !== type) return;
        
        const title = document.getElementById(`${type}Title`).value.trim();
        const url = document.getElementById(`${type}Url`).value.trim();
        const alertId = `${type}Alert`;
        
        if (!title || !url) {
            showAlert(alertId, 'Veuillez remplir tous les champs', 'error');
            return;
        }
        
        let videoId = '';
        if (url.includes('youtube.com/watch?v=')) videoId = url.split('v=')[1].split('&')[0];
        else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
        else if (url.includes('embed/')) videoId = url.split('embed/')[1].split('?')[0];
        
        if (!videoId) {
            showAlert(alertId, 'URL YouTube invalide', 'error');
            return;
        }
        
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        
        await window.ExcellenceMediaData?.updateVideo(type, currentEditingId.id, { title, url: embedUrl });
        await window.ExcellenceMediaData.load();
        
        // Rafraîchir
        if (type === 'audio') {
            await loadVideoData('audioVisuel', currentAudioPage);
            await loadVideosList('audio', window.ExcellenceMediaData.audioVisuelData);
            await loadReorderList('reorderAudio', window.ExcellenceMediaData.audioVisuelData);
        }
        if (type === 'emission') {
            await loadVideoData('emission', currentEmissionPage);
            await loadVideosList('emission', window.ExcellenceMediaData.emissionData);
            await loadReorderList('reorderEmission', window.ExcellenceMediaData.emissionData);
        }
        if (type === 'spot') {
            await loadVideoData('spot', currentSpotPage);
            await loadVideosList('spot', window.ExcellenceMediaData.spotData);
            await loadReorderList('reorderSpot', window.ExcellenceMediaData.spotData);
        }
        if (type === 'nocomment') {
            await loadVideoData('nocomment', currentNocommentPage);
            await loadVideosList('nocomment', window.ExcellenceMediaData.nocommentData);
            await loadReorderList('reorderNocomment', window.ExcellenceMediaData.nocommentData);
        }
        
        resetVideoEdit(type);
        showAlert(alertId, '✅ Vidéo mise à jour!', 'success');
        showNotification('Vidéo mise à jour', 'success');
    };
    
    window.deleteVideo = async function(type, id) {
        if (!confirm('Supprimer cette vidéo ?')) return;
        
        await window.ExcellenceMediaData?.deleteVideo(type, id);
        await window.ExcellenceMediaData.load();
        
        if (type === 'audio') {
            await loadVideoData('audioVisuel', 1);
            currentAudioPage = 1;
            await loadVideosList('audio', window.ExcellenceMediaData.audioVisuelData);
            await loadReorderList('reorderAudio', window.ExcellenceMediaData.audioVisuelData);
        }
        if (type === 'emission') {
            await loadVideoData('emission', 1);
            currentEmissionPage = 1;
            await loadVideosList('emission', window.ExcellenceMediaData.emissionData);
            await loadReorderList('reorderEmission', window.ExcellenceMediaData.emissionData);
        }
        if (type === 'spot') {
            await loadVideoData('spot', 1);
            currentSpotPage = 1;
            await loadVideosList('spot', window.ExcellenceMediaData.spotData);
            await loadReorderList('reorderSpot', window.ExcellenceMediaData.spotData);
        }
        if (type === 'nocomment') {
            await loadVideoData('nocomment', 1);
            currentNocommentPage = 1;
            await loadVideosList('nocomment', window.ExcellenceMediaData.nocommentData);
            await loadReorderList('reorderNocomment', window.ExcellenceMediaData.nocommentData);
        }
        
        showNotification('Vidéo supprimée', 'success');
    };
    
    // ================ LISTES DASHBOARD ================
    async function loadArticlesList() {
        const container = document.getElementById('articlesList');
        if (!container) return;
        
        container.innerHTML = '';
        const data = window.ExcellenceMediaData?.pressData || [];
        
        if (data.length === 0) {
            container.innerHTML = '<p class="section-empty">Aucun article à afficher</p>';
            return;
        }
        
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'sortable-item';
            div.dataset.id = item.id;
            div.draggable = true;
            
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <i class="fas fa-grip-vertical drag-handle" style="color:#666; cursor:move;"></i>
                    <i class="fas fa-file-alt" style="color:#3949ab;"></i>
                    <strong>${escapeHTML(item.title)}</strong>
                    ${item.image?.includes('cloudinary.com') ? 
                        '<span class="badge" style="background:#4caf50; color:white; padding:2px 6px; border-radius:3px; font-size:0.8em;">Cloudinary</span>' : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-edit btn-sm" onclick="window.editArticle('${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.deleteArticle('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            attachDragEvents(div);
            container.appendChild(div);
        });
    }
    
    async function loadVideosList(type, data) {
        const container = document.getElementById(`${type}VideosList`);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!data || data.length === 0) {
            container.innerHTML = '<p class="section-empty">Aucune vidéo à afficher</p>';
            return;
        }
        
        let icon = 'fas fa-video';
        if (type === 'emission') icon = 'fas fa-tv';
        if (type === 'spot') icon = 'fas fa-ad';
        if (type === 'nocomment') icon = 'fas fa-film';
        
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'sortable-item';
            div.dataset.id = item.id;
            div.draggable = true;
            
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <i class="fas fa-grip-vertical drag-handle" style="color:#666; cursor:move;"></i>
                    <i class="${icon}" style="color:#3949ab;"></i>
                    <strong>${escapeHTML(item.title)}</strong>
                </div>
                <div class="item-actions">
                    <button class="btn btn-edit btn-sm" onclick="window.editVideo('${type}', '${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.deleteVideo('${type}', '${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            attachDragEvents(div);
            container.appendChild(div);
        });
    }
    
    // ================ RÉORGANISATION ================
    function initReorderSection() {
        document.querySelectorAll('.reorder-type-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.reorder-type-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.reorder-section').forEach(s => s.classList.remove('active'));
                
                this.classList.add('active');
                currentReorderType = this.dataset.type;
                
                const section = document.getElementById(`reorder-section-${currentReorderType}`);
                if (section) section.classList.add('active');
                
                cancelReorderEdit();
            });
        });
    }
    
    function initReorderEditForm() {
        document.getElementById('saveReorderEdit')?.addEventListener('click', saveReorderEdit);
        document.getElementById('deleteReorderItem')?.addEventListener('click', deleteReorderItem);
        document.getElementById('cancelReorderEdit')?.addEventListener('click', cancelReorderEdit);
    }
    
    window.openReorderEditForm = function(type, id) {
        currentReorderItemId = id;
        currentReorderType = type;
        
        let item, dataKey;
        
        if (type === 'presse') dataKey = 'pressData';
        if (type === 'audiovisuel') dataKey = 'audioVisuelData';
        if (type === 'emissions') dataKey = 'emissionData';
        if (type === 'spots') dataKey = 'spotData';
        if (type === 'nocomment') dataKey = 'nocommentData';
        
        item = window.ExcellenceMediaData?.[dataKey]?.find(i => i.id === id);
        if (!item) return;
        
        document.getElementById('reorderEditTitle').textContent = `Modifier : ${item.title}`;
        
        let fieldsHtml = '';
        
        if (type === 'presse') {
            fieldsHtml = `
                <div class="form-group">
                    <label for="editTitle">Titre:</label>
                    <input type="text" id="editTitle" class="form-control" value="${escapeHTML(item.title)}">
                </div>
                <div class="form-group">
                    <label for="editDescription">Description:</label>
                    <textarea id="editDescription" class="form-control" rows="4">${escapeHTML(item.description)}</textarea>
                </div>
                <div class="form-group">
                    <label for="editImage">Image URL:</label>
                    <input type="text" id="editImage" class="form-control" value="${escapeHTML(item.image || '')}">
                </div>
            `;
        } else {
            let videoUrl = item.url;
            if (videoUrl.includes('embed/')) {
                const videoId = videoUrl.split('embed/')[1].split('?')[0];
                videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            }
            
            fieldsHtml = `
                <div class="form-group">
                    <label for="editTitle">Titre:</label>
                    <input type="text" id="editTitle" class="form-control" value="${escapeHTML(item.title)}">
                </div>
                <div class="form-group">
                    <label for="editUrl">URL YouTube:</label>
                    <input type="text" id="editUrl" class="form-control" value="${escapeHTML(videoUrl)}">
                </div>
            `;
        }
        
        document.getElementById('reorderEditFields').innerHTML = fieldsHtml;
        document.getElementById('reorderEditForm').style.display = 'block';
    };
    
    window.addNewItemInReorder = function(type) {
        currentReorderItemId = null;
        currentReorderType = type;
        
        document.getElementById('reorderEditTitle').textContent = `Ajouter un élément (${type})`;
        
        let fieldsHtml = '';
        
        if (type === 'presse') {
            fieldsHtml = `
                <div class="form-group">
                    <label for="editTitle">Titre:</label>
                    <input type="text" id="editTitle" class="form-control" placeholder="Titre de l'article">
                </div>
                <div class="form-group">
                    <label for="editDescription">Description:</label>
                    <textarea id="editDescription" class="form-control" rows="4" placeholder="Description"></textarea>
                </div>
                <div class="form-group">
                    <label for="editImage">Image URL:</label>
                    <input type="text" id="editImage" class="form-control" placeholder="https://...">
                </div>
            `;
        } else {
            fieldsHtml = `
                <div class="form-group">
                    <label for="editTitle">Titre:</label>
                    <input type="text" id="editTitle" class="form-control" placeholder="Titre">
                </div>
                <div class="form-group">
                    <label for="editUrl">URL YouTube:</label>
                    <input type="text" id="editUrl" class="form-control" placeholder="https://youtube.com/watch?v=...">
                </div>
            `;
        }
        
        document.getElementById('reorderEditFields').innerHTML = fieldsHtml;
        document.getElementById('reorderEditForm').style.display = 'block';
    };
    
    async function saveReorderEdit() {
        const title = document.getElementById('editTitle')?.value.trim();
        if (!title) {
            showAlert('reorderEditAlert', 'Le titre est obligatoire', 'error');
            return;
        }
        
        if (currentReorderType === 'presse') {
            const description = document.getElementById('editDescription')?.value.trim();
            const image = document.getElementById('editImage')?.value.trim() || 
                         'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';
            
            if (!description) {
                showAlert('reorderEditAlert', 'La description est obligatoire', 'error');
                return;
            }
            
            if (currentReorderItemId) {
                await window.ExcellenceMediaData?.updatePressArticle(currentReorderItemId, { title, description, image });
            } else {
                await window.ExcellenceMediaData?.addPressArticle({ title, description, image });
            }
        } else {
            const url = document.getElementById('editUrl')?.value.trim();
            if (!url) {
                showAlert('reorderEditAlert', 'L\'URL est obligatoire', 'error');
                return;
            }
            
            let videoId = '';
            if (url.includes('youtube.com/watch?v=')) videoId = url.split('v=')[1].split('&')[0];
            else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
            else if (url.includes('embed/')) videoId = url.split('embed/')[1].split('?')[0];
            
            if (!videoId) {
                showAlert('reorderEditAlert', 'URL YouTube invalide', 'error');
                return;
            }
            
            const embedUrl = `https://www.youtube.com/embed/${videoId}`;
            const videoType = currentReorderType === 'audiovisuel' ? 'audio' :
                             currentReorderType === 'emissions' ? 'emission' :
                             currentReorderType === 'spots' ? 'spot' : 'nocomment';
            
            if (currentReorderItemId) {
                await window.ExcellenceMediaData?.updateVideo(videoType, currentReorderItemId, { title, url: embedUrl });
            } else {
                await window.ExcellenceMediaData?.addVideo(videoType, { title, url: embedUrl });
            }
        }
        
        await window.ExcellenceMediaData.load();
        await refreshAllSections();
        await loadReorderLists();
        
        cancelReorderEdit();
        showNotification('✅ Élément sauvegardé', 'success');
    }
    
    async function deleteReorderItem() {
        if (!currentReorderItemId || !confirm('Supprimer cet élément ?')) return;
        
        if (currentReorderType === 'presse') {
            await window.ExcellenceMediaData?.deletePressArticle(currentReorderItemId);
        } else {
            const videoType = currentReorderType === 'audiovisuel' ? 'audio' :
                             currentReorderType === 'emissions' ? 'emission' :
                             currentReorderType === 'spots' ? 'spot' : 'nocomment';
            await window.ExcellenceMediaData?.deleteVideo(videoType, currentReorderItemId);
        }
        
        await window.ExcellenceMediaData.load();
        await refreshAllSections();
        await loadReorderLists();
        
        cancelReorderEdit();
        showNotification('✅ Élément supprimé', 'success');
    }
    
    window.deleteReorderItem = function(type, id) {
        currentReorderType = type;
        currentReorderItemId = id;
        deleteReorderItem();
    };
    
    function cancelReorderEdit() {
        document.getElementById('reorderEditForm').style.display = 'none';
        currentReorderItemId = null;
        showAlert('reorderEditAlert', '', '');
    }
    
    async function loadReorderLists() {
        await loadReorderList('reorderPress', window.ExcellenceMediaData?.pressData || []);
        await loadReorderList('reorderAudio', window.ExcellenceMediaData?.audioVisuelData || []);
        await loadReorderList('reorderEmission', window.ExcellenceMediaData?.emissionData || []);
        await loadReorderList('reorderSpot', window.ExcellenceMediaData?.spotData || []);
        await loadReorderList('reorderNocomment', window.ExcellenceMediaData?.nocommentData || []);
    }
    
    async function loadReorderList(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!data || data.length === 0) {
            container.innerHTML = '<li class="sortable-item empty-state">Aucun élément</li>';
            return;
        }
        
        let icon = 'fas fa-file-alt';
        if (containerId.includes('Audio')) icon = 'fas fa-video';
        if (containerId.includes('Emission')) icon = 'fas fa-tv';
        if (containerId.includes('Spot')) icon = 'fas fa-ad';
        if (containerId.includes('Nocomment')) icon = 'fas fa-film';
        
        let type = 'presse';
        if (containerId.includes('Audio')) type = 'audiovisuel';
        if (containerId.includes('Emission')) type = 'emissions';
        if (containerId.includes('Spot')) type = 'spots';
        if (containerId.includes('Nocomment')) type = 'nocomment';
        
        data.forEach(item => {
            const li = document.createElement('li');
            li.className = 'sortable-item';
            li.dataset.id = item.id;
            li.draggable = true;
            
            li.innerHTML = `
                <div class="item-content" style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <i class="fas fa-grip-vertical drag-handle" style="color:#666; cursor:move;"></i>
                        <i class="${icon}" style="color:#3949ab;"></i>
                        <span class="item-title">${escapeHTML(item.title)}</span>
                        ${item.image?.includes('cloudinary.com') ? 
                            '<span class="badge" style="background:#4caf50; color:white; padding:2px 6px; border-radius:3px; font-size:0.8em;">Cloudinary</span>' : ''}
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-edit" onclick="window.openReorderEditForm('${type}', '${item.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-delete" onclick="window.deleteReorderItem('${type}', '${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            attachDragEvents(li);
            container.appendChild(li);
        });
    }
    
    window.saveNewOrder = async function() {
        const pressOrder = Array.from(document.querySelectorAll('#reorderPress .sortable-item')).map(el => el.dataset.id);
        const audioOrder = Array.from(document.querySelectorAll('#reorderAudio .sortable-item')).map(el => el.dataset.id);
        const emissionOrder = Array.from(document.querySelectorAll('#reorderEmission .sortable-item')).map(el => el.dataset.id);
        const spotOrder = Array.from(document.querySelectorAll('#reorderSpot .sortable-item')).map(el => el.dataset.id);
        const nocommentOrder = Array.from(document.querySelectorAll('#reorderNocomment .sortable-item')).map(el => el.dataset.id);
        
        if (pressOrder.length) await window.ExcellenceMediaData?.reorderSection('pressData', pressOrder);
        if (audioOrder.length) await window.ExcellenceMediaData?.reorderSection('audioVisuelData', audioOrder);
        if (emissionOrder.length) await window.ExcellenceMediaData?.reorderSection('emissionData', emissionOrder);
        if (spotOrder.length) await window.ExcellenceMediaData?.reorderSection('spotData', spotOrder);
        if (nocommentOrder.length) await window.ExcellenceMediaData?.reorderSection('nocommentData', nocommentOrder);
        
        await window.ExcellenceMediaData.load();
        await refreshAllSections();
        await loadReorderLists();
        
        showNotification('✅ Ordre sauvegardé', 'success');
    };
    
    // ================ DRAG AND DROP ================
    function initDragAndDrop() {
        // Les événements sont attachés individuellement
    }
    
    function attachDragEvents(element) {
        element.addEventListener('dragstart', handleDragStart);
        element.addEventListener('dragover', handleDragOver);
        element.addEventListener('dragenter', handleDragEnter);
        element.addEventListener('dragleave', handleDragLeave);
        element.addEventListener('drop', handleDrop);
        element.addEventListener('dragend', handleDragEnd);
    }
    
    let dragSrcEl = null;
    
    function handleDragStart(e) {
        this.classList.add('dragging');
        dragSrcEl = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.id || '');
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        return false;
    }
    
    function handleDragEnter(e) {
        this.classList.add('over');
    }
    
    function handleDragLeave(e) {
        this.classList.remove('over');
    }
    
    function handleDrop(e) {
        e.stopPropagation();
        e.preventDefault();
        
        if (dragSrcEl !== this && this.parentNode === dragSrcEl.parentNode) {
            const items = Array.from(this.parentNode.children);
            const dragIndex = items.indexOf(dragSrcEl);
            const dropIndex = items.indexOf(this);
            
            if (dragIndex < dropIndex) {
                this.parentNode.insertBefore(dragSrcEl, this.nextSibling);
            } else {
                this.parentNode.insertBefore(dragSrcEl, this);
            }
        }
        
        this.classList.remove('over');
        return false;
    }
    
    function handleDragEnd(e) {
        this.classList.remove('dragging');
        document.querySelectorAll('.sortable-item').forEach(el => el.classList.remove('over'));
    }
    
    // ================ DASHBOARD ================
    window.openDashboard = function() {
        if (!isAdmin) {
            document.getElementById('passwordModal').style.display = 'flex';
            return;
        }
        
        document.getElementById('dashboardModal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Afficher l'email
        const userEmail = sessionStorage.getItem('userEmail');
        const header = document.querySelector('.dashboard-header h2');
        if (header && userEmail) {
            const oldInfo = document.querySelector('.user-info');
            if (oldInfo) oldInfo.remove();
            
            const info = document.createElement('span');
            info.className = 'user-info';
            info.style.marginLeft = '15px';
            info.style.fontSize = '0.9rem';
            info.style.opacity = '0.9';
            info.innerHTML = `<i class="fas fa-user"></i> ${userEmail}`;
            header.appendChild(info);
        }
        
        // Charger les données
        loadArticlesList();
        loadVideosList('audio', window.ExcellenceMediaData?.audioVisuelData || []);
        loadVideosList('emission', window.ExcellenceMediaData?.emissionData || []);
        loadVideosList('spot', window.ExcellenceMediaData?.spotData || []);
        loadVideosList('nocomment', window.ExcellenceMediaData?.nocommentData || []);
        loadReorderLists();
    };
    
    window.closeDashboard = function() {
        document.getElementById('dashboardModal').style.display = 'none';
        document.body.style.overflow = 'auto';
        
        const userInfo = document.querySelector('.user-info');
        if (userInfo) userInfo.remove();
    };
    
    // ================ SYNCHRONISATION ================
    window.syncWithCloudinary = async function() {
        showNotification('🔄 Synchronisation...', 'info');
        await window.ExcellenceMediaData?.load();
        await refreshAllSections();
        showNotification('✅ Synchronisation réussie!', 'success');
    };
    
    window.backupToLocal = function() {
        const data = {
            pressData: window.ExcellenceMediaData?.pressData || [],
            audioVisuelData: window.ExcellenceMediaData?.audioVisuelData || [],
            emissionData: window.ExcellenceMediaData?.emissionData || [],
            spotData: window.ExcellenceMediaData?.spotData || [],
            nocommentData: window.ExcellenceMediaData?.nocommentData || [],
            metadata: { exported: new Date().toISOString() }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `excellence-media-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('✅ Sauvegarde téléchargée', 'success');
    };
    
    // ================ UTILITAIRES ================
    function capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    function getTypeLabel(type) {
        const labels = { 'audio': 'Vidéo', 'emission': 'Émission', 'spot': 'Spot', 'nocomment': 'Vidéo' };
        return labels[type] || type;
    }
    
    function escapeHTML(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    function formatDate(dateString) {
        if (!dateString) return 'Date inconnue';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', { 
                day: 'numeric', month: 'long', year: 'numeric' 
            });
        } catch {
            return 'Date inconnue';
        }
    }
    
    function showAlert(alertId, message, type) {
        const alert = document.getElementById(alertId);
        if (!alert) return;
        
        alert.textContent = message;
        alert.className = `alert alert-${type}`;
        alert.style.display = message ? 'block' : 'none';
    }
    
    function showNotification(message, type) {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
    
    function resetVideoEdit(type) {
        document.getElementById(`${type}Title`).value = '';
        document.getElementById(`${type}Url`).value = '';
        document.getElementById(`add${capitalize(type)}`).style.display = 'inline-block';
        document.getElementById(`update${capitalize(type)}`).style.display = 'none';
        showAlert(`${type}Alert`, '', '');
    }
    
    // ================ ÉVÉNEMENTS ================
    function initEventListeners() {
        // Navigation mobile
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
        
        // Recherche
        document.getElementById('searchBtn')?.addEventListener('click', window.performSearch);
        document.getElementById('resetSearchBtn')?.addEventListener('click', window.resetSearch);
        document.getElementById('global-search')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') window.performSearch();
        });
        
        // Formulaire presse
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
            showAlert('presseAlert', '', '');
        });
        
        // Formulaires vidéos
        document.getElementById('addAudioVideo')?.addEventListener('click', () => window.addVideo('audio'));
        document.getElementById('updateAudioVideo')?.addEventListener('click', () => window.updateVideo('audio'));
        document.getElementById('cancelAudioEdit')?.addEventListener('click', () => resetVideoEdit('audio'));
        
        document.getElementById('addEmission')?.addEventListener('click', () => window.addVideo('emission'));
        document.getElementById('updateEmission')?.addEventListener('click', () => window.updateVideo('emission'));
        document.getElementById('cancelEmissionEdit')?.addEventListener('click', () => resetVideoEdit('emission'));
        
        document.getElementById('addSpot')?.addEventListener('click', () => window.addVideo('spot'));
        document.getElementById('updateSpot')?.addEventListener('click', () => window.updateVideo('spot'));
        document.getElementById('cancelSpotEdit')?.addEventListener('click', () => resetVideoEdit('spot'));
        
        document.getElementById('addNocomment')?.addEventListener('click', () => window.addVideo('nocomment'));
        document.getElementById('updateNocomment')?.addEventListener('click', () => window.updateVideo('nocomment'));
        document.getElementById('cancelNocommentEdit')?.addEventListener('click', () => resetVideoEdit('nocomment'));
        
        // Sauvegarder ordre
        document.getElementById('saveOrder')?.addEventListener('click', window.saveNewOrder);
        
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
        
        // Scroll to top
        document.getElementById('scrollTopBtn')?.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        window.addEventListener('scroll', function() {
            const btn = document.getElementById('scrollTopBtn');
            if (btn) {
                btn.style.display = window.scrollY > 300 ? 'flex' : 'none';
            }
        });
        
        // Clic extérieur modales
        window.addEventListener('click', function(e) {
            if (e.target === document.getElementById('pressModal')) closePressModal();
            if (e.target === document.getElementById('dashboardModal')) closeDashboard();
            if (e.target === document.getElementById('passwordModal')) {
                document.getElementById('passwordModal').style.display = 'none';
            }
        });
    }
    
    function initDashboardTabs() {
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                
                if (this.dataset.tab === 'logout') {
                    logoutUser();
                    return;
                }
                
                document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                this.classList.add('active');
                const content = document.getElementById(`${this.dataset.tab}-tab`);
                if (content) content.classList.add('active');
            });
        });
    }
    
    function initDashboardForms() {
        // Initialisé dans les écouteurs d'événements
    }
    
    // ================ DÉMARRAGE ================
    await init();
    
    // ================ API GLOBALE ================
    window.ExcellenceMediaData = window.ExcellenceMediaData || {};
    window.CloudinaryConfig = window.CloudinaryConfig || {};
    window.CloudinaryDB = window.CloudinaryDB || {};
    window.isAdmin = isAdmin;
    window.currentAudioPage = currentAudioPage;
    window.currentEmissionPage = currentEmissionPage;
    window.currentSpotPage = currentSpotPage;
    window.currentNocommentPage = currentNocommentPage;
});
