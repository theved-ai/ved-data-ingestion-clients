import React, { useCallback, useEffect, useRef, useState } from 'react';
import './styles.css';

function App() {
  const appRef = useRef(null);
  const textareaRef = useRef(null);
  const [isWidgetVisible, setIsWidgetVisible] = useState(false);
  const [note, setNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartMouse = useRef({ x: 0, y: 0 });

  // Load saved note and position from localStorage, and set initial window position
  useEffect(() => {
    const savedNote = localStorage.getItem('pensieve-note');
    if (savedNote) {
      setNote(savedNote);
    }

    const savedPosition = localStorage.getItem('pensieve-position');
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        if (pos && pos.x !== undefined && pos.y !== undefined) {
          setPosition(pos);
          window.electron.send('set-window', { x: pos.x, y: pos.y, animate: false });
        }
      } catch (e) {
        console.error('Failed to load position:', e);
      }
    }

    // Set up IPC listeners
    const cleanup = window.electron?.receive('toggle-widget', () => {
      setIsWidgetVisible(prev => !prev);
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
    // Prevent dragging on interactive elements
    if (e.target.closest('button, textarea')) {
      return;
    }
    dragStartMouse.current = { x: e.screenX, y: e.screenY };
    dragStartPos.current = position;
    setIsDragging(true);
  }, [position]);

  const handleMouseUp = useCallback((e) => {
    if (isDragging) {
      setIsDragging(false);
      const deltaX = e.screenX - dragStartMouse.current.x;
      const deltaY = e.screenY - dragStartMouse.current.y;
      const finalPos = {
        x: dragStartPos.current.x + deltaX,
        y: dragStartPos.current.y + deltaY,
      };
      setPosition(finalPos);
      localStorage.setItem('pensieve-position', JSON.stringify(finalPos));
    }
  }, [isDragging]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const deltaX = e.screenX - dragStartMouse.current.x;
      const deltaY = e.screenY - dragStartMouse.current.y;
      const newX = dragStartPos.current.x + deltaX;
      const newY = dragStartPos.current.y + deltaY;
      window.electron.send('set-window', { x: newX, y: newY, animate: false });
    }
  }, [isDragging]);

  const handleClose = useCallback(() => {
    if (window.electron) {
      window.electron.close();
    }
  }, []);

  // Add global mouse move and up listeners for better drag behavior
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Resize window when switching between orb and widget
  useEffect(() => {
    const { width, height } = isWidgetVisible
      ? { width: 360, height: 200 }
      : { width: 84, height: 84 };
    window.electron.send('set-window', { width, height });
  }, [isWidgetVisible]);

  const Orb = () => (
    <div id="orb">
      <div id="orb-icon">✨</div>
      <button id="close-orb" onClick={(e) => { e.stopPropagation(); handleClose(); }}>×</button>
    </div>
  );

  const Widget = () => (
    <div id="widget">
      <button id="close-widget" onClick={() => setIsWidgetVisible(false)}>—</button>
      <button id="close-app" onClick={handleClose}>×</button>
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
  );

  return (
    <div 
      className="app-container" 
      onMouseDown={handleMouseDown}
      onClick={() => !isWidgetVisible && setIsWidgetVisible(true)}
    >
      {isWidgetVisible ? <Widget /> : <Orb />}
    </div>
  );
}

export default App;
