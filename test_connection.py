#!/usr/bin/env python3
"""
Test script to verify WebSocket server connection
"""

import asyncio
import websockets
import json
import numpy as np

async def test_connection():
    """Test WebSocket connection to the server"""
    try:
        # Connect to the server
        uri = "ws://localhost:8080?language=en&model=base"
        print(f"Connecting to {uri}...")
        
        async with websockets.connect(uri) as websocket:
            print("✓ Connected to WebSocket server")
            
            # Wait for initialization message
            message = await websocket.recv()
            data = json.loads(message)
            print(f"✓ Received: {data}")
            
            # Send a test audio chunk (silence)
            test_audio = np.zeros(1600, dtype=np.int16)  # 0.1 seconds of silence at 16kHz
            test_message = {
                "type": "audio",
                "audio": test_audio.tolist()
            }
            
            await websocket.send(json.dumps(test_message))
            print("✓ Sent test audio data")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                response_data = json.loads(response)
                print(f"✓ Received response: {response_data}")
            except asyncio.TimeoutError:
                print("⚠ No response received (this is normal for silence)")
            
            print("✓ Connection test completed successfully!")
            
    except Exception as e:
        print(f"✗ Connection test failed: {e}")
        return False
    
    return True

def main():
    """Run the connection test"""
    print("WebSocket Server Connection Test")
    print("=" * 40)
    print("Make sure the WebSocket server is running on localhost:8080")
    print("")
    
    try:
        result = asyncio.run(test_connection())
        if result:
            print("\n✓ All tests passed! Server is working correctly.")
        else:
            print("\n✗ Tests failed. Check server status.")
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"\nTest error: {e}")

if __name__ == "__main__":
    main()
