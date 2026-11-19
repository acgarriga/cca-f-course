# Atajos para la web de estudio CCAR-F. Ejecutar desde la raíz del repositorio.
# `make` sin argumentos muestra la ayuda.

.DEFAULT_GOAL := help
.PHONY: help install build validate check open clean rebuild extract-exam1

SITE := site

help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  make %-14s %s\n", $$1, $$2}'

node_modules: package.json package-lock.json
	npm install
	@touch node_modules

install: node_modules ## Instala las dependencias (npm install)

build: node_modules ## Genera la web en site/ y comprueba los enlaces internos
	npm run build

validate: ## Valida el banco de preguntas (questions/bank.json)
	npm run validate

check: validate build ## Valida el banco y genera la web

open: build ## Genera la web y abre site/index.html en el navegador
	@if command -v xdg-open >/dev/null 2>&1; then xdg-open $(SITE)/index.html; \
	elif command -v open >/dev/null 2>&1; then open $(SITE)/index.html; \
	else echo "Abre $(SITE)/index.html en el navegador."; fi

clean: ## Borra la web generada (site/)
	rm -rf ./$(SITE)

rebuild: clean build ## Borra site/ y vuelve a generarlo

extract-exam1: ## Extrae las 77 preguntas de exams/examen 1.html (no sobrescribe el banco)
	npm run extract:exam1
