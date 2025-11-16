// src/LevelSelect.js
import React, { useState, useEffect } from "react";
import "./App.css";

// --- NEW HELPER FUNCTION to capitalize theme names ---
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- NEW CSS for the "Pack" layout ---
// We can inject styles directly for this one-time change.
const styles = {
  packContainer: {
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '20px',
    padding: '20px',
    margin: '20px 0',
    width: '100%',
    maxWidth: '900px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  },
  packTitle: {
    marginTop: '0',
    marginBottom: '20px',
    color: '#333',
    borderBottom: '2px solid rgba(0, 0, 0, 0.1)',
    paddingBottom: '10px',
  },
  difficultyGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '20px',
  },
  // We'll reuse your .level-card for the buttons
};


function LevelSelect({ onSelectLevel, onGoToMenu }) {
  // --- 1. NEW STATE TO HOLD GROUPED LEVELS ---
  const [groupedLevels, setGroupedLevels] = useState({});
  const [specialLevels, setSpecialLevels] = useState([]);

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/levels');
        const data = await res.json();
        
        // --- 2. LOGIC TO GROUP THE LEVELS ---
        const groups = {};
        const special = [];

        for (const level of data) {
          if (level.id.includes('-')) {
            // This is a themed level (e.g., "animals-easy")
            const [theme, difficulty] = level.id.split('-'); // [ "animals", "easy" ]
            if (!groups[theme]) {
              groups[theme] = []; // Create a new array for "animals"
            }
            // Add the level to its theme, with difficulty info
            groups[theme].push({ ...level, difficulty });
          } else {
            // This is a special level (e.g., "TIME_ATTACK")
            special.push(level);
          }
        }
        
        setGroupedLevels(groups);
        setSpecialLevels(special);

      } catch (err) {
        console.error("Failed to fetch levels", err);
      }
    };
    fetchLevels();
  }, []);

  // --- 3. NEW RENDER LOGIC ---
  return (
    <div className="App-header" style={{ justifyContent: 'flex-start', paddingTop: '80px' }}>
      <button onClick={onGoToMenu} className="back-btn">⬅ Menu</button>
      <h1 style={{ marginTop: '0' }}>🎯 Choose a Challenge</h1>
      
      {/* --- RENDER THE THEME PACKS --- */}
      {Object.keys(groupedLevels).map((themeName) => (
        <div key={themeName} style={styles.packContainer}>
          <h2 style={styles.packTitle}>{capitalize(themeName)}</h2>
          <div style={styles.difficultyGrid}>
            {groupedLevels[themeName].map((level) => (
              <div
                key={level.id}
                className="level-card"
                style={{ backgroundColor: level.color || '#DDD', width: '250px' }}
              >
                <h3>{level.name}</h3>
                <p>{level.description}</p>
                <button
                  className="start-level-btn"
                  onClick={() => onSelectLevel(level.id)}
                >
                  Start 🚀
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* --- RENDER THE SPECIAL LEVELS (like Time Attack) --- */}
      <div style={styles.packContainer}>
        <h2 style={styles.packTitle}>🔥 Special Modes</h2>
        <div style={styles.difficultyGrid}>
          {specialLevels.map((level) => (
            <div
              key={level.id}
              className="level-card"
              style={{ backgroundColor: level.color || '#DDD', width: '250px' }}
            >
              <h3>{level.name}</h3>
              <p>{level.description}</p>
              <button
                className="start-level-btn"
                onClick={() => onSelectLevel(level.id)}
              >
                Start 🚀
              </button>
            </div>
          ))}

          {/* This one is still hard-coded, which is fine! */}
          <div
            className="level-card"
            style={{ backgroundColor: "#00c896", width: '250px' }} 
          >
            <h3>🧠 Personalized Practice</h3>
            <p>Your "Practice Later" words.</p>
            <button
              className="start-level-btn"
              onClick={() => onSelectLevel("PRACTICE_DECK")} // Special ID
            >
              Start 🚀
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default LevelSelect;
