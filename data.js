// data.js - Gestion des données avec cache local
const ExcellenceMediaData = {
    // Données en mémoire
    pressData: [],
    audioVisuelData: [],
    emissionData: [],
    spotData: [],
    nocommentData: [],
    metadata: {},
    
    // Charger les données
    async load() {
        console.log('📦 Chargement des données...');
        
        try {
            // Charger depuis CloudinaryDB
            if (window.CloudinaryDB) {
                const result = await window.CloudinaryDB.loadData();
                
                if (result.success) {
                    this.pressData = result.data.pressData || [];
                    this.audioVisuelData = result.data.audioVisuelData || [];
                    this.emissionData = result.data.emissionData || [];
                    this.spotData = result.data.spotData || [];
                    this.nocommentData = result.data.nocommentData || [];
                    this.metadata = result.data.metadata || { lastUpdated: new Date().toISOString() };
                    
                    console.log('✅ Données chargées:', {
                        presse: this.pressData.length,
                        audio: this.audioVisuelData.length,
                        emissions: this.emissionData.length,
                        spots: this.spotData.length,
                        nocomment: this.nocommentData.length,
                        source: result.source
                    });
                    
                    return result.data;
                }
            }
            
            return this.getDefaultData();
            
        } catch (error) {
            console.error('❌ Erreur chargement:', error);
            return this.getDefaultData();
        }
    },
    
    // Données par défaut
    getDefaultData() {
        const defaultData = {
            pressData: [],
            audioVisuelData: [],
            emissionData: [],
            spotData: [],
            nocommentData: [],
            settings: { videosPerPage: 3 },
            metadata: {
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            }
        };
        
        this.pressData = defaultData.pressData;
        this.audioVisuelData = defaultData.audioVisuelData;
        this.emissionData = defaultData.emissionData;
        this.spotData = defaultData.spotData;
        this.nocommentData = defaultData.nocommentData;
        this.metadata = defaultData.metadata;
        
        return defaultData;
    },
    
    // Sauvegarder
    async save() {
        const data = {
            pressData: this.pressData,
            audioVisuelData: this.audioVisuelData,
            emissionData: this.emissionData,
            spotData: this.spotData,
            nocommentData: this.nocommentData,
            settings: { videosPerPage: 3 },
            metadata: {
                ...this.metadata,
                lastUpdated: new Date().toISOString()
            }
        };
        
        if (window.CloudinaryDB) {
            return await window.CloudinaryDB.saveData(data);
        }
        
        return { success: false };
    },
    
    // Ajouter un article
    async addPressArticle(article) {
        article.id = this.generateId('press');
        article.dateAdded = new Date().toISOString();
        article.lastModified = new Date().toISOString();
        
        this.pressData.unshift(article);
        
        const result = await this.save();
        return { success: result.success, article };
    },
    
    // Ajouter une vidéo
    async addVideo(type, video) {
        const section = this.getSectionName(type);
        if (!section || !this[section]) return { success: false };
        
        video.id = this.generateId(type);
        video.dateAdded = new Date().toISOString();
        video.lastModified = new Date().toISOString();
        
        this[section].unshift(video);
        
        const result = await this.save();
        return { success: result.success, video };
    },
    
    // Mettre à jour un article
    async updatePressArticle(id, updates) {
        const index = this.pressData.findIndex(item => item.id === id);
        if (index === -1) return { success: false };
        
        this.pressData[index] = {
            ...this.pressData[index],
            ...updates,
            lastModified: new Date().toISOString()
        };
        
        const result = await this.save();
        return { success: result.success };
    },
    
    // Mettre à jour une vidéo
    async updateVideo(type, id, updates) {
        const section = this.getSectionName(type);
        if (!section || !this[section]) return { success: false };
        
        const index = this[section].findIndex(item => item.id === id);
        if (index === -1) return { success: false };
        
        this[section][index] = {
            ...this[section][index],
            ...updates,
            lastModified: new Date().toISOString()
        };
        
        const result = await this.save();
        return { success: result.success };
    },
    
    // Supprimer un article
    async deletePressArticle(id) {
        this.pressData = this.pressData.filter(item => item.id !== id);
        const result = await this.save();
        return { success: result.success };
    },
    
    // Supprimer une vidéo
    async deleteVideo(type, id) {
        const section = this.getSectionName(type);
        if (!section || !this[section]) return { success: false };
        
        this[section] = this[section].filter(item => item.id !== id);
        const result = await this.save();
        return { success: result.success };
    },
    
    // Réorganiser
    async reorderSection(section, newOrder) {
        if (!this[section]) return { success: false };
        
        const reordered = [];
        newOrder.forEach(id => {
            const item = this[section].find(item => item.id === id);
            if (item) reordered.push(item);
        });
        
        this[section] = reordered;
        const result = await this.save();
        return { success: result.success };
    },
    
    // Générer ID
    generateId(type) {
        return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    // Obtenir le nom de section
    getSectionName(type) {
        const map = {
            'audio': 'audioVisuelData',
            'audiovisuel': 'audioVisuelData',
            'emission': 'emissionData',
            'emissions': 'emissionData',
            'spot': 'spotData',
            'spots': 'spotData',
            'nocomment': 'nocommentData',
            'presse': 'pressData'
        };
        return map[type];
    },
    
    // Statistiques
    getStats() {
        return {
            presse: this.pressData?.length || 0,
            audio: this.audioVisuelData?.length || 0,
            emissions: this.emissionData?.length || 0,
            spots: this.spotData?.length || 0,
            nocomment: this.nocommentData?.length || 0,
            lastUpdated: this.metadata?.lastUpdated || 'Jamais'
        };
    }
};

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation ExcellenceMediaData...');
    await ExcellenceMediaData.load();
    window.ExcellenceMediaData = ExcellenceMediaData;
});