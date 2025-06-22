import React, { useCallback, useEffect, useRef, useState } from 'react';
import './styles.css';
import Orb from './orb';

function App() {
  const appRef = useRef(null);
  const textareaRef = useRef(null);
  const [isWidgetVisible, setIsWidgetVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [note, setNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: null, message: '' });
  const submitTimeoutRef = useRef(null);
  // Default position is bottom-right of the screen with some margin
  const [screenSize, setScreenSize] = useState({
    width: window.screen.availWidth,
    height: window.screen.availHeight
  });

  const defaultPosition = useRef({
    x: screenSize.width - 84 - 24, // 84px orb width + 24px margin
    y: screenSize.height - 84 - 24  // 84px orb height + 24px margin
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



    // Set up IPC listeners
    const cleanup = window.electron?.receive('toggle-widget', () => {
      setIsWidgetVisible(prev => {
        if (!prev) { // If orb is visible, we are opening the widget
          // Center the widget
          setPosition({
            x: Math.round((screenSize.width - 360) / 2),
            y: Math.round((screenSize.height - 200) / 2),
          });
        } else { // If widget is visible, we are closing it to show the orb
          setIsReturning(true);
        }
        return !prev;
      });
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

  // Animate orb returning to corner
  useEffect(() => {
    if (isReturning) {
      const targetX = screenSize.width - 84 - 24;
      const targetY = screenSize.height - 84 - 24;
      setPosition({ x: targetX, y: targetY });
      setTimeout(() => {
        setIsReturning(false);
      }, 50);
    }
  }, [isReturning, screenSize]);

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
        message: 'Message sent successfully!' 
      });
    } catch (error) {
      console.error('Error submitting note:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: 'Failed to send message. Please try again.' 
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
    if (e.target.closest('button, textarea') || isReturning) {
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
      const duration = 150; // ms - Reduced from 300ms for faster animation
      
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

  // Update window position and size
  useEffect(() => {
    if (isWidgetVisible) {
      const width = isExpanded ? 600 : 360;
      const height = isExpanded ? 400 : 200;
      window.electron.send('set-window', {
        width,
        height,
        x: Math.round((screenSize.width - width) / 2),
        y: Math.round((screenSize.height - height) / 2),
        animate: !isReturning
      });
    } else {
      // Orb is visible
      const maxX = screenSize.width - 84; // Orb width
      const maxY = screenSize.height - 84; // Orb height
      
      const newX = Math.min(Math.max(0, position.x), maxX);
      const newY = Math.min(Math.max(0, position.y), maxY);
      
      window.electron.send('set-window', { 
        width: 84, 
        height: 84,
        x: newX,
        y: newY,
        animate: !isReturning
      });
    }
  }, [isWidgetVisible, isExpanded, position, screenSize, isReturning]);

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
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
        />
      ) : (
        <Orb handleClose={handleClose} isAnimating={isAnimating} />
      )}
    </div>
  );
}

const Widget = ({ note, handleNoteChange, handleSend, handleClose, onToggle, isAnimating, textareaRef, isSubmitting, submitStatus, isExpanded, onToggleExpand }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (!e.shiftKey) {
        e.preventDefault(); // Prevent newline when pressing Enter alone
        if (e.metaKey || e.ctrlKey) {
          // Keep the existing Cmd+Enter functionality
          handleSend();
        } else if (note.trim()) {
          // Send on Enter (without modifier keys) only if there's content
          handleSend();
        }
      }
      // Allow Shift+Enter for newlines
    }
  };

  return (
    <div id="widget" className={`${isAnimating ? 'shrink-out' : 'expand-in'} ${isExpanded ? 'expanded' : ''}`}>
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
            style={{ minHeight: isExpanded ? '300px' : '120px' }}
          />
          <div className="button-row">
            {submitStatus.message && (
              <div className={`status-message ${submitStatus.type}`}>
                <span>{submitStatus.message}</span>
              </div>
            )}
            <button 
              className="material-icons expand-btn"
              onClick={onToggleExpand}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? 'fullscreen_exit' : 'fullscreen'}
            </button>
            <button 
              id="send-btn" 
              onClick={handleSend} 
              disabled={!note.trim() || isSubmitting}
              className={isSubmitting ? 'sending' : ''}
            >
              {isSubmitting ? (
                <div className="spinner"></div>
              ) : (
                <img src="../src/assets/forward-arrow.svg" alt="Send" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
