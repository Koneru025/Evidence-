import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PolicePage.css';

function PolicePage() {
  const navigate = useNavigate();

  const handleAddEvidence = () => {
    navigate('/add-evidence');
  };

  const handleViewEvidence = () => {
    navigate('/view-evidence');
  };

  return (
    <div className="police-container">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Home
      </button>
      <h1>Police Dashboard</h1>
      
      <div className="options-container">
        <div className="option-card" onClick={handleAddEvidence}>
          <div className="icon">📄</div>
          <h2>Add New Evidence</h2>
          <p>Record and store new case evidence</p>
        </div>
        <div className="option-card" onClick={handleViewEvidence}>
          <div className="icon">🔍</div>
          <h2>View Evidence</h2>
          <p>Access and review stored evidence</p>
        </div>
      </div>
    </div>
  );
}

export default PolicePage; 