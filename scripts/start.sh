#!/bin/sh

# Configuramos variables de entorno para optimizar el uso de memoria en Node.js
# Establecemos un límite conservador pero que permita cierta flexibilidad
export NODE_OPTIONS="--max-old-space-size=3072 --expose-gc"

# Configuración de TypeORM para gestionar mejor las conexiones
# Establecemos límites pero permitiendo un buffer para picos de demanda
export TYPEORM_DRIVER_EXTRA='{"connectionLimit": 20, "queueLimit": 0, "waitForConnections": true}'

# Iniciamos la aplicación con el monitor de memoria
node --require ./scripts/memory-monitor.js dist/main.js &

# Guardamos el PID para monitoreo
echo $! > /var/run/app.pid

# Esperamos a que la aplicación esté lista
timeout=300
counter=0
while ! nc -z localhost 3001; do
    sleep 1
    counter=$((counter + 1))
    if [ $counter -ge $timeout ]; then
        echo "Error: La aplicación no inició después de ${timeout} segundos"
        exit 1
    fi
done

# Ejecutamos las migraciones
timeout 300 npm run migration:run
migration_status=$?

if [ $migration_status -ne 0 ]; then
    echo "Error: Las migraciones fallaron o excedieron el timeout"
    exit 1
fi

# Iniciamos el monitoreo en segundo plano
while true; do
    pid=$(cat /var/run/app.pid)
    memory_usage=$(ps -o rss= -p $pid)
    
    # Implementamos una estrategia gradual basada en umbrales
    if [ "$memory_usage" -gt 2621440 ]; then # 2.5GB en KB
        echo "Nivel 1: Uso de memoria elevado: $((memory_usage/1024))MB - Iniciando limpieza suave"
        # Enviamos SIGUSR2 para iniciar limpieza suave
        kill -SIGUSR2 $pid
        
    elif [ "$memory_usage" -gt 2935000 ]; then # 2.8GB en KB
        echo "Nivel 2: Uso de memoria alto: $((memory_usage/1024))MB - Iniciando limpieza agresiva"
        # Enviamos SIGUSR1 para generar diagnóstico y limpieza más agresiva
        kill -SIGUSR1 $pid
    fi
    
    sleep 300 # Verificamos cada 5 minutos
done &

# Esperamos al proceso principal
wait $(cat /var/run/app.pid)