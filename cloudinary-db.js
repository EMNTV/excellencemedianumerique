// Stockage local uniquement - 100% fiable sur GitHub
const CloudinaryDB = {
    storageKey: 'excellence_media_data',
    
    async saveData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            localStorage.setItem('last_saved', new Date().toISOString());
            console.log('💾 Données sauvegardées localement');
            return { success: true, local: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async loadData() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                console.log('📥 Données chargées localement');
                return { success: true, data, source: 'local' };
            }
        } catch (error) {}
        
        // Données par défaut
        const defaultData = {
            pressData: [],
            audioVisuelData: [],
            emissionData: [],
            spotData: [],
            nocommentData: [],
            metadata: { lastUpdated: new Date().toISOString() }
        };
        
        return { success: true, data: defaultData, source: 'default' };
    },
    
    async syncData() {
        return this.loadData();
    }
};

window.CloudinaryDB = CloudinaryDB;
