#!/usr/bin/env python3
"""
Startup script for the Whisper WebSocket server
Checks dependencies and starts the server
"""

import sys
import subprocess
import importlib

def check_dependencies():
    """Check if all required dependencies are installed"""
    required_packages = [
        'faster_whisper',
        'websockets', 
        'numpy',
        'torch'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            importlib.import_module(package)
            print(f"✓ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"✗ {package} - MISSING")
    
    if missing_packages:
        print(f"\nMissing packages: {', '.join(missing_packages)}")
        print("Please install them with: pip install -r requirements.txt")
        return False
    
    print("\nAll dependencies are installed!")
    return True

def main():
    """Main startup function"""
    print("Whisper WebSocket Server Startup")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    print("\nStarting server...")
    print("Server will be available at: ws://localhost:8080")
    print("Press Ctrl+C to stop the server")
    print("-" * 40)
    
    # Import and start the server
    try:
        from websocket_server import main as server_main
        server_main()
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
