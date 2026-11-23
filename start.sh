#!/usr/bin/env bash
set -euo pipefail

# Local development helper for Orbit Market (macOS & Linux compatible)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

detect_local_ip() {
    if command -v ipconfig >/dev/null 2>&1; then
        local mac_ip
        mac_ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
        if [ -n "$mac_ip" ]; then
            echo "$mac_ip"
            return
        fi
    fi
    if hostname -I >/dev/null 2>&1; then
        hostname -I | awk '{print $1}'
        return
    fi
    echo "127.0.0.1"
}

LOCAL_IP=$(detect_local_ip)
API_URL="http://127.0.0.1:8000"
HEALTH_ENDPOINT="/health"
backend_pid=""

cleanup_existing_processes() {
    echo -e "${YELLOW}Nettoyage des processus locaux existants...${NC}"

    local backend_pids
    backend_pids=$(lsof -ti:8000 2>/dev/null || true)
    if [ -n "$backend_pids" ]; then
        echo -e "${YELLOW}Arret des processus backend existants: $backend_pids${NC}"
        kill $backend_pids 2>/dev/null || true
        sleep 1
    fi

    local uvicorn_pids
    uvicorn_pids=$(pgrep -f "uvicorn.*backend.main" 2>/dev/null || true)
    if [ -n "$uvicorn_pids" ]; then
        echo -e "${YELLOW}Arret des processus uvicorn existants: $uvicorn_pids${NC}"
        kill $uvicorn_pids 2>/dev/null || true
        sleep 1
    fi
}

cleanup_on_exit() {
    echo -e "\n${YELLOW}Arret en cours...${NC}"
    if [ -n "$backend_pid" ]; then
        kill "$backend_pid" 2>/dev/null || true
    fi
    cleanup_existing_processes
    exit 0
}

trap cleanup_on_exit SIGINT SIGTERM

check_backend() {
    echo -e "${YELLOW}Verification du backend (${API_URL}${HEALTH_ENDPOINT})...${NC}"
    local max_attempts=30
    local attempt=1

    while [ "$attempt" -le "$max_attempts" ]; do
        if curl -sf "${API_URL}${HEALTH_ENDPOINT}" >/dev/null 2>&1; then
            echo -e "${GREEN}Backend disponible !${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    echo -e "${RED}Backend inaccessible apres ${max_attempts} tentatives.${NC}"
    return 1
}

test_xur_api() {
    echo -e "${BLUE}Statut du manifest:${NC}"
    curl -s "${API_URL}/manifest/status" | python3 -m json.tool 2>/dev/null || true

    echo -e "${BLUE}Test de /xur/debug:${NC}"
    local status
    status=$(curl -s -o /tmp/orbit_xur_debug.json -w "%{http_code}" "${API_URL}/xur/debug")
    if [ "$status" = "200" ]; then
        echo -e "${GREEN}API Xur OK (HTTP 200)${NC}"
        head -n 20 /tmp/orbit_xur_debug.json
    else
        echo -e "${RED}API Xur erreur (HTTP ${status})${NC}"
        cat /tmp/orbit_xur_debug.json
        rm -f /tmp/orbit_xur_debug.json
        return 1
    fi
    rm -f /tmp/orbit_xur_debug.json
}

require_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo -e "${RED}Commande requise manquante: $1${NC}"
        exit 1
    fi
}

require_cmd python3
require_cmd node
require_cmd curl

echo -e "${BLUE}IP locale: ${LOCAL_IP} | Backend: ${API_URL}${NC}"

case "${1:-help}" in
    "backend")
        cleanup_existing_processes
        chmod +x start_local_server.sh
        ./start_local_server.sh
        ;;
    "frontend")
        npm start
        ;;
    "test")
        check_backend
        test_xur_api
        ;;
    "update-manifest")
        check_backend
        if [ -z "${MANIFEST_ADMIN_TOKEN:-}" ]; then
            echo -e "${RED}Definissez MANIFEST_ADMIN_TOKEN pour appeler POST /manifest/update.${NC}"
            exit 1
        fi
        curl -sf -X POST -H "X-Admin-Token: ${MANIFEST_ADMIN_TOKEN}" "${API_URL}/manifest/update" | python3 -m json.tool
        ;;
    "full")
        cleanup_existing_processes
        chmod +x start_local_server.sh
        ./start_local_server.sh &
        backend_pid=$!

        if check_backend; then
            npm start
        else
            kill "$backend_pid" 2>/dev/null || true
            exit 1
        fi
        ;;
    "help"|*)
        echo -e "${BLUE}Utilisation:${NC}"
        echo "  $0 backend         - Demarre le backend local (uvicorn --reload)"
        echo "  $0 frontend        - Demarre le frontend Expo"
        echo "  $0 test            - Teste la connexion API locale"
        echo "  $0 update-manifest - Declenche POST /manifest/update (requiert MANIFEST_ADMIN_TOKEN)"
        echo "  $0 full            - Demarre backend local + frontend Expo"
        echo "  $0 help            - Affiche cette aide (defaut)"
        ;;
esac
