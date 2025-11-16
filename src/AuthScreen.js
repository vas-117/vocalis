// src/AuthScreen.js
import React, { useState } from "react";
import "./App.css";
import { motion } from "framer-motion"; // <-- 1. IMPORT MOTION

function AuthScreen({ onLogin }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("🦜");
  const [error, setError] = useState("");

  const avatars = ["🦜", "🐼", "🦊", "🐯", "🐸", "🐰", "🐻", "🐶", "🐧"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const url = isLoginMode 
      ? 'http://localhost:3001/api/auth/login'
      : 'http://localhost:3001/api/auth/signup';
      
    const body = isLoginMode
      ? { email, password }
      : { name, email, password, avatar };

    if (!email || !password || (!isLoginMode && !name)) {
      return setError("Please fill out all required fields.");
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      onLogin(data.user, data.token);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <header className="App-header" style={{paddingTop: '60px'}}> {/* <-- 2. ADD A LITTLE PADDING */}
      <h1>{isLoginMode ? "🗣️ Welcome Back!" : "🗣️ Create Your Profile"}</h1>
      <p>{isLoginMode ? "Log in to keep your streak alive!" : "Let’s create your speech buddy profile 💬"}</p>

      {/* 3. WRAP FORM AND BUTTON IN MOTION.DIV */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 150 }}
      >
        <form onSubmit={handleSubmit} className="profile-form">
          
          {!isLoginMode && (
            <>
              <div className="input-group">
                <label>Your Name:</label>
                <input
                  type="text"
                  value={name}
                  placeholder="Enter your name"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div className="input-group">
                <label>Choose Your Avatar:</label>
                <div className="avatar-grid">
                  {avatars.map((icon) => (
                    <span
                      key={icon}
                      className={`avatar-option ${avatar === icon ? "selected" : ""}`}
                      onClick={() => setAvatar(icon)}
                    >
                      {icon}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              placeholder="Enter your email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              placeholder="Enter your password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="auth-error-text">{error}</p>}

          <button type="submit" className="start-button">
            🚀 {isLoginMode ? "Log In" : "Sign Up"}
          </button>
        </form>
        
        <button 
          onClick={() => {
            setIsLoginMode(!isLoginMode);
            setError("");
          }}
          className="auth-toggle-btn" // <-- 4. ADDED A CLASS
        >
          {isLoginMode ? "Need an account? Sign Up" : "Already have an account? Log In"}
        </button>
      </motion.div>

    </header>
  );
}

export default AuthScreen;
