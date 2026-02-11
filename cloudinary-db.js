// cloudinary-db.js - STOCKAGE CLOUDINARY MULTI-NAVIGATEURS ✅
const CloudinaryDB = {
    cloudName: 'dv36bmp5e',
    uploadPreset: 'excellence_media', // Votre preset
    storageKey: 'excellence_media_data',
    
    async saveData(data) {
        console.log('☁️ Sauvegarde sur Cloudinary...');
        
        try {
            // 1. Convertir en JSON
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const file = new File([blob], 'data.json', { type: 'application/json' });
            
            // 2. Upload vers Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('cloud_name', this.cloudName);
            formData.append('public_id', this.storageKey);
            
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${this.cloudName}/raw/upload`,
                { method: 'POST', body: formData }
            );
            
            const result = await response.json();
            
            if (response.ok && result.secure_url) {
                console.log('✅ Sauvegardé sur Cloudinary:', result.secure_url);
                
                // Sauvegarde locale en CACHE seulement
                localStorage.setItem('cloudinary_cache', jsonString);
                localStorage.setItem('cloudinary_url', result.secure_url);
                
                return { success: true, cloudinary: true };
            }
            
            throw new Error(result.error?.message || 'Erreur upload');
            
        } catch (error) {
            console.error('❌ Erreur Cloudinary:', error);
            
            // FALLBACK : sauvegarde locale seulement
            localStorage.setItem('cloudinary_cache', JSON.stringify(data));
            return { success: true, cloudinary: false, local: true };
        }
    },
    
    async loadData() {
        console.log('☁️ Chargement depuis Cloudinary...');
        
        try {
            // 1. ESSAYER DE CHARGER DEPUIS CLOUDINARY
            const url = `https://res.cloudinary.com/${this.cloudName}/raw/upload/v1/${this.storageKey}.json`;
            const response = await fetch(url + '?t=' + Date.now());
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Chargé depuis Cloudinary');
                
                // Mettre en cache
                localStorage.setItem('cloudinary_cache', JSON.stringify(data));
                
                return { success: true, data, source: 'cloudinary' };
            }
            
            // 2. FALLBACK : cache local
            const cache = localStorage.getItem('cloudinary_cache');
            if (cache) {
                console.log('📦 Chargé depuis cache local');
                return { 
                    success: true, 
                    data: JSON.parse(cache), 
                    source: 'cache' 
                };
            }
            
            // 3. DONNÉES PAR DÉFAUT
            console.log('📁 Création données par défaut');
            const defaultData = {
                pressData: [],
                audioVisuelData: [],
                emissionData: [],
                spotData: [],
                nocommentData: [],
                metadata: { lastUpdated: new Date().toISOString() }
            };
            
            return { success: true, data: defaultData, source: 'default' };
            
        } catch (error) {
            console.error('❌ Erreur chargement:', error);
            
            // Dernier fallback
            const cache = localStorage.getItem('cloudinary_cache');
            if (cache) {
                return { success: true, data: JSON.parse(cache), source: 'cache' };
            }
            
            return { 
                success: true, 
                data: {
                    pressData: [],
                    audioVisuelData: [],
                    emissionData: [],
                    spotData: [],
                    nocommentData: [],
                    metadata: { lastUpdated: new Date().toISOString() }
                }, 
                source: 'default' 
            };
        }
    },
    
    async syncData() {
        return this.loadData();
    }
};

window.CloudinaryDB = CloudinaryDB;
