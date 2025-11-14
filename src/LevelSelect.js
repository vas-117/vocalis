import React from "react";
import "./App.css";

function LevelSelect({ onSelectLevel, onGoToMenu }) {
  const levels = [
    {
      id: 1,
      name: "Level 1: Small Words",
      description: "Start with simple, single-syllable words.",
      color: "#FFD36B", // Yellow
    },
    {
      id: 2,
      name: "Level 2: Complex Words",
      description: "Practice longer and trickier words.",
      color: "#B6E388", // Green
    },
    {
      id: 3,
      name: "Level 3: Sentences",
      description: "Try full sentences for fluency and flow.",
      color: "#A2D2FF", // Blue
    },
    // 🔥 NEW TIME ATTACK CARD
    {
      id: "TIME_ATTACK", // Special ID
      name: "⏱️ Time Attack Mode",
      description: "Score as high as you can in 60 seconds!",
      color: "#ff9b85", // Red/Orange
    },
  ];

  return (
    <div className="App-header">
      <button onClick={onGoToMenu} className="back-btn">⬅ Menu</button>
      <h1>🎯 Choose a Challenge</h1>
      <div className="level-grid">
        {levels.map((level) => (
          <div
            key={level.id}
            className="level-card"
            style={{ backgroundColor: level.color }}
          >
            <h2>{level.name}</h2>
            <p>{level.description}</p>
            <button
              className="start-level-btn"
              onClick={() => onSelectLevel(level.id)} // This now passes "TIME_ATTACK"
            >
              Start 🚀
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LevelSelect;
