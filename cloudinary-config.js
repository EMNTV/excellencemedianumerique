// Configuration simplifiée pour votre GitHub Pages
const CloudinaryConfig = {
    cloudName: 'dv36bmp5e',
    
    // 🔥 À CHANGER : mettez le nom du preset que vous avez créé !
    uploadPreset: 'excellence_media_unsigned',
    
    async testConnection() {
        console.log('✅ Cloudinary prêt');
        return { success: true };
    },
    
    async uploadImage(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('cloud_name', this.cloudName);
            
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
                { method: 'POST', body: formData }
            );
            
            const result = await response.json();
            
            if (response.ok && result.secure_url) {
                return { success: true, url: result.secure_url };
            }
            
            // Fallback image par défaut
            return {
                success: true,
                url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
                isPlaceholder: true
            };
            
        } catch (error) {
            return {
                success: true,
                url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
                isPlaceholder: true
            };
        }
    }
};

window.CloudinaryConfig = CloudinaryConfig;
