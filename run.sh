#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Starting LLM-RAB-RKS ==="

# Check .env
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    echo "Error: backend/.env not found. Run deploy.sh first."
    exit 1
fi

if grep -q "your_key_here" "$SCRIPT_DIR/backend/.env"; then
    echo "Warning: GEMINI_API_KEY not set in backend/.env"
fi

# Start backend
echo "Starting backend on http://localhost:8000..."
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
python main.py &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend on http://localhost:5173..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=== Running ==="
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop"

# Wait for either process
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait