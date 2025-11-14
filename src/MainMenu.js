import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion'; 

function MainMenu({ user, onStartChallenge, onShowProgress }) {
  const [stats, setStats] = useState({ streak: 1, xp: 0 });

  useEffect(() => {
    // 1. Get progress from local storage
    const stored = JSON.parse(localStorage.getItem("vocalisProgress")) || [];
    
    // 2. Calculate XP (100 points for every mastered word)
    const masteredCount = stored.filter(w => w.mastered).length;
    
    // 3. Set Stats (Hardcoding streak to 3 for the Hackathon Demo effect!)
    setStats({ 
      streak: 3, 
      xp: masteredCount * 100 
    }); 
  }, []);

  return (
    <header className="App-header">
      {/* 🏆 FLOATY STATS CARD */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120 }}
        style={{ 
          position: 'absolute', 
          top: 20, 
          right: 20, 
          background: 'white', 
          padding: '10px 20px', 
          borderRadius: '15px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', 
          alignItems: 'center',
          gap: '15px', 
          color: '#333',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '1.5rem' }}>🔥</span> 
          <span>{stats.streak} Days</span>
        </div>
        
        <div style={{ width: '1px', height: '25px', background: '#ddd' }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '1.5rem' }}>💎</span> 
          <span style={{ color: '#00c896' }}>{stats.xp} XP</span>
        </div>
      </motion.div>

      {/* 👋 GREETING */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 style={{ marginBottom: '10px' }}>
          Hi, {user?.name}! <span style={{ fontSize: '3.5rem', display: 'block', marginTop: '10px' }}>{user?.avatar}</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#555', marginBottom: '40px' }}>
          Ready to keep your streak alive?
        </p>
      </motion.div>
      
      {/* 🔘 BIG BUTTONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '320px' }}>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStartChallenge}
          style={{ 
            fontSize: '22px', 
            padding: '20px', 
            border: 'none', 
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #ff7b00 0%, #ffb84d 100%)', 
            color: 'white', 
            fontWeight: 'bold',
            boxShadow: '0 10px 25px rgba(255, 123, 0, 0.3)',
            cursor: 'pointer'
          }}
        >
          🎯 Start Challenge
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.05, backgroundColor: '#f8f9fa' }}
          whileTap={{ scale: 0.95 }}
          onClick={onShowProgress}
          style={{ 
            fontSize: '22px', 
            padding: '20px', 
            border: '2px solid #eee', 
            borderRadius: '20px',
            background: 'white', 
            color: '#444', 
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          📊 My Stats
        </motion.button>
      </div>
    </header>
  );
}

export default MainMenu;
