// cloudinary-config.js - Configuration Cloudinary avec détection automatique du preset
const CloudinaryConfig = {
    cloudName: 'dv36bmp5e',
    apiKey: '691489143536825',
    
    // Liste des presets à essayer
    uploadPresets: [
        'ml_default',
        'unsigned_upload',
        'excellence_media',
        'excellence-media',
        'default',
        'media_default',
        'unsigned'
    ],
    
    // Test de connexion et détection du preset valide
    async testConnection() {
        console.log('🧪 Test de connexion Cloudinary...');
        
        // Tester d'abord l'accès à Cloudinary
        try {
            const testUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload/sample.jpg`;
            const response = await fetch(testUrl, { method: 'HEAD' });
            
            if (!response.ok) {
                return { 
                    success: false, 
                    message: 'Cloudinary non accessible',
                    details: `Status: ${response.status}`
                };
            }
        } catch (error) {
            return { 
                success: false, 
                message: 'Cloudinary non accessible',
                details: error.message 
            };
        }
        
        // Détecter le bon preset
        console.log('🔍 Détection du preset d\'upload...');
        const workingPreset = await this.detectWorkingPreset();
        
        if (workingPreset) {
            console.log(`✅ Preset détecté: ${workingPreset}`);
            this.workingPreset = workingPreset;
            return { 
                success: true, 
                message: 'Cloudinary accessible',
                preset: workingPreset 
            };
        } else {
            console.warn('⚠️ Aucun preset unsigned trouvé. Utilisation d\'images par défaut.');
            return { 
                success: true, 
                message: 'Cloudinary accessible mais upload unsigned désactivé',
                preset: null 
            };
        }
    },
    
    // Détecter quel preset fonctionne
    async detectWorkingPreset() {
        // Créer un petit fichier test
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        
        for (const preset of this.uploadPresets) {
            try {
                console.log(`🔄 Test du preset: ${preset}`);
                
                const formData = new FormData();
                formData.append('file', testFile);
                formData.append('upload_preset', preset);
                formData.append('cloud_name', this.cloudName);
                
                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${this.cloudName}/raw/upload`,
                    { method: 'POST', body: formData }
                );
                
                if (response.ok) {
                    console.log(`✅ Preset fonctionnel: ${preset}`);
                    return preset;
                }
            } catch (error) {
                // Ignorer les erreurs
            }
        }
        
        return null;
    },
    
    // Upload d'image avec fallback
    async uploadImage(file) {
        console.log('📤 Upload image vers Cloudinary...', file.name);
        
        try {
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('Le fichier est trop volumineux (max 10MB)');
            }
            
            if (!file.type.match('image.*')) {
                throw new Error('Le fichier doit être une image');
            }
            
            // Si nous avons un preset fonctionnel, l'utiliser
            if (this.workingPreset) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', this.workingPreset);
                formData.append('cloud_name', this.cloudName);
                
                const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
                const response = await fetch(uploadUrl, { method: 'POST', body: formData });
                const result = await response.json();
                
                if (response.ok && result.secure_url) {
                    console.log('✅ Upload réussi:', result.secure_url);
                    return {
                        success: true,
                        url: result.secure_url,
                        publicId: result.public_id
                    };
                }
            }
            
            // Fallback: utiliser des images placeholder gratuites
            console.log('⚠️ Upload Cloudinary échoué, utilisation d\'image placeholder');
            
            // Images placeholder gratuites et fiables
            const placeholders = [
                'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
                'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80',
                'https://images.unsplash.com/photo-1505238680356-667803448bb6?w=800&q=80',
                'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80',
                'https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=800&q=80'
            ];
            
            const randomIndex = Math.floor(Math.random() * placeholders.length);
            
            return {
                success: true,
                url: placeholders[randomIndex],
                isPlaceholder: true,
                message: 'Image placeholder utilisée (Cloudinary non configuré)'
            };
            
        } catch (error) {
            console.error('❌ Erreur upload:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },
    
    // Upload depuis URL avec fallback
    async uploadFromUrl(imageUrl) {
        try {
            if (imageUrl.includes('cloudinary.com') || imageUrl.includes('unsplash.com')) {
                return { success: true, url: imageUrl };
            }
            
            // Si nous avons un preset fonctionnel
            if (this.workingPreset) {
                const formData = new FormData();
                formData.append('file', imageUrl);
                formData.append('upload_preset', this.workingPreset);
                formData.append('cloud_name', this.cloudName);
                
                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
                    { method: 'POST', body: formData }
                );
                
                const result = await response.json();
                
                if (response.ok && result.secure_url) {
                    return { success: true, url: result.secure_url };
                }
            }
            
            // Fallback: retourner l'URL originale
            return { success: true, url: imageUrl };
            
        } catch (error) {
            console.error('❌ Erreur upload URL:', error);
            return { success: false, url: imageUrl };
        }
    }
};

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation Cloudinary...');
    
    // Tester la connexion et détecter le preset
    const testResult = await CloudinaryConfig.testConnection();
    console.log('📊 Résultat test:', testResult);
    
    // Exposer pour le débogage
    window.CloudinaryConfig = CloudinaryConfig;
});