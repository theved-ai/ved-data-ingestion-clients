import React, { useCallback, useEffect, useRef, useState } from 'react';
import './styles.css';

function App() {
  const appRef = useRef(null);
  const textareaRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [note, setNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load saved note and position from localStorage
  useEffect(() => {
    const savedNote = localStorage.getItem('pensieve-note');
    if (savedNote) {
      setNote(savedNote);
    }

    const savedPosition = localStorage.getItem('pensieve-position');
    if (savedPosition) {
      try {
        const { x, y } = JSON.parse(savedPosition);
        if (x !== undefined && y !== undefined) {
          setPosition({ x, y });
        }
      } catch (e) {
        console.error('Failed to load position:', e);
      }
    }

    // Set up IPC listeners
    const cleanup = window.electron?.receive('toggle-expand', () => {
      setIsExpanded(prev => !prev);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Save note to localStorage when it changes
  useEffect(() => {
    if (note !== '') {
      localStorage.setItem('pensieve-note', note);
    }
  }, [note]);

  const handleNoteChange = (e) => {
    setNote(e.target.value);
  };

  const handleSend = () => {
    // Implement send logic here
    console.log('Sending note:', note);
    setNote(''); // Clear the note after sending
  };

  const handleMouseDown = useCallback((e) => {
    if (e.target === appRef.current || e.target.closest('.app-header')) {
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep window within screen bounds
      const maxX = window.innerWidth - 300; // 300px is the width of the app
      const maxY = window.innerHeight - 200; // 200px is the height of the app
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClose = useCallback(() => {
    if (window.electron) {
      window.electron.close();
    }
  }, []);

  // Add global mouse move and up listeners for better drag behavior
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  return (
    <div 
      ref={appRef}
      className="app"
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '300px',
        height: '200px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        transform: isDragging ? 'scale(1.01)' : 'scale(1)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        zIndex: 9999,
        
      }}
    >
      <div 
        className="app-header"
        style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(240, 240, 245, 0.8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitAppRegion: 'drag',
        }}
      >
        <div style={{ fontWeight: 500, color: '#333' }}>Pensieve</div>
        <button 
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 8px',
            borderRadius: '4px',
            color: '#666',
            WebkitAppRegion: 'no-drag',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ×
        </button>
      </div>
      <div style={{ 
        padding: '16px', 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div id="widget-content">
          <div className="input-container">
            <textarea
              ref={textareaRef}
              id="note-input"
              placeholder="Type your note here..."
              value={note}
              onChange={handleNoteChange}
            />
            <button id="send-btn" onClick={handleSend} disabled={!note.trim()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="white"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
