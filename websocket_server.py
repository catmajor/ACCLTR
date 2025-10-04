#!/usr/bin/env python3
"""
WebSocket server for real-time Whisper transcription
Connects to the Next.js frontend and processes audio streams
"""

import asyncio
import websockets
import json
import numpy as np
import logging
from typing import Dict, Any
import sys
import os

# Add the whisper_streaming module to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'whisper_streaming'))

from whisper_streaming import get_asr_processor, reset_asr_processor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WhisperWebSocketServer:
    def __init__(self, host="localhost", port=8080):
        self.host = host
        self.port = port
        self.clients = set()
        self.asr_processor = None
        
    async def register_client(self, websocket):
        """Register a new client connection"""
        self.clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
        
    async def unregister_client(self, websocket):
        """Unregister a client connection"""
        self.clients.discard(websocket)
        logger.info(f"Client disconnected. Total clients: {len(self.clients)}")
        
    async def handle_client(self, websocket, path):
        """Handle individual client connections"""
        await self.register_client(websocket)
        
        try:
            # Parse query parameters
            query_params = {}
            if '?' in path:
                query_string = path.split('?')[1]
                for param in query_string.split('&'):
                    if '=' in param:
                        key, value = param.split('=', 1)
                        query_params[key] = value
            
            # Extract language and model from query parameters
            language = query_params.get('language', 'en')
            model_size = query_params.get('model', 'base')
            
            logger.info(f"Client connected with language: {language}, model: {model_size}")
            
            # Initialize ASR processor
            try:
                self.asr_processor = get_asr_processor(language=language, model_size=model_size)
                await websocket.send(json.dumps({
                    'type': 'initialized',
                    'message': f'Whisper model {model_size} loaded for language {language}'
                }))
            except Exception as e:
                logger.error(f"Failed to initialize ASR processor: {e}")
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': f'Failed to initialize Whisper model: {str(e)}'
                }))
                return
            
            # Handle messages from client
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.process_message(websocket, data)
                except json.JSONDecodeError:
                    logger.error("Invalid JSON received")
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'message': 'Invalid JSON format'
                    }))
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'message': f'Error processing message: {str(e)}'
                    }))
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info("Client connection closed")
        except Exception as e:
            logger.error(f"Unexpected error in client handler: {e}")
        finally:
            await self.unregister_client(websocket)
            
    async def process_message(self, websocket, data: Dict[str, Any]):
        """Process incoming messages from clients"""
        message_type = data.get('type')
        
        if message_type == 'audio':
            # Process audio data
            await self.process_audio_data(websocket, data)
        elif message_type == 'stop':
            # Stop transcription
            await self.stop_transcription(websocket)
        elif message_type == 'reset':
            # Reset the ASR processor
            await self.reset_processor(websocket)
        else:
            logger.warning(f"Unknown message type: {message_type}")
            
    async def process_audio_data(self, websocket, data: Dict[str, Any]):
        """Process incoming audio data"""
        try:
            if not self.asr_processor:
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': 'ASR processor not initialized'
                }))
                return
                
            # Extract audio data
            audio_data = data.get('audio', [])
            if not audio_data:
                return
                
            # Convert to numpy array
            audio_array = np.array(audio_data, dtype=np.int16)
            
            # Convert to float32 and normalize
            audio_float = audio_array.astype(np.float32) / 32768.0
            
            # Insert audio chunk into processor
            self.asr_processor.insert_audio_chunk(audio_float)
            
            # Get partial transcription result
            partial_result = self.asr_processor.process_iter()
            
            if partial_result:
                await websocket.send(json.dumps({
                    'type': 'transcription',
                    'text': partial_result
                }))
                
        except Exception as e:
            logger.error(f"Error processing audio data: {e}")
            await websocket.send(json.dumps({
                'type': 'error',
                'message': f'Error processing audio: {str(e)}'
            }))
            
    async def stop_transcription(self, websocket):
        """Stop transcription and get final result"""
        try:
            if self.asr_processor:
                final_result = self.asr_processor.finish()
                if final_result:
                    await websocket.send(json.dumps({
                        'type': 'final_transcription',
                        'text': final_result
                    }))
        except Exception as e:
            logger.error(f"Error stopping transcription: {e}")
            
    async def reset_processor(self, websocket):
        """Reset the ASR processor"""
        try:
            if self.asr_processor:
                self.asr_processor.init()
                await websocket.send(json.dumps({
                    'type': 'reset',
                    'message': 'Processor reset successfully'
                }))
        except Exception as e:
            logger.error(f"Error resetting processor: {e}")
            
    async def start_server(self):
        """Start the WebSocket server"""
        logger.info(f"Starting Whisper WebSocket server on {self.host}:{self.port}")
        
        async with websockets.serve(
            self.handle_client,
            self.host,
            self.port,
            ping_interval=20,
            ping_timeout=10
        ):
            logger.info(f"Server running on ws://{self.host}:{self.port}")
            logger.info("Waiting for connections...")
            await asyncio.Future()  # Run forever

def main():
    """Main entry point"""
    server = WhisperWebSocketServer()
    
    try:
        asyncio.run(server.start_server())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")

if __name__ == "__main__":
    main()
