.PHONY: up down clean prepare_production backup generate_ssh_key deploy_all_production deploy_backend_production deploy_frontend_production deploy_db_production install_cron uninstall_cron

ENV_FILE := .env
ENV_FILE_PRODUCTION := .env.production
COMPOSE_DEVELOP_FILE := docker-compose.develop.yaml
COMPOSE_PRODUCTION_FILE := docker-compose.production.yaml
REMOTE_DIR := /root/gendocsv3
VM_USER := root
BACKEND_DOCKER_IMAGE := leninner/gendocsv3:latest
FRONTEND_DOCKER_IMAGE := leninner/gendocsv3-frontend:latest
LOCAL_BACKUP_SCRIPT := ./scripts/backup.sh
REMOTE_BACKUP_SCRIPT := $(REMOTE_DIR)/backup.sh
REMOTE_BACKUPS_DIR := /var/gendocsv3/backups
CRON_SCHEDULE := 0 19 * * * # Every day at 19:00 hours

up:
	docker compose -f $(COMPOSE_DEVELOP_FILE) --env-file $(ENV_FILE) up -d
	@make run_migrations

run_migrations:
	npm install
	npm run migration:run

down:
	docker compose -f $(COMPOSE_DEVELOP_FILE) --env-file $(ENV_FILE) down

clean:
	docker system prune -af

prepare_production: $(ENV_FILE_PRODUCTION) $(COMPOSE_PRODUCTION_FILE) Makefile
	@echo "Deploying to production..."
	@make create_remote_directory
	@make copy_files
	@make install_backup_script_cron
	@echo "Prepared successfully!"

create_remote_directory:
	@echo "Validating and creating remote directories ($(REMOTE_DIR) and $(REMOTE_BACKUPS_DIR))..."
	@ssh -i ~/.ssh/id_gendocsv3 $(VM_USER)@$(VM_IP) 'mkdir -p $(REMOTE_DIR) $(REMOTE_BACKUPS_DIR) \
																									 echo "Directories created or already exist."'

copy_files:
	@echo "Copying files..."
	@scp -i ~/.ssh/id_gendocsv3 $(ENV_FILE_PRODUCTION) $(COMPOSE_PRODUCTION_FILE) $(VM_USER)@$(VM_IP):$(REMOTE_DIR)/

deploy_backend_production:
	@echo "Deploying backend to production..."
	@make backup
	@ssh -i ~/.ssh/id_gendocsv3 $(VM_USER)@$(VM_IP) 'cd $(REMOTE_DIR) && \
														if [ $$(docker ps -q -f name=gendocsv3_backend) ] || [ $$(docker ps -q -f name=gendocsv3_bull_redis) ]; then \
															docker compose -f $(COMPOSE_PRODUCTION_FILE) --env-file $(ENV_FILE_PRODUCTION) stop backend bull_redis; \
															docker compose -f $(COMPOSE_PRODUCTION_FILE) --env-file $(ENV_FILE_PRODUCTION) rm -f backend bull_redis; \
														fi && \
														docker rmi ${BACKEND_DOCKER_IMAGE} || true && \
														docker compose -f $(COMPOSE_PRODUCTION_FILE) --env-file $(ENV_FILE_PRODUCTION) up -d backend bull_redis'

deploy_frontend_production: $(ENV_FILE_PRODUCTION) $(COMPOSE_PRODUCTION_FILE) Makefile
	@echo "Deploying frontend to production..."
	@ssh -i ~/.ssh/id_gendocsv3 $(VM_USER)@$(VM_IP) "cd $(REMOTE_DIR) && \
														if [ $$(docker ps -q -f name=gendocsv3_frontend) ]; then \
															docker compose -f $(COMPOSE_PRODUCTION_FILE) --env-file $(ENV_FILE_PRODUCTION) stop frontend; \
															docker compose -f $(COMPOSE_PRODUCTION_FILE) --env-file $(ENV_FILE_PRODUCTION) rm -f frontend; \
															docker rmi ${FRONTEND_DOCKER_IMAGE} | true; \
														fi && \
														docker compose -f $(COMPOSE_PRODUCTION_FILE) --env-file $(ENV_FILE_PRODUCTION) up -d frontend"

deploy_db_production: $(ENV_FILE_PRODUCTION) $(COMPOSE_PRODUCTION_FILE) Makefile
	@echo "Deploying db to production..."
	@ssh -i ~/.ssh/id_gendocsv3 $(VM_USER)@$(VM_IP) "cd $(REMOTE_DIR) && \
														if [ $$(docker ps -q -f name=gendocsv3_postgres) ]; then \
															docker compose -f $(COMPOSE_PRODUCTION_FILE) --env-file $(ENV_FILE_PRODUCTION) down postgres; \
														fi && \
														docker compose -f $(COMPOSE_PRODUCTION_FILE) --env-file $(ENV_FILE_PRODUCTION) down postgres && \
														docker compose -f $(COMPOSE_PRODUCTION_FILE) --env-file $(ENV_FILE_PRODUCTION) up -d postgres"

deploy_all_production: $(ENV_FILE_PRODUCTION) $(COMPOSE_PRODUCTION_FILE) Makefile
	@make prepare_production
	@make deploy_db_production
	@make deploy_backend_production
	@make deploy_frontend_production
	@echo "Deployed successfully!"

backup:
	@echo "Realizando backup previo a la actualización..."
	@ssh $(VM_USER)@$(VM_IP) "$(REMOTE_BACKUP_SCRIPT)"

generate_ssh_key:
	ssh-keygen -t rsa -b 2048 -C "gendocsv3" -f ~/.ssh/id_gendocsv3 -N "" || true
	scp -i ~/.ssh/id_gendocsv3 ~/.ssh/id_gendocsv3.pub ${VM_USER}@$(VM_IP):~/.ssh/authorized_keys

install_backup_script_cron:
	@make uninstall_crons
	@echo "Instalando el script de backup en el cronjob..."
	scp $(LOCAL_BACKUP_SCRIPT) $(VM_USER)@$(VM_IP):$(REMOTE_DIR)/
	ssh $(VM_USER)@$(VM_IP) "crontab -l | { cat; echo '$(CRON_SCHEDULE) $(REMOTE_BACKUP_SCRIPT)'; } | crontab -"
	@echo "Cronjob instalado correctamente."

uninstall_crons:
	@echo "Desinstalando los cronjobs..."
	@ssh $(VM_USER)@$(VM_IP) "crontab -l | grep -v $(REMOTE_BACKUP_SCRIPT) | crontab -"
	@echo "Cronjobs desinstalados correctamente."