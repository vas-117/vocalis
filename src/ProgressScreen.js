// src/ProgressScreen.js
import React, { useEffect, useState } from "react";
import "./App.css";

function ProgressScreen({ onGoToMenu, token }) {
  const [themedProgress, setThemedProgress] = useState([]); // <-- Will hold our theme boxes
  const [streak, setStreak] = useState(0);
  const [average, setAverage] = useState(0); // <-- State for the average

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/progress', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          setThemedProgress(data.themedProgress || []); // <-- Use new themed data
          setStreak(data.streak || 0);

          // Calculate average from the 'progress' array
          const progress = data.progress || [];
          const avg =
            progress.length > 0
              ? Math.round(progress.reduce((a, b) => a + b.accuracy, 0) / progress.length)
              : 0;
          setAverage(avg);
        } else {
          throw new Error(data.error || 'Failed to fetch progress');
        }
      } catch (err) {
        console.error(err);
        setThemedProgress([]);
      }
    };
    
    if (token) {
      fetchProgress();
    }
  }, [token]);

  // This is your NEW function
const clearProgress = async () => {
  // 1. Confirm with the user first!
  const isConfirmed = window.confirm(
    "Are you sure you want to delete all your progress? This cannot be undone."
  );

  if (isConfirmed) {
    try {
      // 2. Call the new DELETE endpoint with the token
      const res = await fetch('http://localhost:3001/api/progress', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to clear progress on server');
      }

      // 3. Clear the state on the front-end to update the page instantly
      setThemedProgress([]);
      setAverage(0);
      setStreak(0);
      alert('Your progress has been cleared.');

    } catch (err) {
      console.error(err);
      alert('Error: Could not clear progress.');
    }
  }
};

  return (
    <div className="App-header">
      <button onClick={onGoToMenu} className="back-btn">⬅ Menu</button>
      <h1>📊 Your Progress</h1>

      {/* This summary box stays at the top */}
      <div className="progress-summary">
        <p>Current Streak: <strong>🔥 {streak} Days</strong></p> 
        <p>Average Accuracy: <strong>{average}%</strong></p>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${average}%` }}
          ></div>
        </div>
      </div>

      {/* --- NEW THEME MAPPING --- */}
      <div className="progress-grid">
        {themedProgress.map((theme) => (
          // Create one "progress-section" (box) for each theme
          <div className="progress-section" key={theme.themeName} style={{borderColor: theme.color}}>
            <h2 style={{ color: theme.color }}>{theme.themeName}</h2>
            
            <div className="progress-subsection">
              <h3>⭐ Mastered</h3>
              {theme.mastered.length > 0 ? (
                <ul>{theme.mastered.map((word) => <li key={word}>{word}</li>)}</ul>
              ) : <p>None yet!</p>}
            </div>

            <div className="progress-subsection">
              <h3>🔁 Practice Later</h3>
              {theme.practiceLater.length > 0 ? (
                <ul>{theme.practiceLater.map((word) => <li key={word}>{word}</li>)}</ul>
              ) : <p>All clear!</p>}
            </div>
          </div>
        ))}
      </div>
      {/* --- END OF NEW MAPPING --- */}

      <button onClick={clearProgress} className="clear-button">
        Clear Progress
      </button>
    </div>
  );
}

export default ProgressScreen;
