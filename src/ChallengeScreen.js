import React, { useState, useEffect } from "react";
import "./App.css";
import Confetti from "react-confetti";
import { motion } from "framer-motion";
import { useWindowSize } from "react-use";

function ChallengeScreen({ onGoToMenu, onGoToProgress, selectedLevel = 1 }) {
  const { width, height } = useWindowSize();

  const levels = {
    1: ["SUN", "CAT", "DOG", "BALL"],
    2: ["APPLE", "TIGER", "FLOWER", "BANANA"],
    3: [
      "THE CAT IS SLEEPING",
      "I LIKE ICE CREAM",
      "THE SUN IS BRIGHT",
      "DOGS LOVE BONES",
    ],
  };

  const [currentLevel, setCurrentLevel] = useState(selectedLevel);
  const [words, setWords] = useState(levels[selectedLevel]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState(words[0]);
  const [feedback, setFeedback] = useState("");
  const [encouragement, setEncouragement] = useState("");
  const [accuracyValue, setAccuracyValue] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showHearIt, setShowHearIt] = useState(false);
  const [isAfterHear, setIsAfterHear] = useState(false);
  const [stars, setStars] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  const encouragements = [
    "You’re doing great! Let’s try once more 💪",
    "Almost there — you’ve got this 🌟",
    "Keep going, I believe in you! 😊",
    "Nice effort! Let’s take it slow 💛",
  ];

  // 🎉 Confetti duration
  useEffect(() => {
    let timer;
    if (showConfetti) timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [showConfetti]);

  // 🧩 Reset level data when changed
  useEffect(() => {
    if (selectedLevel && levels[selectedLevel]) {
      setCurrentLevel(selectedLevel);
      setWords(levels[selectedLevel]);
      setCurrentIndex(0);
      setCurrentWord(levels[selectedLevel][0]);
      setFeedback("");
      setStars(0);
      setRetryCount(0);
    }
  }, [selectedLevel],levels);

  const saveProgress = (word, accuracy, level) => {
    const mastered = accuracy >= 80;
    const stored = JSON.parse(localStorage.getItem("vocalisProgress")) || [];
    const existingIndex = stored.findIndex((w) => w.word === word);
    const entry = { word, accuracy, mastered, level, date: new Date().toISOString() };

    if (existingIndex !== -1) stored[existingIndex] = entry;
    else stored.push(entry);

    localStorage.setItem("vocalisProgress", JSON.stringify(stored));
  };

  const computeAccuracy = (spoken, expected) => {
    spoken = spoken.toUpperCase().replace(/[^A-Z ]/g, "");
    expected = expected.toUpperCase().replace(/[^A-Z ]/g, "");
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
    try {
      const formData = new FormData();
    formData.append('audioBlob', audioBlob, 'speech.webm');
    formData.append('text', currentWord);

    // 1. Change the URL to your new backend server
    const res = await fetch("http://localhost:3001/api/check-speech", {
      method: "POST",
      // 2. Remove the Authorization header (the key is now on the server)
      body: formData,
      });
      const data = await res.json();
      const spoken = data.results.channels[0].alternatives[0].transcript || "";
      const conf = data.results.channels[0].alternatives[0].confidence || 0;
      const acc = computeAccuracy(spoken, currentWord);
      const overall = Math.round(conf * 50 + acc * 0.5);
      setAccuracyValue(overall);
      handleResult(overall);
    } catch {
      setFeedback("⚠️ Couldn’t analyze speech. Try again!");
    }
  };

  const handleMicClick = async () => {
    if (isRecording) return;
    setIsRecording(true);
    setFeedback(`🎙️ Listening... say "${currentWord}"`);
    setEncouragement("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setFeedback("Analyzing...");
        await sendToDeepgram(audioBlob);
        setIsRecording(false);
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 2000);
    } catch {
      setFeedback("🎤 Microphone not accessible.");
      setIsRecording(false);
    }
  };

  const handleResult = (acc) => {
    saveProgress(currentWord, acc, currentLevel);

    if (acc >= 80) {
      setFeedback("🌟 Excellent pronunciation!");
      setEncouragement("");
      setStars(3);
      setShowConfetti(true);
      setTimeout(() => nextWord(), 2500);
      return;
    }

    const newRetry = retryCount + 1;
    setRetryCount(newRetry);
    setStars(acc > 50 ? 2 : acc > 0 ? 1 : 0);
    setFeedback("💬 Try again!");
    setEncouragement(
      encouragements[Math.floor(Math.random() * encouragements.length)]
    );
    if (newRetry >= 2) {
      setFeedback("👂 Let’s listen together!");
      setShowHearIt(true);
    }
  };

  const nextWord = () => {
    const next = currentIndex + 1;
    if (next < words.length) {
      setCurrentIndex(next);
      setCurrentWord(words[next]);
    } else {
      // ✅ LEVEL COMPLETE
      if (currentLevel < 3) {
        setFeedback(`🏁 Level ${currentLevel} Complete! Loading next level...`);
        setShowConfetti(true);
        setTimeout(() => {
          const newLevel = currentLevel + 1;
          setCurrentLevel(newLevel);
          setWords(levels[newLevel]);
          setCurrentIndex(0);
          setCurrentWord(levels[newLevel][0]);
          setFeedback(`🎯 Welcome to Level ${newLevel}!`);
          setStars(0);
          setAccuracyValue(null);
        }, 2500);
      } else {
        // ✅ FINAL LEVEL COMPLETED
        setShowConfetti(true);
        setGameComplete(true);
        setFeedback("🏆 You’ve mastered all levels! Amazing job!");
      }
    }

    setRetryCount(0);
    setStars(0);
    setAccuracyValue(null);
    setShowHearIt(false);
    setIsAfterHear(false);
  };

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

  // 🏆 Final completion screen
  if (gameComplete) {
    return (
      <div className="App-header">
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            numberOfPieces={150}
            gravity={0.3}
            wind={0.01}
            recycle={false}
          />
        )}
        <h1>🏆 Congratulations!</h1>
        <p>You’ve mastered all levels in Vocalis!</p>
        <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
          <button className="next-btn" onClick={onGoToProgress}>
            📊 View My Progress
          </button>
          <button className="next-btn" onClick={onGoToMenu}>
            🏠 Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-wrapper">
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={150}
          gravity={0.3}
          wind={0.01}
          initialVelocityY={10}
          recycle={false}
          tweenDuration={6000}
        />
      )}

      <header className="App-header">
        <div className="top-bar">
          <button onClick={onGoToMenu} className="back-btn">
            ⬅ Back to Menu
          </button>
          <div className="level-header">
            <span>
              Level {currentLevel}:{" "}
              {currentLevel === 1
                ? "Small Words"
                : currentLevel === 2
                ? "Complex Words"
                : "Sentences"}
            </span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${((currentIndex + 1) / words.length) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <motion.div
          className="word-bubble"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          {currentWord}
        </motion.div>

        <div className="star-container">
          {[1, 2, 3].map((s) => (
            <span key={s} className={s <= stars ? "star active" : "star"}>
              ⭐
            </span>
          ))}
        </div>

        <button
          className="mic-btn"
          onClick={handleMicClick}
          disabled={isRecording}
        >
          {isRecording
            ? "🎙️ Listening..."
            : isAfterHear
            ? "🎙️ Try Again"
            : "🎙️ Speak"}
        </button>

        {showHearIt && (
          <motion.button
            onClick={handleHearIt}
            className="hear-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            👂 Hear It
          </motion.button>
        )}

        {feedback && (
          <motion.div
            className="feedback-banner"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {feedback}
          </motion.div>
        )}

        {encouragement && (
          <motion.p
            className="encouragement"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {encouragement}
          </motion.p>
        )}

        {accuracyValue !== null && (
          <motion.p
            className="accuracy subtle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Accuracy: {accuracyValue}%
          </motion.p>
        )}

        <button className="next-btn" onClick={nextWord}>
          Next ⏭️
        </button>
      </header>
    </div>
  );
}

export default ChallengeScreen;
