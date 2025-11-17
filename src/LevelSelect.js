// src/LevelSelect.js
import React, { useState, useEffect } from "react";
import "./App.css";

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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
  categorySelectorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    width: '100%',
    maxWidth: '800px',
    margin: '20px 0',
  },
  categorySquare: {
    height: '200px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    borderRadius: '15px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    color: 'white',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
  },
  categoryEmoji: {
    fontSize: '3rem',
    marginBottom: '10px',
  },
  // NEW STYLE: Forcing the special mode cards to be flexible and equal width
  specialModeCardStyle: {
    flex: '1 1 0', // flex-grow: 1, flex-shrink: 1, flex-basis: 0
    minWidth: '200px' // Ensure they don't get too small
  }
};

// CATEGORY DEFINITIONS FOR THE MAIN SELECTOR
const categories = [
    { name: 'Animals', emoji: '🦁', slug: 'animals', color: '#6be07d' },
    { name: 'School', emoji: '📚', slug: 'school', color: '#ffb84d' },
    { name: 'Family', emoji: '👨‍👩‍👧‍👦', slug: 'family', color: '#007cff' },
];


function LevelSelect({ onSelectLevel, onGoToMenu, onSelectCategory, selectedCategory, onGoToCategorySelect }) {
  const [groupedLevels, setGroupedLevels] = useState({});
  const [specialLevels, setSpecialLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLevels = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('http://localhost:3001/api/levels');
        const data = await res.json();
        
        const groups = {};
        const special = [];

        for (const level of data) {
          if (level.id.includes('-')) {
            const [theme, difficulty] = level.id.split('-'); 
            if (!groups[theme]) {
              groups[theme] = []; 
            }
            groups[theme].push({ ...level, difficulty });
          } else {
            special.push(level);
          }
        }
        
        setGroupedLevels(groups);
        setSpecialLevels(special);
        setIsLoading(false);

      } catch (err) {
        console.error("Failed to fetch levels", err);
        setIsLoading(false);
      }
    };
    fetchLevels();
  }, []);


  if (isLoading) {
    return (
      <div className="App-header" style={{ justifyContent: 'center' }}>
        <h1>Loading Challenges...</h1>
      </div>
    );
  }
  
  // --- VIEW 1: CATEGORY SELECTION MODE (selectedCategory is null) ---
  if (!selectedCategory) {
    return (
      <div className="App-header" style={{ justifyContent: 'flex-start', paddingTop: '80px' }}>
        {/* Back button goes to the Main Menu */}
        <button onClick={onGoToMenu} className="back-btn">⬅ Back to Menu</button> 
        <h1 style={{ marginTop: '0', marginBottom: '30px' }}>Choose a Challenge Category</h1>
        
        {/* Category Squares (Animals, School, Family) */}
        <div style={styles.categorySelectorGrid}>
            {categories.map((cat) => (
                <div
                    key={cat.slug}
                    style={{ ...styles.categorySquare, backgroundColor: cat.color }}
                    onClick={() => onSelectCategory(cat.slug)}
                >
                    <span style={styles.categoryEmoji} role="img" aria-label={cat.name}>
                        {cat.emoji}
                    </span>
                    {cat.name}
                </div>
            ))}
        </div>

        {/* Special Modes (Time Attack, Practice Deck) */}
        <div style={{...styles.packContainer, marginTop: '30px', maxWidth: '800px'}}>
            <h2 style={styles.packTitle}>⭐ Special Modes</h2>
            <div style={styles.difficultyGrid}>
                {specialLevels.map((level) => (
                    <div
                        key={level.id}
                        className="level-card"
                        // COMBINE STYLES: Force cards to be equal width and side-by-side
                        style={{ ...styles.specialModeCardStyle, backgroundColor: level.color || '#DDD' }} 
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
                
                {/* Personalized Practice */}
                <div
                    className="level-card"
                    // COMBINE STYLES: Force cards to be equal width and side-by-side
                    style={{ ...styles.specialModeCardStyle, backgroundColor: "#00c896" }} 
                >
                    <h3>📖 Personalized Practice</h3>
                    <p>Your "Practice Later" words.</p>
                    <button
                        className="start-level-btn"
                        onClick={() => onSelectLevel("PRACTICE_DECK")} 
                    >
                        Start 🚀
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- VIEW 2: LEVEL SELECTION MODE (Category is selected) ---
  
  const levelsToDisplay = groupedLevels[selectedCategory] || [];
  const pageTitle = `${capitalize(selectedCategory)} Levels`;

  return (
    <div className="App-header" style={{ justifyContent: 'flex-start', paddingTop: '80px' }}>
      {/* Back button goes to the Category Selection View */}
      <button onClick={onGoToCategorySelect} className="back-btn">⬅ Back to Categories</button>
      <h1 style={{ marginTop: '0' }}>{pageTitle}</h1>
      
      {/* RENDER THE FILTERED LEVELS */}
      <div style={styles.packContainer}>
          <h2 style={styles.packTitle}>Select Your Difficulty</h2>
          <div style={styles.difficultyGrid}>
            {levelsToDisplay
             .sort((a, b) => {
                const order = { 'easy': 1, 'medium': 2, 'hard': 3 };
                return order[a.difficulty] - order[b.difficulty];
             })
             .map((level, index) => (
              <div
                key={level.id}
                className="level-card"
                // Kept existing level card width for difficulty levels
                style={{ backgroundColor: level.color || '#DDD', width: '250px' }} 
              >
                {/* Display as Level 1, Level 2, Level 3 */}
                <h3>{`Level ${index + 1}`}</h3> 
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
    </div>
  );
}

export default LevelSelect;
