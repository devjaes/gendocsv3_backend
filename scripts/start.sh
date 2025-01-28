#!/bin/sh

# Configuramos las opciones de memoria directamente en el comando node
# en lugar de usar NODE_OPTIONS
node --max-old-space-size=3072 \
     --require ./scripts/memory-monitor.js \
     dist/main.js &

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

# Monitoreo continuo en segundo plano
while true; do
    sleep 30000 # Verificamos cada 5 minutos
    
    if [ -f /var/run/app.pid ]; then
        pid=$(cat /var/run/app.pid)
        memory_usage=$(ps -o rss= -p $pid)
        
        if [ "$memory_usage" -gt 2621440 ]; then # 2.5GB en KB
            echo "Nivel 1: Uso de memoria elevado: $((memory_usage/1024))MB - Iniciando limpieza suave"
            kill -SIGUSR2 $pid
        elif [ "$memory_usage" -gt 2935000 ]; then # 2.8GB en KB
            echo "Nivel 2: Uso de memoria alto: $((memory_usage/1024))MB - Iniciando limpieza agresiva"
            kill -SIGUSR1 $pid
        fi
    fi
done &

# Esperamos al proceso principal
wait $(cat /var/run/app.pid)