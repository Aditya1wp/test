from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','application/json')
        self.end_headers()
        
        # Absolute Minimalist Signal
        message = {
            "status": "alive",
            "msg": "TOTAL RESET OK: Highway is finally open!",
            "runtime": "Python 3.9 (Traditional Handler)"
        }
        
        self.wfile.write(json.dumps(message).encode('utf-8'))
        return
