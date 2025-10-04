import torch
import numpy as np
from faster_whisper import WhisperModel
import threading
import time
import queue
from typing import Optional, List, Tuple
import json

class FasterWhisperASR:
    def __init__(self, language="en", model_size="base"):
        self.language = language
        self.model_size = model_size
        self.model = None
        self.translate_task = False
        
    def load_model(self):
        """Load the Whisper model"""
        try:
            self.model = WhisperModel(self.model_size, device="cpu", compute_type="int8")
            print(f"Loaded Whisper model: {self.model_size}")
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def set_translate_task(self):
        self.translate_task = True
    
    def transcribe(self, audio_chunk: np.ndarray) -> List[dict]:
        """Transcribe audio chunk"""
        if self.model is None:
            return []
        
        try:
            # Convert audio to the format expected by faster-whisper
            if audio_chunk.dtype != np.float32:
                audio_chunk = audio_chunk.astype(np.float32)
            
            # Normalize audio
            if np.max(np.abs(audio_chunk)) > 0:
                audio_chunk = audio_chunk / np.max(np.abs(audio_chunk))
            
            # Transcribe with word timestamps
            segments, info = self.model.transcribe(
                audio_chunk,
                language=self.language if self.language != "auto" else None,
                task="translate" if self.translate_task else "transcribe",
                word_timestamps=True,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            
            results = []
            for segment in segments:
                words = []
                if hasattr(segment, 'words') and segment.words:
                    for word in segment.words:
                        words.append({
                            'word': word.word,
                            'start': word.start,
                            'end': word.end,
                            'probability': word.probability
                        })
                
                results.append({
                    'text': segment.text.strip(),
                    'start': segment.start,
                    'end': segment.end,
                    'words': words
                })
            
            return results
            
        except Exception as e:
            print(f"Error in transcription: {e}")
            return []

class OnlineASRProcessor:
    def __init__(self, asr_model, min_chunk_size=1.0, buffer_trimming=15):
        self.asr = asr_model
        self.min_chunk_size = min_chunk_size
        self.buffer_trimming = buffer_trimming
        
        self.audio_buffer = []
        self.text_buffer = ""
        self.last_update_time = 0
        self.chunk_time = 0
        
        # Agreement-based confirmation
        self.last_results = []
        self.confirmed_results = []
        
        # Processing state
        self.processing = False
        self.audio_queue = queue.Queue()
        self.result_queue = queue.Queue()
        
        # Start processing thread
        self.process_thread = threading.Thread(target=self._process_audio, daemon=True)
        self.process_thread.start()
    
    def insert_audio_chunk(self, audio_chunk: np.ndarray):
        """Insert new audio chunk for processing"""
        current_time = time.time()
        
        # Add timestamp to audio chunk
        chunk_with_time = {
            'audio': audio_chunk,
            'timestamp': current_time,
            'chunk_time': self.chunk_time
        }
        
        self.audio_buffer.append(chunk_with_time)
        self.chunk_time += len(audio_chunk) / 16000  # Assuming 16kHz sample rate
        
        # Add to processing queue
        self.audio_queue.put(chunk_with_time)
    
    def _process_audio(self):
        """Background thread for processing audio"""
        while True:
            try:
                if not self.audio_queue.empty():
                    chunk_data = self.audio_queue.get(timeout=1)
                    
                    # Process the audio chunk
                    results = self.asr.transcribe(chunk_data['audio'])
                    
                    if results:
                        # Add timestamp information
                        for result in results:
                            result['chunk_timestamp'] = chunk_data['timestamp']
                            result['chunk_time'] = chunk_data['chunk_time']
                        
                        self.result_queue.put(results)
                    
                    self.audio_queue.task_done()
                else:
                    time.sleep(0.1)
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Error in audio processing thread: {e}")
    
    def process_iter(self) -> str:
        """Get the latest partial transcription result"""
        try:
            # Check for new results
            if not self.result_queue.empty():
                new_results = self.result_queue.get_nowait()
                
                # Update last results for agreement checking
                self.last_results = new_results
                
                # Simple confirmation: use the latest result
                if new_results:
                    latest_result = new_results[-1]
                    return latest_result.get('text', '')
            
            return ""
        except queue.Empty:
            return ""
        except Exception as e:
            print(f"Error processing iteration: {e}")
            return ""
    
    def finish(self) -> str:
        """Get final transcription result"""
        # Process any remaining audio
        time.sleep(0.5)  # Give time for final processing
        
        # Get the final confirmed result
        if self.last_results:
            return self.last_results[-1].get('text', '')
        return ""
    
    def init(self):
        """Reset the processor for new audio"""
        self.audio_buffer = []
        self.text_buffer = ""
        self.last_update_time = 0
        self.chunk_time = 0
        self.last_results = []
        self.confirmed_results = []

# Global ASR processor instance
_asr_processor = None

def get_asr_processor(language="en", model_size="base"):
    """Get or create the global ASR processor"""
    global _asr_processor
    
    if _asr_processor is None:
        asr_model = FasterWhisperASR(language, model_size)
        if asr_model.load_model():
            _asr_processor = OnlineASRProcessor(asr_model)
        else:
            raise Exception("Failed to load Whisper model")
    
    return _asr_processor

def reset_asr_processor():
    """Reset the global ASR processor"""
    global _asr_processor
    if _asr_processor:
        _asr_processor.init()
