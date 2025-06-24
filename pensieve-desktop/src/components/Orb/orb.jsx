import React from "react";
import "./orb.css";

const Orb = ({ handleClose, isAnimating }) => (
  <div id="orb" className={isAnimating ? "shrink-out" : "expand-in"}>
    <div id="orb-icon" />
    <button
      id="close-orb"
      onClick={(e) => {
        e.stopPropagation();
        handleClose();
      }}
    >
      X
    </button>
  </div>
);

export default Orb;
