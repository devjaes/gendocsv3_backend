// scripts/memory-monitor.js

const gcStats = require('gc-stats')();

// Mantenemos un historial de las últimas estadísticas del GC
// para poder detectar patrones problemáticos
const gcHistory = {
    lastGCs: [],
    maxEntries: 10,
    addEntry(stats) {
        this.lastGCs.push({
            timestamp: Date.now(),
            duration: stats.pause,
            memoryFreed: stats.diff.usedHeapSize,
            type: stats.gctype
        });

        if (this.lastGCs.length > this.maxEntries) {
            this.lastGCs.shift();
        }
    },
    getAverageEfficiency() {
        if (this.lastGCs.length === 0) return 1;
        
        // Calculamos la eficiencia promedio de las últimas recolecciones
        // basándonos en la memoria liberada por milisegundo de pausa
        return this.lastGCs.reduce((sum, gc) => {
            return sum + (gc.memoryFreed / gc.duration);
        }, 0) / this.lastGCs.length;
    }
};

// Escuchamos los eventos del garbage collector para tomar decisiones informadas
gcStats.on('stats', (stats) => {
    gcHistory.addEntry(stats);
    
    // Analizamos si el GC está siendo efectivo
    const efficiency = gcHistory.getAverageEfficiency();
    const pauseMS = stats.pause;
    
    console.log('Estadísticas del GC:', {
        tipo: stats.gctype,
        duracionPausa: `${pauseMS}ms`,
        memoriaLiberada: `${Math.round(stats.diff.usedHeapSize / 1024 / 1024)}MB`,
        eficiencia: `${Math.round(efficiency * 100) / 100} MB/ms`
    });

    // Si detectamos que el GC está siendo ineficiente, iniciamos limpieza adicional
    if (pauseMS > 100 && efficiency < 0.5) {
        performSoftCleanup().catch(console.error);
    }
});

// Función mejorada para limpieza suave que considera las estadísticas del GC
async function performSoftCleanup() {
    try {
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Solo forzamos GC si las últimas recolecciones han sido eficientes
        if (global.gc && gcHistory.getAverageEfficiency() > 0.1) {
            console.log('Iniciando limpieza de memoria...');
            global.gc(true);
        }

        const app = global.nestApp;
        if (app) {
            // Limpiamos recursos en orden de menor a mayor impacto
            
            // 1. Primero, caches no críticos
            const cacheManager = app.get('CACHE_MANAGER');
            if (cacheManager) {
                const cacheKeys = await cacheManager.store.keys();
                // Solo limpiamos caches antiguos
                const oldKeys = cacheKeys.filter(async key => {
                    const ttl = await cacheManager.store.ttl(key);
                    return ttl && ttl < 300; // Menos de 5 minutos de TTL restante
                });
                
                for (const key of oldKeys) {
                    await cacheManager.del(key);
                }
            }

            // 2. Luego, conexiones inactivas a la base de datos
            const connection = app.get('DATABASE_CONNECTION');
            if (connection) {
                const result = await connection.query(`
                    SELECT COUNT(*) 
                    FROM pg_stat_activity 
                    WHERE datname = current_database()
                    AND state in ('idle', 'idle in transaction')
                    AND state_change < NOW() - INTERVAL '15 minutes'
                `);
                
                if (result[0].count > 5) { // Si hay más de 5 conexiones inactivas
                    await connection.query(`
                        SELECT pg_terminate_backend(pid) 
                        FROM pg_stat_activity 
                        WHERE datname = current_database()
                        AND pid <> pg_backend_pid()
                        AND state in ('idle', 'idle in transaction')
                        AND state_change < NOW() - INTERVAL '15 minutes'
                    `);
                }
            }
        }

        // Verificamos la efectividad de la limpieza
        const finalMemory = process.memoryUsage().heapUsed;
        const freedMemory = initialMemory - finalMemory;
        
        console.log('Resultado de limpieza:', {
            memoriaInicial: `${Math.round(initialMemory / 1024 / 1024)}MB`,
            memoriaFinal: `${Math.round(finalMemory / 1024 / 1024)}MB`,
            memoriaLiberada: `${Math.round(freedMemory / 1024 / 1024)}MB`
        });

    } catch (error) {
        console.error('Error durante la limpieza suave:', error);
    }
}

// Monitoreo periódico mejorado que considera las estadísticas del GC
setInterval(async () => {
    const used = process.memoryUsage();
    const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100;
    
    // Incluimos la eficiencia del GC en nuestras decisiones
    const gcEfficiency = gcHistory.getAverageEfficiency();
    
    if (heapUsedPercent > 85 || gcEfficiency < 0.1) {
        console.warn('Estado de memoria crítico:', {
            usoHeap: `${Math.round(heapUsedPercent)}%`,
            eficienciaGC: `${Math.round(gcEfficiency * 100) / 100} MB/ms`,
            memoriaUsada: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
            memoriaTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
            timestamp: new Date().toISOString()
        });

        await performSoftCleanup();
    }
}, 60000);