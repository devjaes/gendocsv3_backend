# Proceso de backups

La configuración relacionada a los backups se encuentran en el archivo `scripts/backup.sh` y dentro de `Makefile`.
En el siguiente apartado se detalla el proceso de backups.

## Configuración (backup.sh)

El directorio en donde se guardan los backups se encuentra en la variable `BACKUP_DIR`. Por defecto, se guarda en la ruta `/var/gendocsv3/backups`.

En este directorio se guarda también un archivo `backup.log` con información sobre los backups realizados.

## Configuración (Makefile)

Al momento de hacer deploy de una nueva versión de la aplicación backend, se realiza un backup de la base de datos. Para ello, se utiliza el comando `make backup`.

Se puede entender mejor el proceso de backups en el archivo `Makefile` en la sección `deploy_backend_production`.

## Proceso de backups

1. Crear el archivo de backup con el comando `pg_dump`:

```bash
docker exec gendo_csv_postgres pg_dump -U $PGUSER -h localhost $PGDATABASE > "$BACKUP_DIR/$PGDATABASE.sql" || error_exit "Failed to dump database"
```

2. Se crea un tarball con el archivo de backup:

```bash
tar -czf "$BACKUP_DIR/$PGDATABASE.tar.gz" "$BACKUP_DIR/$PGDATABASE.sql" || error_exit "Failed to compress backup"
```

3. Se elimina el archivo `.sql`:

```bash
rm -f "$BACKUP_DIR/$PGDATABASE.sql" || error_exit "Failed to remove .sql file"
```

4. Se guarda la información del backup en el archivo `backup.log`:

```bash
echo "$(date) - Backup created" >> "$BACKUP_DIR/backup.log"
```
