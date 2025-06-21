import React from 'react';
import orbImage from '../assets/orb.png'; // adjust path if different
import './orb.css'; // optional CSS file for styling

const Orb = ({ handleClose, isAnimating }) => (
  <div id="orb" className={isAnimating ? 'shrink-out' : 'expand-in'}>
    <img src={orbImage} alt="Orb icon" id="orb-icon" />
    <button id="close-orb" onClick={(e) => { e.stopPropagation(); handleClose(); }}>×</button>
  </div>
);

export default Orb;
