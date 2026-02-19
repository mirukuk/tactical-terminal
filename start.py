#!/usr/bin/env python3
"""
Tactical Terminal - Startup Script
"""

import subprocess
import sys
import os

def check_and_install():
    """Check and install dependencies"""
    print("="*60)
    print("Checking Python dependencies...")
    print("="*60)
    
    deps = ['flask', 'flask_cors', 'yfinance', 'pandas', 'numpy']
    for dep in deps:
        try:
            __import__(dep)
            print(f"  {dep} OK")
        except ImportError:
            print(f"  Installing {dep}...")
            subprocess.run([sys.executable, '-m', 'pip', 'install', dep], check=True)
    
    print("\n" + "="*60)
    print("Checking npm dependencies...")
    print("="*60)
    
    if not os.path.exists('node_modules'):
        print("  Running npm install...")
        subprocess.run(['npm', 'install'], check=True)
    else:
        print("  node_modules OK")

def main():
    check_and_install()
    
    print("\n" + "="*60)
    print("Starting servers...")
    print("="*60)
    print("API: http://localhost:5000")
    print("App: http://localhost:5173")
    print("="*60 + "\n")
    
    # Start API server
    api_process = subprocess.Popen(
        [sys.executable, 'api/trading_api.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True
    )
    
    # Start frontend
    frontend_process = subprocess.Popen(
        'npm run dev',
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True
    )
    
    try:
        while True:
            # Check if processes are still running
            if api_process.poll() is not None:
                print("API server stopped")
                frontend_process.terminate()
                break
            if frontend_process.poll() is not None:
                print("Frontend stopped")
                api_process.terminate()
                break
    except KeyboardInterrupt:
        print("\nShutting down...")
        api_process.terminate()
        frontend_process.terminate()

if __name__ == '__main__':
    main()
