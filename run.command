#!/bin/bash
# Chess Thieves - double-click this file to play.
# It starts a small local web server (needed for the game's ES modules)
# and opens the game in your default browser.

# Move into the project folder, relative to this script's location.
cd "$(dirname "$0")" || {
    echo "Could not find the project folder."
    read -r -p "Press Enter to close."
    exit 1
}

# Pick a free port starting at 8000.
PORT=8000
while lsof -i :"$PORT" >/dev/null 2>&1; do
    PORT=$((PORT + 1))
done

URL="http://localhost:$PORT/web-app/"
echo "============================================"
echo "  Chess Thieves is running at:"
echo "    $URL"
echo ""
echo "  Keep this window open while you play."
echo "  Press Ctrl+C (or close this window) to stop."
echo "============================================"

# Open the browser once the server has had a moment to start.
( sleep 1; open "$URL" ) &

# Serve the folder. Prefer python3, then python, then Node's http-server.
if command -v python3 >/dev/null 2>&1; then
    python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
    python -m SimpleHTTPServer "$PORT"
elif command -v npx >/dev/null 2>&1; then
    npx --yes http-server -p "$PORT"
else
    echo "No python3, python, or npx found. Please install one to run a local server."
    read -r -p "Press Enter to close."
    exit 1
fi
