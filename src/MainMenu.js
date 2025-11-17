// src/MainMenu.js
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

function MainMenu({ user, onStartChallenge, onShowProgress, token, onLogout, onShowLeaderboard }) {
  const [stats, setStats] = useState({ streak: 0, xp: 0 });

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/progress", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (res.ok) {
          const progressArray = data.progress || [];
          const masteredCount = progressArray.filter((w) => w.mastered).length;

          setStats({
            streak: data.streak || 0,
            xp: masteredCount * 100,
          });
        } else {
          throw new Error(data.error || "Failed to fetch stats");
        }
      } catch (err) {
        console.error("Failed to fetch progress", err);
        setStats({ streak: 0, xp: 0 });
      }
    };

    if (token) fetchProgress();
  }, [token]);
    
  return (
    <div className="mainmenu-container">

      {/* Animated Balloons */}
      <div className="balloon balloon1"><div className="balloon-string"></div></div>
      <div className="balloon balloon2"><div className="balloon-string"></div></div>
      <div className="balloon balloon3"><div className="balloon-string"></div></div>


      {/* Stats Card */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120 }}
        className="stats-card"
      >
        <div className="stat-item">
          <span className="stat-emoji">🔥</span>
          <span>{stats.streak} Days</span>
        </div>

        <div className="divider"></div>

        <div className="stat-item">
          <span className="stat-emoji">✨</span>
          <span className="xp-text">{stats.xp} XP</span>
        </div>
      </motion.div>

      {/* Greeting */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="menu-greeting"
      >
        <h1 className="menu-title">
          Hi, {user?.name}!
        </h1>
        <div className="menu-avatar">{user?.avatar}</div>
        <p className="menu-subtitle">What would you like to do today?</p>
      </motion.div>

      {/* Buttons */}
      <div className="menu-buttons">
        <motion.button
          className="menu-btn play-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStartChallenge} 
        >
          🎤 Start Speaking Game
        </motion.button>

        <motion.button
          className="menu-btn leaderboard-btn" 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onShowLeaderboard}
        >
          🏆 Leaderboard
        </motion.button>

        <motion.button
          className="menu-btn progress-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onShowProgress}
        >
          📊 My Progress
        </motion.button>
      </div>

      <button className="logout-btn" onClick={onLogout}>
        Log Out
      </button>
    </div>
  );
}

export default MainMenu;
