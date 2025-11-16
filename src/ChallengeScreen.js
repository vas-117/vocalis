// src/ChallengeScreen.js
import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import Confetti from "react-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useWindowSize } from "react-use";

function ChallengeScreen({ onGoToMenu, onGoToProgress, selectedLevel, token, onSelectLevel }) {
  const { width, height } = useWindowSize();
  const canvasRef = useRef(null);
  
  // --- States ---
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState("Loading...");
  
  const [levelName, setLevelName] = useState('');
  const [nextLevelId, setNextLevelId] = useState(null);
  const [nextLevelName, setNextLevelName] = useState(null);
  const [isLevelComplete, setIsLevelComplete] = useState(false);

  const [isTimeAttack, setIsTimeAttack] = useState(selectedLevel === "TIME_ATTACK");
  const [timer, setTimer] = useState(60);
  const [score, setScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [botPace] = useState(16);
  const [timeAttackOver, setTimeAttackOver] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [encouragement, setEncouragement] = useState("");
  const [accuracyValue, setAccuracyValue] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showHearIt, setShowHearIt] = useState(false);
  const [isAfterHear, setIsAfterHear] = useState(false);
  const [stars, setStars] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastRecordingURL, setLastRecordingURL] = useState(null);
  // --- End of States ---

  const encouragements = [
    "You’re doing great! Let’s try once more 💪",
    "Almost there — you’ve got this 🌟",
    "Keep going, I believe in you! 😊",
  ];

  const playSound = (type) => {
    const sounds = {
      success: new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3"),
      retry: new Audio("https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3"),
      complete: new Audio("https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"),
      combo: new Audio("https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"), 
    };

    if (sounds[type]) {
      sounds[type].volume = 0.5;
      sounds[type].play().catch((e) => console.warn("Audio play failed", e));
    }
  };
  
  // 🎵 VISUALIZER
  useEffect(() => {
    if (!mediaStream || !canvasRef.current) return;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(mediaStream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64; 
    source.connect(analyser);
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationId;
    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#ff7b00");
        gradient.addColorStop(1, "#ffd36b");
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
      }
    };
    draw();
    return () => {
      cancelAnimationFrame(animationId);
      if (audioCtx.state !== 'closed') audioCtx.close();
    };
  }, [mediaStream]);

  // 🎉 CONFETTI
  useEffect(() => {
    let timer;
    if (showConfetti) timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [showConfetti]);

  // --- LEVEL LOADING HOOK ---
  useEffect(() => {
    const setupLevel = async () => {
      // Reset all states
      setStars(0);
      setRetryCount(0);
      setCombo(0);
      setMaxCombo(0);
      setFeedback("");
      setScore(0);
      setTimer(60);
      setBotScore(0);
      setLastRecordingURL(null);
      setIsLevelComplete(false);
      setNextLevelId(null);
      setNextLevelName(null);
      
      if (selectedLevel === "PRACTICE_DECK") {
        setFeedback("Loading your practice words...");
        setIsTimeAttack(false);
        try {
          const res = await fetch('http://localhost:3001/api/progress/practice', {
             headers: { 'Authorization': `Bearer ${token}` }
          });
          const practiceWords = await res.json();
          
          if (!practiceWords || practiceWords.length === 0) {
            setFeedback("You've mastered all your words!");
            setWords([]);
            setCurrentWord("-");
            setIsLevelComplete(true); // Nothing to practice
          } else {
            setLevelName("Practice Deck");
            setWords(practiceWords);
            setCurrentIndex(0);
            setCurrentWord(practiceWords[0]);
            setFeedback("");
          }
        } catch (err) {
          console.error("Failed to fetch practice words", err);
          setFeedback("Error loading practice deck.");
        }
      } else if (isTimeAttack) {
         setFeedback("Get ready! Say the word!");
        try {
          const res = await fetch(`http://localhost:3001/api/level/TIME_ATTACK`);
          const data = await res.json();
          const timeAttackWords = data.words || [];
          setWords(timeAttackWords);
          setCurrentWord(timeAttackWords.length ? timeAttackWords[Math.floor(Math.random() * timeAttackWords.length)] : "No words");
          setLevelName("Time Attack");
        } catch (err) {
          console.error("Failed to fetch time attack words", err);
          setFeedback("Error loading game.");
        }
      } else {
        // --- NORMAL LEVEL LOGIC ---
        try {
          const res = await fetch(`http://localhost:3001/api/level/${selectedLevel}`);
          const levelData = await res.json();
          
          if (!levelData || !levelData.words || levelData.words.length === 0) {
            throw new Error("Level has no words");
          }
          
          setWords(levelData.words);
          setCurrentIndex(0);
          setCurrentWord(levelData.words[0]);
          setLevelName(levelData.name); 
          setNextLevelId(levelData.nextLevelId); 
          setNextLevelName(levelData.nextLevelName); 
          
        } catch (err) {
          console.error("Failed to fetch level words", err);
          setFeedback("Error loading level. Go back to menu.");
        }
      }
    };
    
    setupLevel();
  }, [selectedLevel, token, isTimeAttack]);


  // --- Timer useEffect ---
  useEffect(() => {
    if (!isTimeAttack || timeAttackOver) { return; }
    const interval = setInterval(() => {
      setBotScore((b) => b + botPace);
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setTimeAttackOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimeAttack, timeAttackOver, botPace]);

  // SAVE PROGRESS (Sends to DB)
  const saveProgress = async (word, accuracy) => {
    if (!token) return;
    const mastered = accuracy >= 80;
    const entry = {
      word,
      accuracy,
      mastered,
      level: selectedLevel, // Save the level ID (e.g., "animals-easy")
      date: new Date().toISOString()
    };

    try {
      const res = await fetch("http://localhost:3001/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(entry),
      });
      if (!res.ok) console.error("Progress save failed:", await res.text());
    } catch (err) {
      console.error("Error saving progress:", err);
    }
  };

  // --- (computeAccuracy, sendToDeepgram, handleMicClick) ---
  const computeAccuracy = (spoken, expected) => {
    spoken = (spoken || "").toUpperCase().replace(/[^A-Z ]/g, "");
    expected = (expected || "").toUpperCase().replace(/[^A-Z ]/g, "");
    if (!spoken) return 0;
    if (spoken === expected) return 100;
    let match = 0;
    const len = Math.max(spoken.length, expected.length);
    for (let i = 0; i < expected.length; i++) if (spoken[i] === expected[i]) match++;
    const raw = Math.round((match / len) * 100);
    if (raw >= 70 && Math.abs(spoken.length - expected.length) <= 1)
      return Math.min(100, raw + 20);
    return raw;
  };

  const sendToDeepgram = async (audioBlob) => {
    if (timeAttackOver) return; 
    try {
      const formData = new FormData();
      formData.append('audioBlob', audioBlob, 'speech.webm');
      formData.append('text', currentWord);
      const res = await fetch("http://localhost:3001/api/check-speech", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const alt = (data && data.results && data.results.channels && data.results.channels[0] && data.results.channels[0].alternatives && data.results.channels[0].alternatives[0]) || {};
      const spoken = alt.transcript || "";
      const conf = typeof alt.confidence === "number" ? alt.confidence : 0;
      const acc = computeAccuracy(spoken, currentWord);
      const overall = Math.round(conf * 50 + acc * 0.5);
      setAccuracyValue(overall);
      handleResult(overall);
    } catch (err) {
      console.error("Deepgram error", err);
      setFeedback("⚠️ Error. Try again!");
    }
  };

  const handleMicClick = async () => {
    if (isRecording || timeAttackOver || words.length === 0 || isLevelComplete) return;
    setIsRecording(true);
    setFeedback(`🎙️ Listening... say "${currentWord}"`);
    setEncouragement("");
    setLastRecordingURL(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setLastRecordingURL(audioUrl);
        stream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
        setFeedback("Analyzing...");
        await sendToDeepgram(audioBlob);
        setIsRecording(false);
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 2000);
    } catch (err) {
      console.error("Mic access error", err);
      setFeedback("🎤 Microphone not accessible.");
      setIsRecording(false);
    }
  };

  // --- handleResult Function ---
  const handleResult = (acc) => {
    if (timeAttackOver) return; 
    
    if (acc >= 80) {
      // CORRECT
      playSound("success");
      setFeedback("🌟 Great!");
      setStars(3);
      
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo((prev) => Math.max(prev, newCombo));
      if (isTimeAttack) setScore((s) => s + 100 + newCombo * 10);
      
      saveProgress(currentWord, acc);

      if (isTimeAttack) {
        setTimer((t) => t + 2);
        setTimeout(loadNextWord, 400);
      } else {
        setEncouragement("");
        setShowConfetti(true);
        setTimeout(() => nextWord(), 2500); 
      }
      
    } else {
      // WRONG
      playSound("retry");
      setFeedback("💬 Try again!");
      setStars(acc > 50 ? 2 : acc > 0 ? 1 : 0);
      setCombo(0); 
      saveProgress(currentWord, acc);

      if (isTimeAttack) {
        setTimeout(loadNextWord, 800);
      } else {
        const newRetry = retryCount + 1;
        setRetryCount(newRetry);
        setEncouragement(encouragements[Math.floor(Math.random() * encouragements.length)]);
        if (newRetry >= 2) {
          setFeedback("👂 Let’s listen together!");
          setShowHearIt(true);
        }
      }
    }
  };

  // --- loadNextWord (For Time Attack) ---
  const loadNextWord = () => {
    if (timeAttackOver) return;
    const next = words.length ? words[Math.floor(Math.random() * words.length)] : "No words";
    setCurrentWord(next);
    setFeedback("Say: " + next);
    setStars(0);
    setAccuracyValue(null);
    setLastRecordingURL(null);
  };

  // --- nextWord FUNCTION (for Normal Mode) ---
  const nextWord = () => {
    const next = currentIndex + 1;
    
    if (next < words.length) {
      // 1. More words in this level
      setCurrentIndex(next);
      setCurrentWord(words[next]);
    } else {
      // 2. Last word in the level
      playSound("complete");
      setShowConfetti(true);
      setIsLevelComplete(true); // This will show the new buttons
      
      // THIS IS THE CORRECTED LOGIC from your database screenshot
      if (nextLevelId && nextLevelId !== "null" && nextLevelName && nextLevelName !== "null") {
        setFeedback(`🏁 Level Complete!`);
      } else if (selectedLevel === "PRACTICE_DECK") {
        setFeedback("🏆 Practice complete! Great job!");
      } else {
        setFeedback("🏆 You’ve mastered this series! Amazing job!");
      }
    }
    
    // Reset for the next word (or for the end screen)
    setRetryCount(0);
    setStars(0);
    setAccuracyValue(null);
    setShowHearIt(false);
    setIsAfterHear(false);
    setLastRecordingURL(null);
  };

  // --- handleHearIt function ---
  const handleHearIt = () => {
    const utter = new SpeechSynthesisUtterance(currentWord);
    utter.rate = 0.55;
    utter.pitch = 0.9;
    utter.lang = "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
    setFeedback("🔊 Listen carefully...");
    setIsAfterHear(true);
  };

  // --- Time Attack Game Over screen ---
  if (timeAttackOver) {
    const didWin = score > botScore;
    return (
      <div className="App-header">
        {didWin ? (
          <h1 style={{ color: '#00c896' }}>🎉 You Win! 🎉</h1>
        ) : (
          <h1 style={{ color: '#d90429' }}>🤖 Try Again!</h1>
        )}
        <p style={{ fontSize: '1.5rem', margin: '10px' }}>Your Final Score:</p>
        <div style={{ fontSize: '4rem', fontWeight: 'bold', color: didWin ? '#00c896' : '#333' }}>
          {score}
        </div>
        <p style={{ fontSize: '1.2rem' }}>Bot's Score: {botScore}</p>
        <p>You got a {maxCombo}-word combo!</p>
        <button className="next-btn" onClick={onGoToMenu} style={{ marginTop: "30px" }}>
          🏠 Back to Menu
        </button>
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="game-wrapper">
      {showConfetti && !isTimeAttack && <Confetti width={width} height={height} numberOfPieces={150} gravity={0.3} tweenDuration={6000} recycle={false} />}
      
      <header className="App-header">
        <div className="top-bar">
          <button onClick={onGoToMenu} className="back-btn">
            ⬅ Back
          </button>

          {isTimeAttack ? (
            <div className="time-attack-hud">
              <div>Your Score: <span>{score}</span></div>
              <div>Time: <span>{timer}s</span></div>
            </div>
          ) : (
            <div className="level-header">
              <span>{levelName}</span> 
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: isLevelComplete ? "100%" : (words.length > 0 ? `${((currentIndex + 1) / words.length) * 100}%` : "0%"),
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* --- BUTTON & CONTENT LOGIC CONTAINER --- */}
        <div className="button-controls-container" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
          
          {/* --- A) While level is IN PROGRESS --- */}
          {!isLevelComplete && !isTimeAttack && (
            <>
              <motion.div className="word-bubble" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                {currentWord}
              </motion.div>

              <div style={{ height: "40px", marginBottom: "10px" }}>
                <AnimatePresence>
                  {combo >= 2 && ( 
                    <motion.div
                      key={combo}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        color: "#ff4757",
                        textShadow: "0 2px 10px rgba(255, 71, 87, 0.4)",
                        background: "#fff0f1",
                        padding: "5px 20px",
                        borderRadius: "20px",
                        border: "2px solid #ff4757",
                      }}
                    >
                      🔥 COMBO x{combo}!
                    </motion.div> 
                  )}
                </AnimatePresence>
              </div>

              <div className="star-container">
                {[1, 2, 3].map((s) => ( <span key={s} className={s <= stars ? "star active" : "star"}>⭐</span> ))}
              </div>
              
              {isRecording && <canvas ref={canvasRef} width={200} height={60} style={{ margin: "10px 0" }} />}
              
              <button className="mic-btn" onClick={handleMicClick} disabled={isRecording || words.length === 0}>
                {isRecording ? "🛑 Recording..." : isAfterHear ? "🎙️ Try Again" : "🎙️ Speak"}
              </button>
              
              <div className="button-row" style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
                {showHearIt && ( <motion.button onClick={handleHearIt} className="hear-btn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>👂 Hear It</motion.button> )}
                {lastRecordingURL && ( <motion.button onClick={() => new Audio(lastRecordingURL).play()} className="playback-btn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>🎧 Play My Audio</motion.button> )}
              </div>
              
              {feedback && <motion.div className="feedback-banner" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>{feedback}</motion.div>}
              {encouragement && <motion.p className="encouragement" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{encouragement}</motion.p>}
              {accuracyValue !== null && <motion.p className="accuracy subtle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Accuracy: {accuracyValue}%</motion.p>}
              
              {!isRecording && !showHearIt && (
                <button className="next-btn" onClick={nextWord}>Next ⏭️</button>
              )}
            </>
          )}

          {/* --- B) When level is COMPLETE --- */}
          {isLevelComplete && !isTimeAttack && (
            <>
              {feedback && <motion.div className="feedback-banner" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{fontSize: '1.5rem', padding: '20px', margin: '50px 0'}}>{feedback}</motion.div>}
              
              {/* --- THIS IS THE FINAL FIX --- */}
              <motion.div 
                style={{ display: 'flex', gap: '15px', marginTop: '20px' }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {/* THIS IS THE FIX:
                  It now checks if nextLevelId and nextLevelName are "truthy" 
                  AND that they are not equal to the string "null".
                  This will correctly show "Back to Menu" when the level ends.
                */}
                {nextLevelId && nextLevelId !== "null" && nextLevelName && nextLevelName !== "null" ? (
                  <button 
                    className="next-btn" 
                    onClick={() => onSelectLevel(nextLevelId)} 
                    style={{ background: "#007cff" }}
                  >
                    Go to {nextLevelName} 🚀
                  </button>
                ) : (
                  <button className="next-btn" onClick={onGoToMenu} style={{background: "#ffb84d"}}>
                    ⬅ Back to Menu
                  </button>
                )}

                {/* Button 2: Always show "View My Progress" */}
                <button className="next-btn" onClick={onGoToProgress} style={{ background: "#00c896" }}>
                  View My Progress 📊
                </button>
              </motion.div>
              {/* --- END OF FINAL FIX --- */}
            </>
          )}
          
        </div>

      </header>
    </div>
  );
}

export default ChallengeScreen;
