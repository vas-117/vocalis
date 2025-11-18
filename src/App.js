// src/App.js
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import AuthScreen from "./AuthScreen"; 
import MainMenu from "./MainMenu";
import ChallengeScreen from "./ChallengeScreen";
import ProgressScreen from "./ProgressScreen";
import LevelSelect from "./LevelSelect";
import LeaderboardScreen from "./LeaderboardScreen"; 
import AchievementScreen from "./AchievementScreen"; // <-- NEW IMPORT

function App() {
  const [currentScreen, setCurrentScreen] = useState("AUTH"); 
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); 
  const [selectedCategory, setSelectedCategory] = useState(null); 
  const [selectedLevel, setSelectedLevel] = useState(1);

  // This cleans up old localStorage data on first load
  useEffect(() => {
    localStorage.removeItem("vocalisUser");
    localStorage.removeItem("vocalisToken");
  }, []);

  // This function is passed to AuthScreen.js
  const handleLogin = (userObject, authToken) => {
    setUser(userObject);
    setToken(authToken);
    localStorage.setItem("vocalisUser", JSON.stringify(userObject));
    localStorage.setItem("vocalisToken", authToken); 
    setCurrentScreen("MENU");
  };

  // HANDLER: Starts the game, goes to the Category Select view
  const handleStartChallenge = () => {
    setSelectedCategory(null);
    setCurrentScreen("LEVEL_SELECT");
  }
  
  // HANDLER: Moves from Categories view to the specific Levels view
  const handleSelectCategory = (categoryName) => {
      setSelectedCategory(categoryName); 
      setCurrentScreen("LEVEL_SELECT"); 
  };
  
  const handleShowProgress = () => setCurrentScreen("PROGRESS");
  
  // HANDLER: Back button for the main menu (used by Category Select view)
  const handleGoToMenu = () => {
      setSelectedCategory(null); 
      setCurrentScreen("MENU");
  }
  
  // HANDLER: Back button from Levels View to Category Select View
  const handleGoToCategorySelect = () => {
      setSelectedCategory(null); 
      setCurrentScreen("LEVEL_SELECT"); 
  }
  
  // NEW HANDLER: Back button from Challenge Screen to the specific Levels View (FIX)
  const handleGoBackToLevels = () => {
      // Keep selectedCategory state intact so LevelSelect renders Levels 1, 2, 3
      setCurrentScreen("LEVEL_SELECT"); 
  }
  
  const handleShowLeaderboard = () => setCurrentScreen("LEADERBOARD"); 

  // --- NEW HANDLER ---
  const handleShowAchievements = () => setCurrentScreen("ACHIEVEMENTS");
  // --- END NEW HANDLER ---
  
  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("vocalisUser");
    localStorage.removeItem("vocalisToken");
    setCurrentScreen("AUTH");
  };

  const handleSelectLevel = (levelId) => {
    setSelectedLevel(levelId);
    setCurrentScreen("CHALLENGE");
  };

  const pageTransition = {
    type: "spring",
    stiffness: 300, 
    damping: 25     
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  };

  return (
    <div className="App">
      <AnimatePresence mode="wait">
        
        {currentScreen === "AUTH" && (
          <motion.div key="auth" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ width: '100%', position: 'absolute' }}>
            <AuthScreen onLogin={handleLogin} />
          </motion.div>
        )}

        {currentScreen === "MENU" && (
          <motion.div key="menu" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ width: '100%', position: 'absolute' }}>
            <MainMenu
              user={user}
              token={token}
              onStartChallenge={handleStartChallenge} 
              onShowProgress={handleShowProgress}
              onShowLeaderboard={handleShowLeaderboard}
              onShowAchievements={handleShowAchievements} // <-- NEW PROP
              onLogout={handleLogout}
            />
          </motion.div>
        )}

        {currentScreen === "LEVEL_SELECT" && (
          <motion.div key="level" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ width: '100%', position: 'absolute' }}>
            <LevelSelect
              onSelectLevel={handleSelectLevel}
              onGoToMenu={handleGoToMenu}
              onGoToCategorySelect={handleGoToCategorySelect} 
              onSelectCategory={handleSelectCategory} 
              selectedCategory={selectedCategory} 
            />
          </motion.div>
        )}

        {currentScreen === "CHALLENGE" && (
          <motion.div key="challenge" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ width: '100%', position: 'absolute' }}>
            <ChallengeScreen
              token={token}
              // PROP CHANGE: Use the new handler to go back to the specific levels view
              onGoToMenu={handleGoBackToLevels} 
              onGoToProgress={handleShowProgress}
              onShowLeaderboard={handleShowLeaderboard} 
              selectedLevel={selectedLevel}
              onSelectLevel={handleSelectLevel} 
            />
          </motion.div>
        )}
        
        {currentScreen === "PROGRESS" && (
          <motion.div key="progress" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ width: '100%', position: 'absolute' }}>
            <ProgressScreen 
              token={token}
              onGoToMenu={handleGoToMenu} 
            />
          </motion.div>
        )}

        {currentScreen === "LEADERBOARD" && (
          <motion.div key="leaderboard" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ width: '100%', position: 'absolute' }}>
            <LeaderboardScreen
              onGoToMenu={handleGoToMenu} 
            />
          </motion.div>
        )}

        {/* --- NEW SCREEN --- */}
        {currentScreen === "ACHIEVEMENTS" && (
          <motion.div key="achievements" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ width: '100%', position: 'absolute' }}>
            <AchievementScreen 
              token={token}
              onGoToMenu={handleGoToMenu} 
            />
          </motion.div>
        )}
        {/* --- END NEW SCREEN --- */}

      </AnimatePresence>
    </div>
  );
}

export default App;
