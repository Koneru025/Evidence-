import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PolicePage from './components/PolicePage';
import JudgePage from './components/JudgePage';
import MainPage from './components/MainPage';
import AddEvidencePage from './components/AddEvidencePage';
import ViewEvidencePage from './components/ViewEvidencePage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/police" element={<PolicePage />} />
          <Route path="/judge" element={<JudgePage />} />
          <Route path="/add-evidence" element={<AddEvidencePage />} />
          <Route path="/view-evidence" element={<ViewEvidencePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
