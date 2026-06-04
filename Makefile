.PHONY: rebuild-ai
rebuild-ai:
	docker-compose up -d --build ai-service
	@echo "ai-service rebuilt from current source"
	docker logs --tail 30 warranty-ai-service

.PHONY: rebuild-all
rebuild-all:
	docker-compose up -d --build ai-service backend frontend
	@echo "all app containers rebuilt"
