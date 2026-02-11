// data.js - Version CLOUDINARY UNIQUEMENT
const ExcellenceMediaData = {
    pressData: [],
    audioVisuelData: [],
    emissionData: [],
    spotData: [],
    nocommentData: [],
    
    async load() {
    console.log('📦 Chargement des données...');
    
    if (!window.CloudinaryDB) {
        console.error('❌ CloudinaryDB manquant');
        return this.getDefault();
    }
    
    try {
        const result = await window.CloudinaryDB.loadData();
        
        if (result.success && result.data) {
            // 🔥 MISE À JOUR FORCÉE DE TOUTES LES SECTIONS
            this.pressData = result.data.pressData || [];
            this.audioVisuelData = result.data.audioVisuelData || [];
            this.emissionData = result.data.emissionData || [];
            this.spotData = result.data.spotData || [];
            this.nocommentData = result.data.nocommentData || [];
            
            console.log('✅ Données chargées depuis', result.source);
            console.log('📰 Articles chargés:', this.pressData.length);
            
            // 🔥 RAFRAÎCHIR L'AFFICHAGE
            if (window.loadPressData) window.loadPressData();
            if (window.loadArticlesList) window.loadArticlesList();
            if (window.loadReorderLists) window.loadReorderLists();
            
            return result.data;
        }
    } catch (error) {
        console.error('❌ Erreur load:', error);
    }
    
    return this.getDefault();
}
    
    async save() {
        const data = {
            pressData: this.pressData,
            audioVisuelData: this.audioVisuelData,
            emissionData: this.emissionData,
            spotData: this.spotData,
            nocommentData: this.nocommentData,
            settings: { videosPerPage: 3 },
            metadata: {
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            }
        };
        
        return await window.CloudinaryDB.saveData(data);
    },
    
    // CRUD Presse
    async addPressArticle(article) {
        article.id = `press_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        article.dateAdded = new Date().toISOString();
        this.pressData.unshift(article);
        return await this.save();
    },
    
    async updatePressArticle(id, updates) {
        const index = this.pressData.findIndex(a => a.id === id);
        if (index === -1) return { success: false };
        this.pressData[index] = { ...this.pressData[index], ...updates, lastModified: new Date().toISOString() };
        return await this.save();
    },
    
    async deletePressArticle(id) {
        this.pressData = this.pressData.filter(a => a.id !== id);
        return await this.save();
    },
    
    // CRUD Vidéos
    async addVideo(type, video) {
        const section = this.getSectionName(type);
        if (!section) return { success: false };
        
        video.id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        video.dateAdded = new Date().toISOString();
        this[section].unshift(video);
        return await this.save();
    },
    
    async updateVideo(type, id, updates) {
        const section = this.getSectionName(type);
        if (!section) return { success: false };
        
        const index = this[section].findIndex(v => v.id === id);
        if (index === -1) return { success: false };
        
        this[section][index] = { ...this[section][index], ...updates, lastModified: new Date().toISOString() };
        return await this.save();
    },
    
    async deleteVideo(type, id) {
        const section = this.getSectionName(type);
        if (!section) return { success: false };
        
        this[section] = this[section].filter(v => v.id !== id);
        return await this.save();
    },
    
    async reorderSection(section, newOrder) {
        if (!this[section]) return { success: false };
        
        const reordered = [];
        newOrder.forEach(id => {
            const item = this[section].find(item => item.id === id);
            if (item) reordered.push(item);
        });
        
        this[section] = reordered;
        return await this.save();
    },
    
    getSectionName(type) {
        const map = {
            'audio': 'audioVisuelData', 'audiovisuel': 'audioVisuelData',
            'emission': 'emissionData', 'emissions': 'emissionData',
            'spot': 'spotData', 'spots': 'spotData',
            'nocomment': 'nocommentData',
            'presse': 'pressData'
        };
        return map[type];
    },
    
    getStats() {
        return {
            presse: this.pressData.length,
            audio: this.audioVisuelData.length,
            emissions: this.emissionData.length,
            spots: this.spotData.length,
            nocomment: this.nocommentData.length,
            lastUpdated: this.metadata?.lastUpdated || 'Jamais'
        };
    },
    
    getDefault() {
        return {
            pressData: [], audioVisuelData: [], emissionData: [],
            spotData: [], nocommentData: [], metadata: {}
        };
    }
};

window.ExcellenceMediaData = ExcellenceMediaData;

