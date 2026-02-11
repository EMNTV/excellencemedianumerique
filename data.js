// data.js - Version Cloudinary UNIQUEMENT
const ExcellenceMediaData = {
    pressData: [],
    audioVisuelData: [],
    emissionData: [],
    spotData: [],
    nocommentData: [],
    
    async load() {
        if (!window.CloudinaryDB) return this.getDefault();
        
        const result = await window.CloudinaryDB.loadData();
        if (result.success) {
            this.pressData = result.data.pressData || [];
            this.audioVisuelData = result.data.audioVisuelData || [];
            this.emissionData = result.data.emissionData || [];
            this.spotData = result.data.spotData || [];
            this.nocommentData = result.data.nocommentData || [];
            console.log(`✅ Chargé: ${result.source}`);
        }
        return result.data;
    },
    
    async save() {
        const data = {
            pressData: this.pressData,
            audioVisuelData: this.audioVisuelData,
            emissionData: this.emissionData,
            spotData: this.spotData,
            nocommentData: this.nocommentData,
            metadata: { lastUpdated: new Date().toISOString() }
        };
        
        return await window.CloudinaryDB.saveData(data);
    },
    
    // CRUD operations...
    async addPressArticle(article) {
        article.id = `press_${Date.now()}_${Math.random()}`;
        article.dateAdded = new Date().toISOString();
        this.pressData.unshift(article);
        return await this.save();
    },
    
    async deletePressArticle(id) {
        this.pressData = this.pressData.filter(a => a.id !== id);
        return await this.save();
    },
    
    async addVideo(type, video) {
        const section = this.getSectionName(type);
        video.id = `${type}_${Date.now()}_${Math.random()}`;
        video.dateAdded = new Date().toISOString();
        this[section].unshift(video);
        return await this.save();
    },
    
    async deleteVideo(type, id) {
        const section = this.getSectionName(type);
        this[section] = this[section].filter(v => v.id !== id);
        return await this.save();
    },
    
    getSectionName(type) {
        const map = {
            'audio': 'audioVisuelData', 'audiovisuel': 'audioVisuelData',
            'emission': 'emissionData', 'emissions': 'emissionData',
            'spot': 'spotData', 'spots': 'spotData',
            'nocomment': 'nocommentData', 'presse': 'pressData'
        };
        return map[type];
    },
    
    getDefault() {
        return {
            pressData: [], audioVisuelData: [], emissionData: [],
            spotData: [], nocommentData: [], metadata: {}
        };
    }
};

window.ExcellenceMediaData = ExcellenceMediaData;
