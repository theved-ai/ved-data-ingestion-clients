import React, { useCallback, useEffect, useRef, useState } from "react";
import "./styles.css";
import Orb from "../../components/orb/Orb";
import Widget from "../../components/widget/Widget";

function AppView() {
  const textareaRef = useRef(null);
  const [isWidgetVisible, setIsWidgetVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: null, message: "" });
  const submitTimeoutRef = useRef(null);
  // Default position is bottom-right of the screen with some margin
  const [screenSize, setScreenSize] = useState({
    width: window.screen.availWidth,
    height: window.screen.availHeight,
  });

  const defaultPosition = useRef({
    x: screenSize.width - 84 - 24, // 84px orb width + 24px margin
    y: screenSize.height - 84 - 24, // 84px orb height + 24px margin
  });

  // Update screen size on resize
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.screen.availWidth,
        height: window.screen.availHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [position, setPosition] = useState(defaultPosition.current);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef(null);

  // Load saved note and position from localStorage, and set initial window position
  useEffect(() => {
    const savedNote = localStorage.getItem("pensieve-note");
    if (savedNote) {
      setNote(savedNote);
    }

    // Set up IPC listeners
    const cleanup = window.electron?.receive("toggle-widget", () => {
      handleToggleWidget();
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Save note to localStorage when it changes
  useEffect(() => {
    if (note !== "") {
      localStorage.setItem("pensieve-note", note);
    }
  }, [note]);

  // Orb returning to corner
  useEffect(() => {
    if (isReturning) {
      const targetX = screenSize.width - 84 - 24;
      const targetY = screenSize.height - 84 - 24;
      setPosition({ x: targetX, y: targetY });
      // Use a short timeout to allow the state to update before re-enabling animations
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
    setSubmitStatus({ type: null, message: "" });

    try {
      // TODO: Replace with actual API endpoint
      const response = await fetch("https://api.example.com/v1/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: "user-123", // TODO: Replace with actual user ID
          data_source: "user_typed",
          content: note.trim(),
        }),
      });

      if (!response.ok) throw new Error("Failed to submit note");

      // Success
      setNote("");
      setSubmitStatus({
        type: "success",
        message: "Message sent successfully!",
      });
    } catch (error) {
      console.error("Error submitting note:", error);
      setSubmitStatus({
        type: "error",
        message: "Failed to send. Please try again.",
      });
    } finally {
      // Hide the status message after 3 seconds
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      submitTimeoutRef.current = setTimeout(() => {
        setSubmitStatus({ type: null, message: "" });
      }, 3000);
      setIsSubmitting(false);
    }
  };

  const handleToggleWidget = useCallback(() => {
    // Prevent toggling while dragging
    if (isDragging) return;

    setIsWidgetVisible((prev) => {
      if (!prev) {
        // If orb is visible, we are opening the widget
        // Center the widget
        setPosition({
          x: Math.round((screenSize.width - 360) / 2),
          y: Math.round((screenSize.height - 200) / 2),
        });
      } else {
        // If widget is visible, we are closing it to show the orb
        setIsReturning(true);
      }
      return !prev;
    });
  }, [screenSize, isDragging]);

  const handleMouseDown = useCallback(
    (e) => {
      // Prevent dragging on interactive elements or when widget is visible
      if (e.target.closest("button, textarea") || isWidgetVisible) {
        return;
      }
      dragStartMouse.current = { x: e.screenX, y: e.screenY };
      dragStartPos.current = position;

      let moved = false;
      let wasDragged = false;

      const handleMouseMove = (moveEvent) => {
        if (!moved) {
          const dx = moveEvent.screenX - dragStartMouse.current.x;
          const dy = moveEvent.screenY - dragStartMouse.current.y;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            moved = true;
            wasDragged = true;
            setIsDragging(true);
          }
        }

        if (moved) {
          const newPos = {
            x:
              dragStartPos.current.x +
              (moveEvent.screenX - dragStartMouse.current.x),
            y:
              dragStartPos.current.y +
              (moveEvent.screenY - dragStartMouse.current.y),
          };
          setPosition(newPos);
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        if (wasDragged) {
          // If the orb was dragged, open the widget after a small delay
          setTimeout(() => {
            setIsDragging(false);
            if (!isWidgetVisible) {
              handleToggleWidget();
            }
          }, 10);
        } else {
          // If it was just a click, handle normally
          setTimeout(() => setIsDragging(false), 0);
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [position, isWidgetVisible, handleToggleWidget]
  );

  const handleClose = useCallback(() => {
    if (window.electron) {
      window.electron.close();
    }
  }, []);

  // Update window position and size
  useEffect(() => {
    if (isWidgetVisible) {
      const width = isExpanded ? 600 : 360;
      const height = isExpanded ? 400 : 200;
      window.electron.send("set-window", {
        width,
        height,
        x: Math.round((screenSize.width - width) / 2),
        y: Math.round((screenSize.height - height) / 2),
        animate: true, // Animate widget open
      });
    } else {
      // Orb is visible
      const maxX = screenSize.width - 84; // Orb width
      const maxY = screenSize.height - 84; // Orb height

      const newX = Math.min(Math.max(0, position.x), maxX);
      const newY = Math.min(Math.max(0, position.y), maxY);

      window.electron.send("set-window", {
        width: 84,
        height: 84,
        x: newX,
        y: newY,
        animate: !isReturning && !isDragging, // No animation when returning or dragging
      });
    }
  }, [
    isWidgetVisible,
    isExpanded,
    position,
    screenSize,
    isReturning,
    isDragging,
  ]);

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

  const handleClick = useCallback(
    (e) => {
      // Only toggle if not dragging and not clicking on interactive elements
      if (
        !isDragging &&
        !isWidgetVisible &&
        !e.target.closest("button, textarea")
      ) {
        handleToggleWidget();
      }
    },
    [isDragging, isWidgetVisible, handleToggleWidget]
  );

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

export default AppView;
