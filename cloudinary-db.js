// cloudinary-db.js - Stockage des données avec fallback local
const CloudinaryDB = {
    cloudName: 'dv36bmp5e',
    apiKey: '691489143536825',
    dataFileName: 'excellence-media-data.json',
    storageKey: 'excellence_media_data',
    
    // Sauvegarder les données
    async saveData(data) {
        console.log('💾 Sauvegarde des données...');
        
        try {
            // Essayer de sauvegarder sur Cloudinary si le preset existe
            if (window.CloudinaryConfig?.workingPreset) {
                const jsonString = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const file = new File([blob], this.dataFileName, { type: 'application/json' });
                
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', window.CloudinaryConfig.workingPreset);
                formData.append('cloud_name', this.cloudName);
                formData.append('public_id', this.storageKey);
                
                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${this.cloudName}/raw/upload`,
                    { method: 'POST', body: formData }
                );
                
                const result = await response.json();
                
                if (response.ok && result.secure_url) {
                    console.log('✅ Données sauvegardées sur Cloudinary');
                    localStorage.setItem('cloudinary_data_url', result.secure_url);
                    localStorage.setItem('cloudinary_data_version', Date.now().toString());
                    localStorage.setItem(this.storageKey, jsonString); // Cache local
                    
                    return { success: true, url: result.secure_url, cloudinary: true };
                }
            }
            
            // Fallback: sauvegarde locale uniquement
            console.log('💾 Sauvegarde locale uniquement');
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            localStorage.setItem('local_data_version', Date.now().toString());
            
            return { success: true, cloudinary: false, local: true };
            
        } catch (error) {
            console.error('❌ Erreur sauvegarde:', error);
            
            // Dernier recours: sauvegarde locale
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(data));
                return { success: true, cloudinary: false, local: true, error: error.message };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    },
    
    // Charger les données
    async loadData() {
        console.log('📥 Chargement des données...');
        
        try {
            // 1. Essayer de charger depuis Cloudinary
            if (window.CloudinaryConfig?.workingPreset) {
                try {
                    const url = `https://res.cloudinary.com/${this.cloudName}/raw/upload/${this.storageKey}.json`;
                    const response = await fetch(url + '?t=' + Date.now());
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Données chargées depuis Cloudinary');
                        
                        // Mettre en cache
                        localStorage.setItem(this.storageKey, JSON.stringify(data));
                        
                        return { success: true, data, source: 'cloudinary' };
                    }
                } catch (error) {
                    console.log('ℹ️ Données non trouvées sur Cloudinary');
                }
            }
            
            // 2. Essayer le cache local
            const cachedData = localStorage.getItem(this.storageKey);
            if (cachedData) {
                try {
                    const data = JSON.parse(cachedData);
                    console.log('✅ Données chargées depuis le cache local');
                    return { success: true, data, source: 'cache' };
                } catch (e) {
                    // Ignorer
                }
            }
            
            // 3. Données par défaut
            console.log('📦 Création des données par défaut');
            const defaultData = this.getDefaultData();
            
            // Sauvegarder les données par défaut localement
            localStorage.setItem(this.storageKey, JSON.stringify(defaultData));
            
            return { success: true, data: defaultData, source: 'default' };
            
        } catch (error) {
            console.error('❌ Erreur chargement:', error);
            const defaultData = this.getDefaultData();
            return { success: true, data: defaultData, source: 'default', error: error.message };
        }
    },
    
    // Données par défaut
    getDefaultData() {
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
                version: '1.0'
            }
        };
    },
    
    // Synchroniser
    async syncData() {
        return await this.loadData();
    },
    
    // Effacer les données
    async clearData() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem('cloudinary_data_url');
        localStorage.removeItem('cloudinary_data_version');
        localStorage.removeItem('local_data_version');
        return { success: true };
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.CloudinaryDB = CloudinaryDB;
});