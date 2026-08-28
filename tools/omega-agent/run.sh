#!/bin/bash
set -e

echo "============================================"
echo "  OMEGA AGENT — Multi-Provider"
echo "============================================"

if [ ! -f .env ]; then
    echo "[ERROR] .env file not found!"
    exit 1
fi

export $(grep -v '^#' .env | xargs)

read -p "Enter task: " TASK
python3 core/multi_agent.py "$TASK"
