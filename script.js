// script.js - Version complète avec stockage exclusif Cloudinary
function safeStyle(element) {
    return element?.style || { display: 'none', removeProperty: () => { } };
}

// Gestionnaire d'erreurs global
window.addEventListener('error', function (event) {
    console.error("💥 ERREUR GLOBALE:", event.error);
});

document.addEventListener('DOMContentLoaded', async function () {
    // ================ VARIABLES GLOBALES ================

    // État de l'application
    let isAdmin = false;
    let currentEditingId = null;
    let currentReorderType = 'presse';
    let currentReorderItemId = null;
    let isSearching = false;
    let searchResults = {};

    // Éléments DOM
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const dashboardLink = document.getElementById('dashboardLink');
    const passwordModal = document.getElementById('passwordModal');
    const dashboardModal = document.getElementById('dashboardModal');
    const pressModal = document.getElementById('pressModal');
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const notification = document.getElementById('notification');
    const globalSearch = document.getElementById('global-search');

    // Pagination
    let currentAudioPage = 1;
    let currentEmissionPage = 1;
    let currentSpotPage = 1;
    let currentNocommentPage = 1;
    const videosPerPage = 3;

    // Email autorisé
    const allowedEmail = "excellencemedianumerique@gmail.com";

    // ================ FONCTIONS D'INITIALISATION ================

    async function init() {
        console.log("=== INITIALISATION DE L'APPLICATION ===");

        // Attendre que les données soient chargées
        await window.ExcellenceMediaData?.load();

        // Vérifier la session
        checkExistingSession();

        // Initialiser les composants
        initEventListeners();
        initDashboardTabs();
        initDashboardForms();
        initReorderSection();
        initReorderEditForm();
        initDragAndDrop();

        // Charger les données dans l'interface
        await refreshAllSections();

        console.log("✅ Application initialisée");
    }

    // ================ GESTION DE L'AUTHENTIFICATION GOOGLE ================

    window.handleGoogleSignIn = function (response) {
        console.log("Google Sign-In Response received");

        try {
            const decodedToken = parseJwt(response.credential);

            if (decodedToken.email === allowedEmail) {
                console.log("✅ Email autorisé:", decodedToken.email);
                isAdmin = true;

                passwordModal.style.display = 'none';

                setTimeout(() => {
                    openDashboard();
                    showNotification('Connexion réussie avec Google!', 'success');
                }, 300);

                sessionStorage.setItem('googleAuthToken', response.credential);
                sessionStorage.setItem('userEmail', decodedToken.email);
            } else {
                console.log("❌ Email non autorisé:", decodedToken.email);
                showNotification('Accès refusé. Seul ' + allowedEmail + ' peut se connecter.', 'error');

                if (typeof google !== 'undefined' && google.accounts) {
                    google.accounts.id.disableAutoSelect();
                }
            }
        } catch (error) {
            console.error("Erreur lors du traitement de la connexion Google:", error);
            showNotification('Erreur lors de la connexion Google', 'error');
        }
    };

    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            return {};
        }
    }

    function checkExistingSession() {
        const token = sessionStorage.getItem('googleAuthToken');
        const email = sessionStorage.getItem('userEmail');

        if (token && email === allowedEmail) {
            const decodedToken = parseJwt(token);
            const currentTime = Math.floor(Date.now() / 1000);

            if (decodedToken.exp && decodedToken.exp > currentTime) {
                isAdmin = true;
                return true;
            } else {
                clearSession();
            }
        }
        return false;
    }

    function clearSession() {
        sessionStorage.removeItem('googleAuthToken');
        sessionStorage.removeItem('userEmail');
        isAdmin = false;

        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.disableAutoSelect();
        }
    }

    function logoutUser() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            clearSession();
            closeDashboard();
            showNotification('Déconnexion réussie', 'info');
        }
    }

    // ================ FONCTIONS DE RAFRAÎCHISSEMENT ================

    async function refreshAllSections() {
        await loadPressData();
        await loadVideoData('audioVisuel', 'audioVisuelData', currentAudioPage);
        await loadVideoData('emission', 'emissionData', currentEmissionPage);
        await loadVideoData('spot', 'spotData', currentSpotPage);
        await loadVideoData('nocomment', 'nocommentData', currentNocommentPage);
    }

    async function refreshDashboard() {
        await loadArticlesList();
        await loadVideosList('audio', 'audioVisuelData');
        await loadVideosList('emission', 'emissionData');
        await loadVideosList('spot', 'spotData');
        await loadVideosList('nocomment', 'nocommentData');
        await loadReorderLists();
    }

    // ================ CHARGEMENT DES DONNÉES ================

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
            <img src="${item.image}" alt="${escapeHTML(item.title)}" class="press-ecrite-img" loading="lazy">
            <div class="press-ecrite-title">${escapeHTML(item.title)}</div>
        `;

        article.addEventListener('click', () => openPressModal(item));
        return article;
    }

    async function loadVideoData(sectionId, dataKey, page) {
        if (isSearching) return;

        const container = document.getElementById(`${sectionId}Videos`);
        const pagination = document.getElementById(`${sectionId}Pagination`);

        if (!container) return;

        container.innerHTML = '';

        const data = window.ExcellenceMediaData?.[dataKey] || [];

        if (data.length === 0) {
            container.innerHTML = getEmptyStateHTML(sectionId);
            if (pagination) pagination.innerHTML = '';
            return;
        }

        const startIndex = (page - 1) * videosPerPage;
        const endIndex = startIndex + videosPerPage;
        const pageData = data.slice(startIndex, endIndex);

        pageData.forEach(item => {
            const video = createVideoElement(item, sectionId);
            container.appendChild(video);
        });

        if (pagination) {
            generatePagination(data.length, page, sectionId, pagination);
        }
    }

    function createVideoElement(item, sectionId) {
        const video = document.createElement('div');
        video.className = 'video-item';

        video.innerHTML = `
            <div class="video-wrapper">
                <iframe src="${escapeHTML(item.url)}" 
                        title="${escapeHTML(item.title)}" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen loading="lazy">
                </iframe>
            </div>
            <div class="video-info">
                <div class="video-title">${escapeHTML(item.title)}</div>
                <div class="video-date">Ajouté le ${formatDate(item.dateAdded)}</div>
            </div>
        `;

        return video;
    }

    function getEmptyStateHTML(sectionId) {
        let icon = 'fas fa-video', message = 'Aucune vidéo disponible';

        switch (sectionId) {
            case 'emission': icon = 'fas fa-tv'; message = 'Aucune émission disponible'; break;
            case 'spot': icon = 'fas fa-ad'; message = 'Aucun spot disponible'; break;
            case 'nocomment': icon = 'fas fa-film'; message = 'Aucune vidéo disponible'; break;
        }

        return `<div class="empty-state"><i class="${icon}"></i><p>${message}</p></div>`;
    }

    function generatePagination(totalItems, currentPage, sectionId, container) {
        const totalPages = Math.ceil(totalItems / videosPerPage);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        if (currentPage > 1) {
            paginationHTML += `<button class="page-btn" onclick="window.changePage('${sectionId}', ${currentPage - 1})">Précédent</button>`;
        }

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="window.changePage('${sectionId}', ${i})">
                    ${i}
                </button>
            `;
        }

        if (currentPage < totalPages) {
            paginationHTML += `<button class="page-btn" onclick="window.changePage('${sectionId}', ${currentPage + 1})">Suivant</button>`;
        }

        container.innerHTML = paginationHTML;
    }

    window.changePage = function (sectionId, page) {
        if (isSearching) return;

        switch (sectionId) {
            case 'audioVisuel':
                currentAudioPage = page;
                loadVideoData('audioVisuel', 'audioVisuelData', page);
                break;
            case 'emission':
                currentEmissionPage = page;
                loadVideoData('emission', 'emissionData', page);
                break;
            case 'spot':
                currentSpotPage = page;
                loadVideoData('spot', 'spotData', page);
                break;
            case 'nocomment':
                currentNocommentPage = page;
                loadVideoData('nocomment', 'nocommentData', page);
                break;
        }

        const section = document.getElementById(sectionId);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // ================ FONCTIONS POUR LA PRESSE ÉCRITE ================

    function openPressModal(item) {
        const modalTitle = document.getElementById('modalTitle');
        const modalImage = document.getElementById('modalImage');
        const modalDescription = document.getElementById('modalDescription');

        if (modalTitle) modalTitle.textContent = item.title;
        if (modalImage) modalImage.src = item.image;
        if (modalDescription) modalDescription.textContent = item.description;
        if (pressModal) pressModal.style.display = 'flex';
    }

    function closePressModal() {
        if (pressModal) pressModal.style.display = 'none';
    }

    function scrollPressLeft() {
        const scrollContainer = document.getElementById('pressEcriteScroll');
        if (scrollContainer) scrollContainer.scrollBy({ left: -300, behavior: 'smooth' });
    }

    function scrollPressRight() {
        const scrollContainer = document.getElementById('pressEcriteScroll');
        if (scrollContainer) scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
    }

    // ================ FONCTIONS POUR LE DASHBOARD ================

    function openPasswordModal() {
        if (passwordModal) passwordModal.style.display = 'flex';
    }

    function closePasswordModal() {
        if (passwordModal) passwordModal.style.display = 'none';
    }

    function openDashboard() {
        if (!isAdmin) {
            openPasswordModal();
            return;
        }

        if (dashboardModal) {
            dashboardModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            // Afficher l'email de l'utilisateur
            const userEmail = sessionStorage.getItem('userEmail');
            const dashboardHeader = document.querySelector('.dashboard-header h2');

            if (dashboardHeader && userEmail) {
                const oldUserInfo = document.querySelector('.user-info');
                if (oldUserInfo) oldUserInfo.remove();

                const userInfo = document.createElement('div');
                userInfo.className = 'user-info';
                userInfo.innerHTML = `<small><i class="fas fa-user"></i> ${userEmail}</small>`;
                userInfo.style.marginLeft = '15px';
                userInfo.style.fontSize = '0.9rem';
                userInfo.style.opacity = '0.9';
                dashboardHeader.appendChild(userInfo);
            }

            refreshDashboard();
        }
    }

    function closeDashboard() {
        if (dashboardModal) {
            dashboardModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        resetEditForms();
        resetAllVideoEdits();

        const userInfo = document.querySelector('.user-info');
        if (userInfo) userInfo.remove();
    }

    // ================ INITIALISATION DES ÉVÉNEMENTS ================

    function initEventListeners() {
        // Navigation
        if (navToggle) navToggle.addEventListener('click', toggleNavMenu);

        if (dashboardLink) {
            dashboardLink.addEventListener('click', function (e) {
                e.preventDefault();
                if (!isAdmin) openPasswordModal();
                else openDashboard();
            });
        }

        // Navigation par clic
        document.querySelectorAll('.nav-link:not(#dashboardLink)').forEach(link => {
            link.addEventListener('click', handleNavClick);
        });

        // Recherche
        const searchBtn = document.getElementById('searchBtn');
        const resetSearchBtn = document.getElementById('resetSearchBtn');

        if (searchBtn) searchBtn.addEventListener('click', performSearch);
        if (resetSearchBtn) resetSearchBtn.addEventListener('click', resetSearch);

        if (globalSearch) {
            globalSearch.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') performSearch();
            });
            globalSearch.addEventListener('input', function () {
                if (resetSearchBtn) {
                    resetSearchBtn.style.display = this.value ? 'block' : 'none';
                }
            });
        }

        // Modales
        const closeModalBtn = document.getElementById('closeModal');
        const closeDashboardBtn = document.getElementById('closeDashboard');
        const cancelPasswordBtn = document.getElementById('cancelPassword');

        if (closeModalBtn) closeModalBtn.addEventListener('click', closePressModal);
        if (closeDashboardBtn) closeDashboardBtn.addEventListener('click', closeDashboard);
        if (cancelPasswordBtn) cancelPasswordBtn.addEventListener('click', closePasswordModal);

        // Scroll
        const scrollLeftBtn = document.getElementById('scrollLeftBtn');
        const scrollRightBtn = document.getElementById('scrollRightBtn');

        if (scrollLeftBtn) scrollLeftBtn.addEventListener('click', scrollPressLeft);
        if (scrollRightBtn) scrollRightBtn.addEventListener('click', scrollPressRight);
        if (scrollTopBtn) scrollTopBtn.addEventListener('click', scrollToTop);

        // Fenêtre
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('click', handleWindowClick);
    }

    function toggleNavMenu() {
        if (navMenu) navMenu.classList.toggle('active');
    }

    function handleNavClick(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            if (window.innerWidth <= 768 && navMenu?.classList.contains('active')) {
                navMenu.classList.remove('active');
            }
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function handleWindowClick(e) {
        if (window.innerWidth <= 768 &&
            !e.target.closest('.nav-toggle') &&
            !e.target.closest('.nav-menu') &&
            navMenu?.classList.contains('active')) {
            navMenu.classList.remove('active');
        }

        if (e.target === pressModal) closePressModal();
        if (e.target === dashboardModal) closeDashboard();
        if (e.target === passwordModal) closePasswordModal();
    }

    function handleScroll() {
        if (scrollTopBtn) {
            scrollTopBtn.style.display = window.scrollY > 300 ? 'flex' : 'none';
        }

        // Navigation active
        const sections = document.querySelectorAll('.section');
        let currentSection = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;

            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ================ RECHERCHE ================

    function performSearch() {
        if (!globalSearch) return;

        const searchTerm = globalSearch.value.toLowerCase().trim();
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
                item.description.toLowerCase().includes(searchTerm)
            ),
            audio: audioData.filter(item =>
                item.title.toLowerCase().includes(searchTerm)
            ),
            emission: emissionData.filter(item =>
                item.title.toLowerCase().includes(searchTerm)
            ),
            spot: spotData.filter(item =>
                item.title.toLowerCase().includes(searchTerm)
            ),
            nocomment: nocommentData.filter(item =>
                item.title.toLowerCase().includes(searchTerm)
            )
        };

        displaySearchResults();

        const totalResults = searchResults.press.length + searchResults.audio.length +
            searchResults.emission.length + searchResults.spot.length +
            searchResults.nocomment.length;

        showNotification(`${totalResults} résultat(s) trouvé(s) pour "${searchTerm}"`, 'info');
    }

    function displaySearchResults() {
        if (!isSearching) return;

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
            container.innerHTML = getEmptyStateHTML(sectionId);
        } else {
            data.forEach(item => {
                const video = createVideoElement(item, sectionId);
                container.appendChild(video);
            });
        }
    }

    function resetSearch() {
        isSearching = false;
        if (globalSearch) globalSearch.value = '';

        const resetBtn = document.getElementById('resetSearchBtn');
        if (resetBtn) resetBtn.style.display = 'none';

        refreshAllSections();
    }

    // ================ FORMULAIRES DU DASHBOARD ================

    function initDashboardTabs() {
        document.addEventListener('click', function (event) {
            const tab = event.target.closest('.dashboard-tab');
            if (!tab || !tab.dataset) return;

            event.preventDefault();
            event.stopPropagation();

            const tabId = tab.dataset.tab;

            if (tabId === 'logout') {
                logoutUser();
                return;
            }

            const contentId = `${tabId}-tab`;
            const content = document.getElementById(contentId);

            if (!content) return;

            document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            content.classList.add('active');
        });
    }

    function initDashboardForms() {
        console.log("🔧 Configuration des formulaires du dashboard...");

        // PRESSE ÉCRITE - Correction du bug d'enregistrement multiple
        const addArticleBtn = document.getElementById('addArticle');
        if (addArticleBtn) {
            // Supprimer tous les anciens écouteurs
            const newAddArticleBtn = addArticleBtn.cloneNode(true);
            addArticleBtn.parentNode.replaceChild(newAddArticleBtn, addArticleBtn);

            // Attacher un nouvel écouteur
            newAddArticleBtn.addEventListener('click', async function (e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                console.log("📝 Ajout d'un article de presse");
                await addArticle();
            });
        }

        const updateArticleBtn = document.getElementById('updateArticle');
        if (updateArticleBtn) {
            updateArticleBtn.addEventListener('click', async function (e) {
                e.preventDefault();
                e.stopPropagation();
                await updateArticle();
            });
        }

        const cancelEditBtn = document.getElementById('cancelEdit');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                resetEditForms();
            });
        }

        // AUDIO-VISUEL
        initVideoForm('audio');

        // ÉMISSIONS
        initVideoForm('emission');

        // SPOTS
        initVideoForm('spot');

        // NO-COMMENT
        initVideoForm('nocomment');

        // RÉORGANISATION
        const saveOrderBtn = document.getElementById('saveOrder');
        if (saveOrderBtn) {
            saveOrderBtn.addEventListener('click', async function (e) {
                e.preventDefault();
                e.stopPropagation();
                await saveNewOrder();
            });
        }

        // UPLOAD IMAGE
        const articleImageInput = document.getElementById('articleImage');
        if (articleImageInput) {
            articleImageInput.addEventListener('change', handleImagePreview);
        }
    }

    function initVideoForm(type) {
        const addBtn = document.getElementById(`add${capitalize(type)}`);
        const updateBtn = document.getElementById(`update${capitalize(type)}`);
        const cancelBtn = document.getElementById(`cancel${capitalize(type)}Edit`);

        if (addBtn) {
            const newAddBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newAddBtn, addBtn);

            newAddBtn.addEventListener('click', async function (e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log(`➕ Ajout vidéo ${type}`);
                await addVideo(type);
            });
        }

        if (updateBtn) {
            updateBtn.addEventListener('click', async function (e) {
                e.preventDefault();
                e.stopPropagation();
                await updateVideo(type);
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                resetVideoEdit(type);
            });
        }
    }

    function initReorderSection() {
        document.querySelectorAll('.reorder-type-btn').forEach(btn => {
            btn.addEventListener('click', function () {
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
        const saveBtn = document.getElementById('saveReorderEdit');
        const deleteBtn = document.getElementById('deleteReorderItem');
        const cancelBtn = document.getElementById('cancelReorderEdit');

        if (saveBtn) {
            saveBtn.addEventListener('click', async function (e) {
                e.preventDefault();
                e.stopPropagation();
                await saveReorderEdit();
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async function (e) {
                e.preventDefault();
                e.stopPropagation();
                await deleteReorderItem();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                cancelReorderEdit();
            });
        }
    }

    // ================ FONCTIONS CRUD - PRESSE ÉCRITE ================

    async function addArticle() {
        const titleInput = document.getElementById('articleTitle');
        const descriptionInput = document.getElementById('articleDescription');
        const imageInput = document.getElementById('articleImage');

        if (!titleInput || !descriptionInput) return;

        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();

        if (!title || !description) {
            showAlert('presseAlert', 'Veuillez remplir tous les champs', 'error');
            return;
        }

        // Désactiver le bouton pour éviter les doubles envois
        const addBtn = document.getElementById('addArticle');
        if (addBtn) {
            addBtn.disabled = true;
            addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload en cours...';
        }

        try {
            let imageUrl = '';

            if (imageInput && imageInput.files && imageInput.files[0]) {
                showAlert('presseAlert', '📤 Upload vers Cloudinary...', 'info');

                const result = await window.CloudinaryConfig?.uploadImage(imageInput.files[0]);

                if (result?.success) {
                    imageUrl = result.url;
                    showAlert('presseAlert', '✅ Image uploadée avec succès!', 'success');
                } else {
                    throw new Error(result?.message || 'Échec de l\'upload');
                }
            } else {
                // Image par défaut
                imageUrl = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';
            }

            // Créer l'article
            const newArticle = {
                title,
                description,
                image: imageUrl
            };

            // UN SEUL APPEL À addPressArticle
            const result = await window.ExcellenceMediaData?.addPressArticle(newArticle);

            if (result?.success) {
                // Rafraîchir l'interface
                await loadPressData();
                await loadArticlesList();
                await loadReorderList('reorderPress', window.ExcellenceMediaData.pressData);

                resetEditForms();
                showNotification('✅ Article ajouté avec succès', 'success');
            } else {
                throw new Error('Erreur lors de l\'ajout');
            }

        } catch (error) {
            console.error('❌ Erreur:', error);
            showAlert('presseAlert', `❌ Erreur: ${error.message}`, 'error');
            showNotification('❌ Erreur lors de l\'ajout', 'error');
        } finally {
            // Réactiver le bouton
            if (addBtn) {
                addBtn.disabled = false;
                addBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter Article';
            }
        }
    }

    async function updateArticle() {
        if (!currentEditingId || currentEditingId.type !== 'article') return;

        const titleInput = document.getElementById('articleTitle');
        const descriptionInput = document.getElementById('articleDescription');

        if (!titleInput || !descriptionInput) return;

        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();

        if (!title || !description) {
            showAlert('presseAlert', 'Veuillez remplir tous les champs', 'error');
            return;
        }

        const updates = { title, description };

        const imageInput = document.getElementById('articleImage');

        if (imageInput && imageInput.files && imageInput.files[0]) {
            try {
                showAlert('presseAlert', '📤 Upload de la nouvelle image...', 'info');
                const result = await window.CloudinaryConfig?.uploadImage(imageInput.files[0]);

                if (result?.success) {
                    updates.image = result.url;
                    showAlert('presseAlert', '✅ Nouvelle image uploadée!', 'success');
                }
            } catch (error) {
                showAlert('presseAlert', '❌ Erreur upload image', 'error');
                return;
            }
        }

        const result = await window.ExcellenceMediaData?.updatePressArticle(currentEditingId.id, updates);

        if (result?.success) {
            await loadPressData();
            await loadArticlesList();
            await loadReorderList('reorderPress', window.ExcellenceMediaData.pressData);

            resetEditForms();
            showNotification('✅ Article mis à jour avec succès', 'success');
        }
    }

    window.editArticle = function (id) {
        const article = window.ExcellenceMediaData?.pressData.find(item => item.id === id);
        if (!article) return;

        document.getElementById('articleTitle').value = article.title;
        document.getElementById('articleDescription').value = article.description;

        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) {
            imagePreview.innerHTML = `
                <img src="${article.image}" alt="Prévisualisation" style="max-width: 200px; margin-top: 10px; border-radius: 5px;">
                <div style="margin-top: 5px; font-size: 0.8rem; color: #666;">Image actuelle</div>
            `;
        }

        document.getElementById('addArticle').style.display = 'none';
        document.getElementById('updateArticle').style.display = 'inline-block';

        currentEditingId = { type: 'article', id };
        showAlert('presseAlert', 'Modifiez l\'article ci-dessous', 'info');
    };

    window.deleteArticle = async function (id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

        const result = await window.ExcellenceMediaData?.deletePressArticle(id);

        if (result?.success) {
            await loadPressData();
            await loadArticlesList();
            await loadReorderList('reorderPress', window.ExcellenceMediaData.pressData);

            showNotification('✅ Article supprimé avec succès', 'success');
        }
    };

    // ================ FONCTIONS CRUD - VIDÉOS ================

    async function addVideo(type) {
        const typeCapitalized = capitalize(type);
        const titleInput = document.getElementById(`${type}Title`);
        const urlInput = document.getElementById(`${type}Url`);
        const alertId = `${type}Alert`;

        if (!titleInput || !urlInput) {
            console.error(`❌ Champs non trouvés pour type: ${type}`);
            return;
        }

        const title = titleInput.value.trim();
        const url = urlInput.value.trim();

        if (!title || !url) {
            showAlert(alertId, 'Veuillez remplir tous les champs', 'error');
            return;
        }

        // Désactiver le bouton
        const addBtn = document.getElementById(`add${typeCapitalized}`);
        if (addBtn) {
            addBtn.disabled = true;
            addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout en cours...';
        }

        try {
            const embedUrl = convertToEmbedUrl(url);
            if (!embedUrl) {
                showAlert(alertId, 'URL YouTube invalide', 'error');
                return;
            }

            const newVideo = { title, url: embedUrl };

            // UN SEUL APPEL
            const result = await window.ExcellenceMediaData?.addVideo(type, newVideo);

            if (result?.success) {
                // Rafraîchir l'interface
                const sectionMap = {
                    'audio': { sectionId: 'audioVisuel', dataKey: 'audioVisuelData' },
                    'emission': { sectionId: 'emission', dataKey: 'emissionData' },
                    'spot': { sectionId: 'spot', dataKey: 'spotData' },
                    'nocomment': { sectionId: 'nocomment', dataKey: 'nocommentData' }
                };

                const map = sectionMap[type];
                if (map) {
                    await loadVideoData(map.sectionId, map.dataKey, 1);
                    await loadVideosList(type, map.dataKey);
                    await loadReorderList(`reorder${capitalize(type)}`, window.ExcellenceMediaData[map.dataKey]);
                }

                resetVideoEdit(type);
                showNotification('✅ Vidéo ajoutée avec succès', 'success');
                showAlert(alertId, 'Vidéo ajoutée avec succès!', 'success');
            }

        } catch (error) {
            showAlert(alertId, '❌ Erreur lors de l\'ajout', 'error');
        } finally {
            // Réactiver le bouton
            if (addBtn) {
                addBtn.disabled = false;
                addBtn.innerHTML = `<i class="fas fa-plus"></i> Ajouter ${getTypeLabel(type)}`;
            }
        }
    }

    async function updateVideo(type) {
        if (!currentEditingId || currentEditingId.type !== type) return;

        const typeCapitalized = capitalize(type);
        const titleInput = document.getElementById(`${type}Title`);
        const urlInput = document.getElementById(`${type}Url`);
        const alertId = `${type}Alert`;

        if (!titleInput || !urlInput) return;

        const title = titleInput.value.trim();
        const url = urlInput.value.trim();

        if (!title || !url) {
            showAlert(alertId, 'Veuillez remplir tous les champs', 'error');
            return;
        }

        const embedUrl = convertToEmbedUrl(url);
        if (!embedUrl) {
            showAlert(alertId, 'URL YouTube invalide', 'error');
            return;
        }

        const updates = { title, url: embedUrl };

        const result = await window.ExcellenceMediaData?.updateVideo(type, currentEditingId.id, updates);

        if (result?.success) {
            const sectionMap = {
                'audio': { sectionId: 'audioVisuel', dataKey: 'audioVisuelData' },
                'emission': { sectionId: 'emission', dataKey: 'emissionData' },
                'spot': { sectionId: 'spot', dataKey: 'spotData' },
                'nocomment': { sectionId: 'nocomment', dataKey: 'nocommentData' }
            };

            const map = sectionMap[type];
            if (map) {
                await loadVideoData(map.sectionId, map.dataKey, getCurrentPage(type));
                await loadVideosList(type, map.dataKey);
                await loadReorderList(`reorder${typeCapitalized}`, window.ExcellenceMediaData[map.dataKey]);
            }

            resetVideoEdit(type);
            showNotification('✅ Vidéo mise à jour avec succès', 'success');
        }
    }

    window.editVideo = function (type, id) {
        const sectionMap = {
            'audio': 'audioVisuelData',
            'emission': 'emissionData',
            'spot': 'spotData',
            'nocomment': 'nocommentData'
        };

        const dataKey = sectionMap[type];
        if (!dataKey) return;

        const video = window.ExcellenceMediaData?.[dataKey]?.find(item => item.id === id);
        if (!video) return;

        let videoUrl = video.url;
        if (videoUrl.includes('embed/')) {
            const videoId = videoUrl.split('embed/')[1].split('?')[0];
            videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }

        const titleInput = document.getElementById(`${type}Title`);
        const urlInput = document.getElementById(`${type}Url`);

        if (titleInput) titleInput.value = video.title;
        if (urlInput) urlInput.value = videoUrl;

        document.getElementById(`add${capitalize(type)}`).style.display = 'none';
        document.getElementById(`update${capitalize(type)}`).style.display = 'inline-block';

        currentEditingId = { type, id };
        showAlert(`${type}Alert`, 'Modifiez l\'élément ci-dessous', 'info');
    };

    window.deleteVideo = async function (type, id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) return;

        const result = await window.ExcellenceMediaData?.deleteVideo(type, id);

        if (result?.success) {
            const sectionMap = {
                'audio': { sectionId: 'audioVisuel', dataKey: 'audioVisuelData' },
                'emission': { sectionId: 'emission', dataKey: 'emissionData' },
                'spot': { sectionId: 'spot', dataKey: 'spotData' },
                'nocomment': { sectionId: 'nocomment', dataKey: 'nocommentData' }
            };

            const map = sectionMap[type];
            if (map) {
                await loadVideoData(map.sectionId, map.dataKey, 1);
                await loadVideosList(type, map.dataKey);
                await loadReorderList(`reorder${capitalize(type)}`, window.ExcellenceMediaData[map.dataKey]);

                // Réinitialiser la pagination
                switch (type) {
                    case 'audio': currentAudioPage = 1; break;
                    case 'emission': currentEmissionPage = 1; break;
                    case 'spot': currentSpotPage = 1; break;
                    case 'nocomment': currentNocommentPage = 1; break;
                }
            }

            showNotification('✅ Vidéo supprimée avec succès', 'success');
        }
    };

    // ================ CHARGEMENT DES LISTES DASHBOARD ================

    async function loadArticlesList() {
        const container = document.getElementById('articlesList');
        if (!container) return;

        container.innerHTML = '';

        const pressData = window.ExcellenceMediaData?.pressData || [];

        if (pressData.length === 0) {
            container.innerHTML = '<p class="section-empty">Aucun article à afficher</p>';
            return;
        }

        pressData.forEach(item => {
            const article = document.createElement('div');
            article.className = 'sortable-item';
            article.dataset.id = item.id;
            article.draggable = true;

            article.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <i class="fas fa-grip-vertical drag-handle" style="color: #666;"></i>
                    <i class="fas fa-file-alt" style="color: #3949ab;"></i>
                    <strong>${escapeHTML(item.title)}</strong>
                    ${item.image && item.image.includes('cloudinary.com') ?
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

            attachDragEvents(article);
            container.appendChild(article);
        });
    }

    async function loadVideosList(type, dataKey) {
        const container = document.getElementById(`${type}VideosList`);
        if (!container) return;

        container.innerHTML = '';

        const data = window.ExcellenceMediaData?.[dataKey] || [];

        if (data.length === 0) {
            container.innerHTML = '<p class="section-empty">Aucune vidéo à afficher</p>';
            return;
        }

        let icon = 'fas fa-video';
        switch (type) {
            case 'emission': icon = 'fas fa-tv'; break;
            case 'spot': icon = 'fas fa-ad'; break;
            case 'nocomment': icon = 'fas fa-film'; break;
        }

        data.forEach(item => {
            const video = document.createElement('div');
            video.className = 'sortable-item';
            video.dataset.id = item.id;
            video.draggable = true;

            video.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <i class="fas fa-grip-vertical drag-handle" style="color: #666;"></i>
                    <i class="${icon}" style="color: #3949ab;"></i>
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

            attachDragEvents(video);
            container.appendChild(video);
        });
    }

    async function loadReorderLists() {
        await loadReorderList('reorderPress', 'pressData');
        await loadReorderList('reorderAudio', 'audioVisuelData');
        await loadReorderList('reorderEmission', 'emissionData');
        await loadReorderList('reorderSpot', 'spotData');
        await loadReorderList('reorderNocomment', 'nocommentData');
    }

    async function loadReorderList(containerId, dataKey) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        const data = window.ExcellenceMediaData?.[dataKey] || [];

        if (data.length === 0) {
            container.innerHTML = '<li class="sortable-item empty-state">Aucun élément à afficher</li>';
            return;
        }

        let icon = 'fas fa-file-alt';
        if (containerId.includes('Audio')) icon = 'fas fa-video';
        else if (containerId.includes('Emission')) icon = 'fas fa-tv';
        else if (containerId.includes('Spot')) icon = 'fas fa-ad';
        else if (containerId.includes('Nocomment')) icon = 'fas fa-film';

        let type = '';
        if (containerId.includes('Press')) type = 'presse';
        else if (containerId.includes('Audio')) type = 'audiovisuel';
        else if (containerId.includes('Emission')) type = 'emissions';
        else if (containerId.includes('Spot')) type = 'spots';
        else if (containerId.includes('Nocomment')) type = 'nocomment';

        data.forEach(item => {
            const li = document.createElement('li');
            li.className = 'sortable-item';
            li.dataset.id = item.id;
            li.draggable = true;

            li.innerHTML = `
                <div class="item-content">
                    <i class="${icon} item-icon"></i>
                    <span class="item-title">${escapeHTML(item.title)}</span>
                    ${item.image && item.image.includes('cloudinary.com') ?
                    '<span class="badge" style="background:#4caf50; color:white; padding:2px 6px; border-radius:3px; font-size:0.8em;">Cloudinary</span>' : ''}
                    <div class="item-actions">
                        <button class="btn btn-sm btn-edit" onclick="window.openReorderEditForm('${type}', '${item.id}')" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-delete" onclick="window.deleteReorderItem('${type}', '${item.id}')" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            attachDragEvents(li);
            container.appendChild(li);
        });
    }

    // ================ RÉORGANISATION ================

    window.openReorderEditForm = function (type, id) {
        currentReorderItemId = id;
        currentReorderType = type;

        let item, dataKey;

        switch (type) {
            case 'presse':
                dataKey = 'pressData';
                break;
            case 'audiovisuel':
                dataKey = 'audioVisuelData';
                break;
            case 'emissions':
                dataKey = 'emissionData';
                break;
            case 'spots':
                dataKey = 'spotData';
                break;
            case 'nocomment':
                dataKey = 'nocommentData';
                break;
            default:
                return;
        }

        item = window.ExcellenceMediaData?.[dataKey]?.find(item => item.id === id);

        if (!item) {
            showNotification('Élément non trouvé', 'error');
            return;
        }

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
                    <input type="text" id="editImage" class="form-control" value="${escapeHTML(item.image)}">
                    <small>L'URL sera sauvegardée sur Cloudinary</small>
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
        document.getElementById('reorderEditForm').scrollIntoView({ behavior: 'smooth' });

        showAlert('reorderEditAlert', '', '');
    };

    window.addNewItemInReorder = function (type) {
        currentReorderItemId = null;
        currentReorderType = type;

        document.getElementById('reorderEditTitle').textContent = `Ajouter un nouvel élément (${type})`;

        let fieldsHtml = '';

        if (type === 'presse') {
            fieldsHtml = `
                <div class="form-group">
                    <label for="editTitle">Titre:</label>
                    <input type="text" id="editTitle" class="form-control" placeholder="Titre de l'article">
                </div>
                <div class="form-group">
                    <label for="editDescription">Description:</label>
                    <textarea id="editDescription" class="form-control" rows="4" placeholder="Description de l'article"></textarea>
                </div>
                <div class="form-group">
                    <label for="editImage">Image URL:</label>
                    <input type="text" id="editImage" class="form-control" placeholder="https://exemple.com/image.jpg">
                    <small>L'URL sera sauvegardée sur Cloudinary</small>
                </div>
            `;
        } else {
            fieldsHtml = `
                <div class="form-group">
                    <label for="editTitle">Titre:</label>
                    <input type="text" id="editTitle" class="form-control" placeholder="Titre de la vidéo">
                </div>
                <div class="form-group">
                    <label for="editUrl">URL YouTube:</label>
                    <input type="text" id="editUrl" class="form-control" placeholder="https://www.youtube.com/watch?v=...">
                </div>
            `;
        }

        document.getElementById('reorderEditFields').innerHTML = fieldsHtml;
        document.getElementById('reorderEditForm').style.display = 'block';
        document.getElementById('reorderEditForm').scrollIntoView({ behavior: 'smooth' });
    };

    async function saveReorderEdit() {
        const titleInput = document.getElementById('editTitle');
        if (!titleInput) return;

        const title = titleInput.value.trim();
        if (!title) {
            showAlert('reorderEditAlert', 'Le titre est obligatoire', 'error');
            return;
        }

        const saveBtn = document.getElementById('saveReorderEdit');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...';
        }

        try {
            if (currentReorderType === 'presse') {
                await saveReorderEditPress(title);
            } else {
                await saveReorderEditVideo(title);
            }

            cancelReorderEdit();
            showNotification(currentReorderItemId ? '✅ Élément modifié' : '✅ Élément ajouté', 'success');

        } catch (error) {
            showAlert('reorderEditAlert', `❌ Erreur: ${error.message}`, 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
            }
        }
    }

    async function saveReorderEditPress(title) {
        const descriptionInput = document.getElementById('editDescription');
        const imageInput = document.getElementById('editImage');

        const description = descriptionInput?.value.trim() || '';
        let image = imageInput?.value.trim() || '';

        if (!description) {
            throw new Error('La description est obligatoire');
        }

        // Upload de l'image vers Cloudinary si nécessaire
        if (image && !image.includes('cloudinary.com')) {
            const result = await window.CloudinaryConfig?.uploadFromUrl(image);
            if (result?.success) {
                image = result.url;
            }
        }

        if (currentReorderItemId) {
            // Modification
            await window.ExcellenceMediaData?.updatePressArticle(currentReorderItemId, {
                title, description, image
            });
        } else {
            // Ajout
            await window.ExcellenceMediaData?.addPressArticle({
                title, description, image
            });
        }

        // Rafraîchir
        await loadPressData();
        await loadArticlesList();
        await loadReorderList('reorderPress', 'pressData');
    }

    async function saveReorderEditVideo(title) {
        const urlInput = document.getElementById('editUrl');
        const url = urlInput?.value.trim() || '';

        if (!url) {
            throw new Error('L\'URL est obligatoire');
        }

        const embedUrl = convertToEmbedUrl(url);
        if (!embedUrl) {
            throw new Error('URL YouTube invalide');
        }

        const typeMap = {
            'audiovisuel': 'audio',
            'emissions': 'emission',
            'spots': 'spot',
            'nocomment': 'nocomment'
        };

        const videoType = typeMap[currentReorderType] || currentReorderType;

        if (currentReorderItemId) {
            await window.ExcellenceMediaData?.updateVideo(videoType, currentReorderItemId, {
                title, url: embedUrl
            });
        } else {
            await window.ExcellenceMediaData?.addVideo(videoType, {
                title, url: embedUrl
            });
        }

        // Rafraîchir
        const sectionMap = {
            'audiovisuel': { sectionId: 'audioVisuel', dataKey: 'audioVisuelData', type: 'audio' },
            'emissions': { sectionId: 'emission', dataKey: 'emissionData', type: 'emission' },
            'spots': { sectionId: 'spot', dataKey: 'spotData', type: 'spot' },
            'nocomment': { sectionId: 'nocomment', dataKey: 'nocommentData', type: 'nocomment' }
        };

        const map = sectionMap[currentReorderType];
        if (map) {
            await loadVideoData(map.sectionId, map.dataKey, 1);
            await loadVideosList(map.type, map.dataKey);
            await loadReorderList(`reorder${capitalize(map.type)}`, map.dataKey);
        }
    }

    async function deleteReorderItem() {
        if (!currentReorderItemId || !confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
            return;
        }

        const deleteBtn = document.getElementById('deleteReorderItem');
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Suppression...';
        }

        try {
            if (currentReorderType === 'presse') {
                await window.ExcellenceMediaData?.deletePressArticle(currentReorderItemId);
                await loadPressData();
                await loadArticlesList();
                await loadReorderList('reorderPress', 'pressData');

            } else {
                const typeMap = {
                    'audiovisuel': 'audio',
                    'emissions': 'emission',
                    'spots': 'spot',
                    'nocomment': 'nocomment'
                };

                const videoType = typeMap[currentReorderType] || currentReorderType;
                await window.ExcellenceMediaData?.deleteVideo(videoType, currentReorderItemId);

                const sectionMap = {
                    'audiovisuel': { sectionId: 'audioVisuel', dataKey: 'audioVisuelData', type: 'audio' },
                    'emissions': { sectionId: 'emission', dataKey: 'emissionData', type: 'emission' },
                    'spots': { sectionId: 'spot', dataKey: 'spotData', type: 'spot' },
                    'nocomment': { sectionId: 'nocomment', dataKey: 'nocommentData', type: 'nocomment' }
                };

                const map = sectionMap[currentReorderType];
                if (map) {
                    await loadVideoData(map.sectionId, map.dataKey, 1);
                    await loadVideosList(map.type, map.dataKey);
                    await loadReorderList(`reorder${capitalize(map.type)}`, map.dataKey);
                }
            }

            cancelReorderEdit();
            showNotification('✅ Élément supprimé avec succès', 'success');

        } catch (error) {
            showAlert('reorderEditAlert', `❌ Erreur: ${error.message}`, 'error');
        } finally {
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Supprimer';
            }
        }
    }

    window.deleteReorderItem = function (type, id) {
        currentReorderType = type;
        currentReorderItemId = id;
        deleteReorderItem();
    };

    function cancelReorderEdit() {
        document.getElementById('reorderEditForm').style.display = 'none';
        currentReorderItemId = null;
        showAlert('reorderEditAlert', '', '');
    }

    async function saveNewOrder() {
        const newPressOrder = getNewOrderFromList('reorderPress');
        const newAudioOrder = getNewOrderFromList('reorderAudio');
        const newEmissionOrder = getNewOrderFromList('reorderEmission');
        const newSpotOrder = getNewOrderFromList('reorderSpot');
        const newNocommentOrder = getNewOrderFromList('reorderNocomment');

        if (newPressOrder.length) {
            await window.ExcellenceMediaData?.reorderSection('pressData', newPressOrder);
        }
        if (newAudioOrder.length) {
            await window.ExcellenceMediaData?.reorderSection('audioVisuelData', newAudioOrder);
        }
        if (newEmissionOrder.length) {
            await window.ExcellenceMediaData?.reorderSection('emissionData', newEmissionOrder);
        }
        if (newSpotOrder.length) {
            await window.ExcellenceMediaData?.reorderSection('spotData', newSpotOrder);
        }
        if (newNocommentOrder.length) {
            await window.ExcellenceMediaData?.reorderSection('nocommentData', newNocommentOrder);
        }

        await refreshAllSections();
        await refreshDashboard();

        showNotification('✅ Ordre enregistré avec succès', 'success');
    }

    function getNewOrderFromList(listId) {
        const list = document.getElementById(listId);
        if (!list) return [];
        return Array.from(list.children)
            .map(item => item.dataset.id)
            .filter(id => id);
    }

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
        e.dataTransfer.setData('text/html', this.innerHTML);
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

        if (dragSrcEl !== this) {
            const parent = this.parentNode;
            const allItems = Array.from(parent.children);
            const dragIndex = allItems.indexOf(dragSrcEl);
            const dropIndex = allItems.indexOf(this);

            if (dragIndex < dropIndex) {
                parent.insertBefore(dragSrcEl, this.nextSibling);
            } else {
                parent.insertBefore(dragSrcEl, this);
            }
        }

        this.classList.remove('over');
        return false;
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        document.querySelectorAll('.sortable-item').forEach(item => {
            item.classList.remove('over');
        });
    }

    // ================ FONCTIONS UTILITAIRES ================

    function convertToEmbedUrl(url) {
        let videoId = '';

        if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('embed/')[1].split('?')[0];
        } else {
            return null;
        }

        return `https://www.youtube.com/embed/${videoId}`;
    }

    function capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function getTypeLabel(type) {
        const labels = {
            'audio': 'Vidéo',
            'emission': 'Émission',
            'spot': 'Spot',
            'nocomment': 'Vidéo'
        };
        return labels[type] || type;
    }

    function getCurrentPage(type) {
        switch (type) {
            case 'audio': return currentAudioPage;
            case 'emission': return currentEmissionPage;
            case 'spot': return currentSpotPage;
            case 'nocomment': return currentNocommentPage;
            default: return 1;
        }
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
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return 'Date inconnue';
        }
    }

    function handleImagePreview(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            showAlert('presseAlert', 'L\'image ne doit pas dépasser 10MB', 'error');
            e.target.value = '';
            return;
        }

        if (!file.type.match('image.*')) {
            showAlert('presseAlert', 'Veuillez sélectionner une image valide', 'error');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (event) {
            const imagePreview = document.getElementById('imagePreview');
            if (imagePreview) {
                imagePreview.innerHTML = `
                    <img src="${event.target.result}" alt="Prévisualisation" style="max-width: 200px; margin-top: 10px; border-radius: 5px;">
                    <div style="margin-top: 5px; font-size: 0.8rem; color: #666;">Image prête pour l'upload</div>
                `;
            }
        };
        reader.readAsDataURL(file);
    }

    function showAlert(alertId, message, type) {
        const alert = document.getElementById(alertId);
        if (!alert) return;

        alert.textContent = message;
        alert.className = `alert alert-${type}`;
        alert.style.display = message ? 'block' : 'none';
    }

    function showNotification(message, type) {
        if (!notification) return;

        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';

        setTimeout(() => {
            if (notification) notification.style.display = 'none';
        }, 3000);
    }

    function resetEditForms() {
        const titleInput = document.getElementById('articleTitle');
        const descriptionInput = document.getElementById('articleDescription');
        const imageInput = document.getElementById('articleImage');
        const imagePreview = document.getElementById('imagePreview');

        if (titleInput) titleInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        if (imageInput) imageInput.value = '';
        if (imagePreview) imagePreview.innerHTML = '';

        document.getElementById('addArticle').style.display = 'inline-block';
        document.getElementById('updateArticle').style.display = 'none';

        showAlert('presseAlert', '', '');
        currentEditingId = null;
    }

    function resetVideoEdit(type) {
        const titleInput = document.getElementById(`${type}Title`);
        const urlInput = document.getElementById(`${type}Url`);
        const addBtn = document.getElementById(`add${capitalize(type)}`);
        const updateBtn = document.getElementById(`update${capitalize(type)}`);

        if (titleInput) titleInput.value = '';
        if (urlInput) urlInput.value = '';

        // Utiliser safeStyle pour éviter les erreurs
        if (addBtn) safeStyle(addBtn).display = 'inline-block';
        if (updateBtn) safeStyle(updateBtn).display = 'none';

        showAlert(`${type}Alert`, '', '');

        if (currentEditingId?.type === type) {
            currentEditingId = null;
        }
    }

    function resetAllVideoEdits() {
        resetVideoEdit('audio');
        resetVideoEdit('emission');
        resetVideoEdit('spot');
        resetVideoEdit('nocomment');
    }

    // ================ SYNCHRONISATION CLOUDINARY ================

    window.syncWithCloudinary = async function () {
        try {
            showNotification('🔄 Synchronisation Cloudinary...', 'info');

            const result = await window.CloudinaryDB?.syncData();

            if (result?.success) {
                await window.ExcellenceMediaData?.load();
                await refreshAllSections();
                await refreshDashboard();

                showNotification('✅ Synchronisation réussie!', 'success');
            } else {
                showNotification('❌ Échec de la synchronisation', 'error');
            }
        } catch (error) {
            console.error('Erreur synchronisation:', error);
            showNotification('❌ Erreur lors de la synchronisation', 'error');
        }
    };

    window.backupToLocal = function () {
        try {
            const data = {
                pressData: window.ExcellenceMediaData?.pressData || [],
                audioVisuelData: window.ExcellenceMediaData?.audioVisuelData || [],
                emissionData: window.ExcellenceMediaData?.emissionData || [],
                spotData: window.ExcellenceMediaData?.spotData || [],
                nocommentData: window.ExcellenceMediaData?.nocommentData || [],
                metadata: {
                    exported: new Date().toISOString(),
                    version: '1.0'
                }
            };

            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `excellence-media-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showNotification('✅ Sauvegarde téléchargée', 'success');
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            showNotification('❌ Erreur lors du téléchargement', 'error');
        }
    };

    // ================ EXPOSITION DES FONCTIONS GLOBALES ================

    window.openDashboard = openDashboard;
    window.closeDashboard = closeDashboard;
    window.performSearch = performSearch;
    window.resetSearch = resetSearch;
    window.changePage = window.changePage;
    window.editArticle = editArticle;
    window.deleteArticle = deleteArticle;
    window.editVideo = editVideo;
    window.deleteVideo = deleteVideo;
    window.openReorderEditForm = openReorderEditForm;
    window.addNewItemInReorder = addNewItemInReorder;
    window.deleteReorderItem = deleteReorderItem;
    window.syncWithCloudinary = syncWithCloudinary;
    window.backupToLocal = backupToLocal;

    // ================ DÉMARRAGE ================

    await init();
});

// ================ CARROUSEL ================

document.addEventListener('DOMContentLoaded', function () {
    const carousel = document.getElementById('heroCarousel');
    if (!carousel) return;

    const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    const dots = Array.from(carousel.querySelectorAll('.dot'));
    let current = slides.findIndex(s => s.classList.contains('active'));
    if (current < 0) current = 0;

    const intervalMs = 5000;
    let timer = null;

    function show(index) {
        slides.forEach((s, i) => s.classList.toggle('active', i === index));
        dots.forEach((d, i) => d.classList.toggle('active', i === index));
        current = index;
    }

    function next() {
        show((current + 1) % slides.length);
    }

    dots.forEach(dot => {
        dot.addEventListener('click', function () {
            const idx = Number(this.dataset.index);
            if (!isNaN(idx)) {
                show(idx);
                resetTimer();
            }
        });
    });

    function resetTimer() {
        if (timer) clearInterval(timer);
        timer = setInterval(next, intervalMs);
    }

    resetTimer();
});

// ================ COMPTEUR PDF ================

document.addEventListener('DOMContentLoaded', function () {
    const pdfLink = document.getElementById('pdfDownloadLink');
    const downloadCount = document.getElementById('downloadCount');

    if (pdfLink && downloadCount) {
        let count = localStorage.getItem('pdfDownloadCount') || 0;
        downloadCount.textContent = `(${count} téléchargements)`;

        pdfLink.addEventListener('click', function () {
            count = parseInt(count) + 1;
            localStorage.setItem('pdfDownloadCount', count);
            downloadCount.textContent = `(${count} téléchargements)`;
            localStorage.setItem('lastPdfDownload', new Date().toISOString());
        });
    }
});