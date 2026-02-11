// data.js - VERSION SIMPLIFIÉE ET 100% FONCTIONNELLE
const ExcellenceMediaData = {
    // Données en mémoire
    pressData: [],
    audioVisuelData: [],
    emissionData: [],
    spotData: [],
    nocommentData: [],
    metadata: {},
    
    // Charger les données (SANS async/await)
    load: function() {
        console.log("📦 Chargement des données...");
        
        return new Promise(function(resolve, reject) {
            if (!window.CloudinaryDB) {
                console.error("❌ CloudinaryDB non disponible");
                resolve(ExcellenceMediaData.getDefault());
                return;
            }
            
            window.CloudinaryDB.loadData().then(function(result) {
                if (result.success && result.data) {
                    ExcellenceMediaData.pressData = result.data.pressData || [];
                    ExcellenceMediaData.audioVisuelData = result.data.audioVisuelData || [];
                    ExcellenceMediaData.emissionData = result.data.emissionData || [];
                    ExcellenceMediaData.spotData = result.data.spotData || [];
                    ExcellenceMediaData.nocommentData = result.data.nocommentData || [];
                    ExcellenceMediaData.metadata = result.data.metadata || {};
                    
                    console.log("✅ Données chargées depuis", result.source || "cloudinary");
                    console.log("📰 Articles:", ExcellenceMediaData.pressData.length);
                    console.log("🎬 Vidéos audio:", ExcellenceMediaData.audioVisuelData.length);
                    console.log("📺 Émissions:", ExcellenceMediaData.emissionData.length);
                    console.log("📢 Spots:", ExcellenceMediaData.spotData.length);
                    console.log("🎥 No-comment:", ExcellenceMediaData.nocommentData.length);
                    
                    resolve(result.data);
                } else {
                    var defaultData = ExcellenceMediaData.getDefault();
                    ExcellenceMediaData.setData(defaultData);
                    resolve(defaultData);
                }
            }).catch(function(error) {
                console.error("❌ Erreur chargement:", error);
                var defaultData = ExcellenceMediaData.getDefault();
                ExcellenceMediaData.setData(defaultData);
                resolve(defaultData);
            });
        });
    },
    
    // Définir les données
    setData: function(data) {
        this.pressData = data.pressData || [];
        this.audioVisuelData = data.audioVisuelData || [];
        this.emissionData = data.emissionData || [];
        this.spotData = data.spotData || [];
        this.nocommentData = data.nocommentData || [];
        this.metadata = data.metadata || { lastUpdated: new Date().toISOString() };
    },
    
    // Données par défaut
    getDefault: function() {
        return {
            pressData: [],
            audioVisuelData: [],
            emissionData: [],
            spotData: [],
            nocommentData: [],
            settings: { videosPerPage: 3 },
            metadata: {
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                version: "1.0"
            }
        };
    },
    
    // Sauvegarder
    save: function() {
        console.log("💾 Sauvegarde des données...");
        
        var data = {
            pressData: this.pressData,
            audioVisuelData: this.audioVisuelData,
            emissionData: this.emissionData,
            spotData: this.spotData,
            nocommentData: this.nocommentData,
            settings: { videosPerPage: 3 },
            metadata: {
                lastUpdated: new Date().toISOString(),
                version: "1.0"
            }
        };
        
        return new Promise(function(resolve, reject) {
            if (!window.CloudinaryDB) {
                console.error("❌ CloudinaryDB non disponible");
                resolve({ success: false, error: "CloudinaryDB manquant" });
                return;
            }
            
            window.CloudinaryDB.saveData(data).then(function(result) {
                if (result.success) {
                    console.log("✅ Données sauvegardées avec succès");
                }
                resolve(result);
            }).catch(function(error) {
                console.error("❌ Erreur sauvegarde:", error);
                resolve({ success: false, error: error.message });
            });
        });
    },
    
    // ================ CRUD PRESSE ================
    addPressArticle: function(article) {
        article.id = "press_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
        article.dateAdded = new Date().toISOString();
        article.lastModified = new Date().toISOString();
        
        this.pressData.unshift(article);
        return this.save();
    },
    
    updatePressArticle: function(id, updates) {
        var index = -1;
        for (var i = 0; i < this.pressData.length; i++) {
            if (this.pressData[i].id === id) {
                index = i;
                break;
            }
        }
        
        if (index === -1) {
            return Promise.resolve({ success: false, error: "Article non trouvé" });
        }
        
        this.pressData[index] = Object.assign({}, this.pressData[index], updates);
        this.pressData[index].lastModified = new Date().toISOString();
        
        return this.save();
    },
    
    deletePressArticle: function(id) {
        var newData = [];
        for (var i = 0; i < this.pressData.length; i++) {
            if (this.pressData[i].id !== id) {
                newData.push(this.pressData[i]);
            }
        }
        this.pressData = newData;
        return this.save();
    },
    
    // ================ CRUD VIDÉOS ================
    addVideo: function(type, video) {
        var section = this.getSectionName(type);
        if (!section || !this[section]) {
            return Promise.resolve({ success: false, error: "Section invalide" });
        }
        
        video.id = type + "_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
        video.dateAdded = new Date().toISOString();
        video.lastModified = new Date().toISOString();
        
        this[section].unshift(video);
        return this.save();
    },
    
    updateVideo: function(type, id, updates) {
        var section = this.getSectionName(type);
        if (!section || !this[section]) {
            return Promise.resolve({ success: false, error: "Section invalide" });
        }
        
        var index = -1;
        for (var i = 0; i < this[section].length; i++) {
            if (this[section][i].id === id) {
                index = i;
                break;
            }
        }
        
        if (index === -1) {
            return Promise.resolve({ success: false, error: "Vidéo non trouvée" });
        }
        
        this[section][index] = Object.assign({}, this[section][index], updates);
        this[section][index].lastModified = new Date().toISOString();
        
        return this.save();
    },
    
    deleteVideo: function(type, id) {
        var section = this.getSectionName(type);
        if (!section || !this[section]) {
            return Promise.resolve({ success: false, error: "Section invalide" });
        }
        
        var newData = [];
        for (var i = 0; i < this[section].length; i++) {
            if (this[section][i].id !== id) {
                newData.push(this[section][i]);
            }
        }
        this[section] = newData;
        return this.save();
    },
    
    // ================ RÉORGANISATION ================
    reorderSection: function(section, newOrder) {
        if (!this[section]) {
            return Promise.resolve({ success: false, error: "Section invalide" });
        }
        
        var reordered = [];
        for (var i = 0; i < newOrder.length; i++) {
            var id = newOrder[i];
            for (var j = 0; j < this[section].length; j++) {
                if (this[section][j].id === id) {
                    reordered.push(this[section][j]);
                    break;
                }
            }
        }
        
        this[section] = reordered;
        return this.save();
    },
    
    // ================ UTILITAIRES ================
    getSectionName: function(type) {
        if (type === "audio" || type === "audiovisuel") return "audioVisuelData";
        if (type === "emission" || type === "emissions") return "emissionData";
        if (type === "spot" || type === "spots") return "spotData";
        if (type === "nocomment") return "nocommentData";
        if (type === "presse") return "pressData";
        return null;
    },
    
    getStats: function() {
        return {
            presse: this.pressData.length,
            audio: this.audioVisuelData.length,
            emissions: this.emissionData.length,
            spots: this.spotData.length,
            nocomment: this.nocommentData.length,
            lastUpdated: this.metadata?.lastUpdated || "Jamais"
        };
    }
};

// Exposer globalement
window.ExcellenceMediaData = ExcellenceMediaData;

// Initialisation automatique
console.log("🚀 ExcellenceMediaData chargé");
