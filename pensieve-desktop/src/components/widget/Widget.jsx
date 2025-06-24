import React from "react";

const Widget = ({
  note,
  handleNoteChange,
  handleSend,
  handleClose,
  onToggle,
  isAnimating,
  textareaRef,
  isSubmitting,
  submitStatus,
  isExpanded,
  onToggleExpand,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
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
    <div
      id="widget"
      className={`${isAnimating ? "shrink-out" : "expand-in"} ${
        isExpanded ? "expanded" : ""
      }`}
    >
      <button id="close-app" onClick={handleClose} disabled={isSubmitting}>
        x
      </button>
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
            style={{ minHeight: isExpanded ? "300px" : "120px" }}
          />
          <div className="button-row">
            {submitStatus.message && (
              <div
                className={`status-message ${submitStatus.type} ${
                  submitStatus.message.length > 40 ? "marquee" : ""
                }`}
              >
                <span>{submitStatus.message}</span>
              </div>
            )}
            <button
              className="material-icons expand-btn"
              onClick={onToggleExpand}
              aria-label={isExpanded ? "Collapse" : "Expand"}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? "fullscreen_exit" : "fullscreen"}
            </button>
            <button
              id="send-btn"
              onClick={handleSend}
              disabled={!note.trim() || isSubmitting}
              className={isSubmitting ? "sending" : ""}
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

export default Widget;
