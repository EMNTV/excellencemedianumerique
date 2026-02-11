// cloudinary-db.js - STOCKAGE CLOUDINARY PARTAGÉ ✅
const CloudinaryDB = {
    cloudName: 'dv36bmp5e',
    uploadPreset: 'excellence_media',
    storageKey: 'excellence_media_data',
    
    async saveData(data) {
        console.log('☁️ Sauvegarde CLOUDINARY...');
        
        try {
            // 1. Convertir en JSON
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const file = new File([blob], 'data.json', { type: 'application/json' });
            
            // 2. Upload VERS CLOUDINARY (pas localStorage)
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('cloud_name', this.cloudName);
            formData.append('public_id', this.storageKey);
            formData.append('folder', 'excellence_data');
            
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${this.cloudName}/raw/upload`,
                { method: 'POST', body: formData }
            );
            
            const result = await response.json();
            
            if (response.ok && result.secure_url) {
                console.log('✅ SAUVEGARDE CLOUDINARY RÉUSSIE !');
                console.log('🌍 URL publique:', result.secure_url);
                
                // 🔥 TOUT LE MONDE pourra voir ces données
                return { 
                    success: true, 
                    cloudinary: true,
                    url: result.secure_url 
                };
            }
            
            throw new Error(result.error?.message || 'Erreur upload');
            
        } catch (error) {
            console.error('❌ Erreur Cloudinary:', error);
            
            // Fallback LOCAL (seulement pour vous)
            localStorage.setItem('local_backup', JSON.stringify(data));
            return { 
                success: false, 
                cloudinary: false, 
                local: true,
                error: error.message 
            };
        }
    },
    
    async loadData() {
        console.log('☁️ Chargement DEPUIS CLOUDINARY...');
        
        try {
            // 1. TOUJOURS charger depuis Cloudinary d'abord
            const url = `https://res.cloudinary.com/${this.cloudName}/raw/upload/v1/excellence_data/${this.storageKey}.json`;
            
            console.log('📡 Tentative chargement:', url);
            const response = await fetch(url + '?t=' + Date.now());
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ CHARGEMENT CLOUDINARY RÉUSSI !');
                console.log('📊 Données:', Object.keys(data));
                
                // Cache local (optionnel)
                localStorage.setItem('cloudinary_cache', JSON.stringify(data));
                
                return { 
                    success: true, 
                    data, 
                    source: 'cloudinary' 
                };
            }
            
            // 2. FALLBACK : cache local (vos anciennes données)
            const cache = localStorage.getItem('cloudinary_cache');
            if (cache) {
                console.log('⚠️ Utilisation du cache local');
                return { 
                    success: true, 
                    data: JSON.parse(cache), 
                    source: 'cache' 
                };
            }
            
            // 3. PREMIÈRE UTILISATION : données vierges
            console.log('📁 Première utilisation - création données');
            const defaultData = {
                pressData: [],
                audioVisuelData: [],
                emissionData: [],
                spotData: [],
                nocommentData: [],
                settings: { videosPerPage: 3 },
                metadata: {
                    created: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                }
            };
            
            // Sauvegarder immédiatement sur Cloudinary
            await this.saveData(defaultData);
            
            return { 
                success: true, 
                data: defaultData, 
                source: 'default' 
            };
            
        } catch (error) {
            console.error('❌ Erreur chargement:', error);
            
            // DERNIER FALLBACK
            const cache = localStorage.getItem('cloudinary_cache');
            if (cache) {
                return { 
                    success: true, 
                    data: JSON.parse(cache), 
                    source: 'cache_fallback' 
                };
            }
            
            return { 
                success: true, 
                data: {
                    pressData: [], audioVisuelData: [], emissionData: [],
                    spotData: [], nocommentData: [], metadata: {}
                }, 
                source: 'emergency' 
            };
        }
    }
};

window.CloudinaryDB = CloudinaryDB;
