import React, { useCallback, useEffect, useRef, useState } from 'react';
import './styles.css';

function App() {
  const appRef = useRef(null);
  const textareaRef = useRef(null);
  const [isWidgetVisible, setIsWidgetVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [note, setNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: null, message: '' });
  const submitTimeoutRef = useRef(null);
  // Default position is bottom-right of the screen with some margin
  const [screenSize, setScreenSize] = useState({
    width: window.screen.availWidth,
    height: window.screen.availHeight
  });

  const defaultPosition = useRef({ 
    x: screenSize.width - 384, // 360px (widget width) + 24px margin
    y: screenSize.height - 300  // 200px (widget height) + 100px margin
  });
  
  // Update screen size on resize
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.screen.availWidth,
        height: window.screen.availHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  },[]);
  
  const [position, setPosition] = useState(defaultPosition.current);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef(null);

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

  const handleSend = async () => {
    if (!note.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });
    
    try {
      // TODO: Replace with actual API endpoint
      const response = await fetch('https://api.example.com/v1/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'user-123', // TODO: Replace with actual user ID
          data_source: 'user_typed',
          content: note.trim()
        })
      });
      
      if (!response.ok) throw new Error('Failed to submit note');
      
      // Success
      setNote('');
      setSubmitStatus({ 
        type: 'success', 
        message: 'Note saved successfully!' 
      });
    } catch (error) {
      console.error('Error submitting note:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: 'Failed to save note. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
      
      // Clear status message after 3 seconds
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      
      submitTimeoutRef.current = setTimeout(() => {
        setSubmitStatus({ type: null, message: '' });
      }, 3000);
    }
  };

  const handleMouseDown = useCallback((e) => {
    // Prevent dragging on interactive elements
    if (e.target.closest('button, textarea')) {
      return;
    }
    dragStartMouse.current = { x: e.screenX, y: e.screenY };
    dragStartPos.current = position;
    setIsDragging(false); // Start with false, will be set to true on move

    // Store the initial position for click detection
    const startX = e.screenX;
    const startY = e.screenY;

    const handleMouseMove = (moveEvent) => {
      // If mouse moves more than 5px, consider it a drag
      if (Math.abs(moveEvent.screenX - startX) > 5 || Math.abs(moveEvent.screenY - startY) > 5) {
        setIsDragging(true);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp, { once: true });
  }, [position]);

  const handleMouseUp = useCallback((e) => {
    if (isDragging) {
      setIsDragging(false);
      const deltaX = e.screenX - dragStartMouse.current.x;
      const deltaY = e.screenY - dragStartMouse.current.y;
      const finalPos = {
        x: Math.max(0, Math.min(window.screen.availWidth - 84, dragStartPos.current.x + deltaX)),
        y: Math.max(0, Math.min(window.screen.availHeight - 84, dragStartPos.current.y + deltaY)),
      };
      setPosition(finalPos);
      localStorage.setItem('pensieve-position', JSON.stringify(finalPos));
      
      // Update default position if this was a drag of the orb
      if (!isWidgetVisible) {
        defaultPosition.current = { ...finalPos };
      }
    }
  }, [isDragging, isWidgetVisible]);

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

  // Toggle between widget and minimized orb
  const handleToggleWidget = useCallback(() => {
    if (isWidgetVisible) {
      // When minimizing, save current position and animate to default position
      const savedPosition = { ...position };
      setIsAnimating(true);
      
      // Animate back to default position
      const startTime = performance.now();
      const duration = 300; // ms
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out animation
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const newX = savedPosition.x + (defaultPosition.current.x - savedPosition.x) * easeProgress;
        const newY = savedPosition.y + (defaultPosition.current.y - savedPosition.y) * easeProgress;
        
        window.electron.send('set-window', { 
          x: Math.round(newX), 
          y: Math.round(newY),
          animate: false 
        });
        
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete
          setPosition(defaultPosition.current);
          setIsWidgetVisible(false);
          setIsAnimating(false);
          animationFrameRef.current = null;
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      // When expanding, just show the widget
      setIsWidgetVisible(true);
    }
  }, [isWidgetVisible, position]);

  // Handle window resize when toggling between widget and orb
  useEffect(() => {
    if (isWidgetVisible) {
      // When showing widget, ensure it's fully visible on screen
      const maxX = screenSize.width - 360; // Widget width
      const maxY = screenSize.height - 200; // Widget height
      
      const newX = Math.min(Math.max(0, position.x), maxX);
      const newY = Math.min(Math.max(0, position.y), maxY);
      
      // Update position if it was adjusted
      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }
      
      window.electron.send('set-window', { 
        width: 360, 
        height: 200,
        x: newX,
        y: newY,
        animate: true 
      });
    } else {
      // When showing orb, set its size and ensure it's fully visible
      const maxX = screenSize.width - 84; // Orb width
      const maxY = screenSize.height - 84; // Orb height
      
      const newX = Math.min(Math.max(0, position.x), maxX);
      const newY = Math.min(Math.max(0, position.y), maxY);
      
      window.electron.send('set-window', { 
        width: 84, 
        height: 84,
        x: newX,
        y: newY,
        animate: true 
      });
    }
  }, [isWidgetVisible, position, screenSize]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = useCallback((e) => {
    // Only toggle if not dragging and not clicking on interactive elements
    if (!isWidgetVisible && !isAnimating && !isDragging && !e.target.closest('button, textarea')) {
      handleToggleWidget();
    }
  }, [isWidgetVisible, isAnimating, isDragging, handleToggleWidget]);

  return (
    <div
      className="app-container"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {isWidgetVisible ? (
        <Widget
          note={note}
          handleNoteChange={handleNoteChange}
          handleSend={handleSend}
          handleClose={handleClose}
          onToggle={handleToggleWidget}
          isAnimating={isAnimating}
          textareaRef={textareaRef}
          isSubmitting={isSubmitting}
          submitStatus={submitStatus}
        />
      ) : (
        <Orb handleClose={handleClose} isAnimating={isAnimating} />
      )}
    </div>
  );
}

const Orb = ({ handleClose, isAnimating }) => (
  <div id="orb" className={isAnimating ? 'shrink-out' : 'expand-in'}>
    <div id="orb-icon">✨</div>
    <button id="close-orb" onClick={(e) => { e.stopPropagation(); handleClose(); }}>×</button>
  </div>
);

const Widget = ({ note, handleNoteChange, handleSend, handleClose, onToggle, isAnimating, textareaRef, isSubmitting, submitStatus }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSend();
    }
  };

  return (
    <div id="widget" className={isAnimating ? 'shrink-out' : 'expand-in'}>
      <button id="close-app" onClick={handleClose} disabled={isSubmitting}>x</button>
      <div id="widget-content">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            id="note-input"
            placeholder="Jot down your thoughts..."
            value={note}
            onChange={handleNoteChange}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
          <button 
            id="send-btn" 
            onClick={handleSend} 
            disabled={!note.trim() || isSubmitting}
            className={isSubmitting ? 'sending' : ''}
          >
            {isSubmitting ? (
              <div className="spinner"></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="white" />
              </svg>
            )}
          </button>
        </div>
        {submitStatus.message && (
          <div className={`status-message ${submitStatus.type}`}>
            {submitStatus.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
