#!/usr/bin/env python3
"""
Tactical Terminal - Replit Startup Script
"""

import subprocess
import sys
import os

def run_command(cmd, cwd=None):
    """Run a command and handle errors"""
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f"Command failed with code {result.returncode}")
        return False
    return True

def main():
    print("=" * 60)
    print("Tactical Terminal - Starting on Replit")
    print("=" * 60)
    
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Install npm dependencies if needed
    if not os.path.exists('node_modules'):
        print("\n[1/3] Installing npm dependencies...")
        if not run_command("npm install"):
            sys.exit(1)
    else:
        print("\n[1/3] npm dependencies already installed")
    
    # Build frontend
    print("\n[2/3] Building frontend...")
    if not run_command("npm run build"):
        sys.exit(1)
    
    # Start Flask server
    print("\n[3/3] Starting server...")
    print("=" * 60)
    
    # Use gunicorn on Replit for production, flask dev locally
    port = os.environ.get('PORT', '5000')
    
    if os.environ.get('REPL_ID'):
        # On Replit - use gunicorn
        subprocess.run([
            sys.executable, '-m', 'gunicorn', 
            '--bind', f'0.0.0.0:{port}',
            '--workers', '1',
            'api.trading_api:app'
        ])
    else:
        # Local development
        subprocess.run([sys.executable, 'api/trading_api.py'])

if __name__ == '__main__':
    main()
