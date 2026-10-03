#!/usr/bin/env python3
"""Serve the bundled game on localhost; no downloads or external dependencies."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import webbrowser

parser = argparse.ArgumentParser(description='Gioca a Claude Island in locale')
parser.add_argument('--port', type=int, default=5179)
parser.add_argument('--no-browser', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parent / 'dist'
try:
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(SimpleHTTPRequestHandler, directory=str(root)))
except OSError as error:
    raise SystemExit(f'Porta {args.port} occupata. Prova: python3 play.py --port 5180\n{error}')
url = f'http://127.0.0.1:{args.port}/'
print(f'Claude Island: {url}\nPremi Ctrl+C per fermare il server.', flush=True)
if not args.no_browser:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    server.server_close()
