// src/ChallengeScreen.js
import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import Confetti from "react-confetti";
import { motion } from "framer-motion";
import { useWindowSize } from "react-use";

function ChallengeScreen({
  onGoToMenu,
  onGoToProgress,
  selectedLevel,
  token,
  onSelectLevel,
  onShowLeaderboard
}) {
  const { width, height } = useWindowSize();
  const canvasRef = useRef(null);

  // ------------------ STATE ------------------
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState("Loading...");

  const [isPictureRound, setIsPictureRound] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);

  const [levelName, setLevelName] = useState("");
  const [nextLevelId, setNextLevelId] = useState(null);
  const [nextLevelName, setNextLevelName] = useState(null);
  const [isLevelComplete, setIsLevelComplete] = useState(false);

  const [isTimeAttack] = useState(selectedLevel === "TIME_ATTACK");
  const [timer, setTimer] = useState(60);
  const [score, setScore] = useState(0);
  const [botScore] = useState(0);

  const [timeAttackOver, setTimeAttackOver] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [accuracyValue, setAccuracyValue] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showHearIt, setShowHearIt] = useState(false);
  const [lastRecordingURL, setLastRecordingURL] = useState(null);
  const [stars, setStars] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const [mediaStream, setMediaStream] = useState(null);

  // ------------------ SAFE WORD/IMAGE HANDLER ------------------
  const setWordData = (wordData) => {
    if (typeof wordData === "object" && wordData !== null && wordData.image) {
      setIsPictureRound(true);
      setCurrentWord(wordData.text || "");
      setCurrentImageUrl(wordData.image);
      return;
    }

    setIsPictureRound(false);
    setCurrentImageUrl(null);
    setCurrentWord(typeof wordData === "string" ? wordData : "");
  };

  // ------------------ LEVEL SETUP ------------------
  useEffect(() => {
    const loadLevel = async () => {
      setStars(0);
      setFeedback("");
      setRetryCount(0);
      setIsCorrect(false);
      setLastRecordingURL(null);

      try {
        const res = await fetch(`http://localhost:3001/api/level/${selectedLevel}`);
        const data = await res.json();

        setWords(data.words);
        setCurrentIndex(0);
        setWordData(data.words[0]);

        setLevelName(data.name);
        setNextLevelId(data.nextLevelId);
        setNextLevelName(data.nextLevelName);
      } catch {
        setFeedback("Error loading level");
      }
    };

    loadLevel();
  }, [selectedLevel, token]);

  // ------------------ AUDIO VISUALIZER ------------------
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

      let x = 0;
      const barWidth = (canvas.width / bufferLength) * 2.4;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;

        ctx.fillStyle = "#ffb84d";
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 2;
      }
    };

    draw();
    return () => {
      cancelAnimationFrame(animationId);
      audioCtx.close();
    };
  }, [mediaStream]);

  // ------------------ CONFETTI TIMER ------------------
  useEffect(() => {
    if (!showConfetti) return;
    const t = setTimeout(() => setShowConfetti(false), 2500);
    return () => clearTimeout(t);
  }, [showConfetti]);

  // ------------------ ACCURACY FUNCTION ------------------
  const computeAccuracy = (spoken, expected) => {
    spoken = (spoken || "").toUpperCase().replace(/[^A-Z ]/g, "");
    expected = (expected || "").toUpperCase().replace(/[^A-Z ]/g, "");

    if (!spoken) return 0;
    if (spoken === expected) return 100;

    let match = 0;
    for (let i = 0; i < expected.length; i++) {
      if (spoken[i] === expected[i]) match++;
    }
    return Math.round((match / expected.length) * 100);
  };

  // ------------------ DEEPGRAM ------------------
  const sendToDeepgram = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append("audioBlob", audioBlob);
      formData.append("text", currentWord);

      const res = await fetch("http://localhost:3001/api/check-speech", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      const spoken =
        data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

      const acc = computeAccuracy(spoken, currentWord);

      setAccuracyValue(acc);
      handleResult(acc);
    } catch {
      setFeedback("Error analyzing speech");
    }
  };

  // ------------------ MIC HANDLER ------------------
  const handleMicClick = async () => {
    if (isRecording || isLevelComplete) return;

    setIsRecording(true);
    setFeedback("🎙️ Listening...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);

      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setLastRecordingURL(URL.createObjectURL(blob));

        stream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);

        setFeedback("Analyzing...");
        await sendToDeepgram(blob);
        setIsRecording(false);
      };

      recorder.start();
      setTimeout(() => recorder.stop(), 2000);
    } catch {
      setFeedback("Mic error");
      setIsRecording(false);
    }
  };

  // ------------------ HANDLE RESULT ------------------
const handleResult = (acc) => {
  if (acc >= 80) {
    // Correct answer
    setIsCorrect(true);
    setFeedback("🌟 Amazing!");
    setStars(3);
    setShowConfetti(true);

    // Reset retries & hide Hear It
    setRetryCount(0);
    setShowHearIt(false);

    setTimeout(nextWord, 1500);
  } else {
    // Wrong answer
    setIsCorrect(false);
    setStars(acc > 50 ? 2 : acc > 0 ? 1 : 0);
    setFeedback("Try again!");

    // Increase wrong attempt count
    const newRetries = retryCount + 1;
    setRetryCount(newRetries);

    console.log("Retries:", newRetries); // DEBUG

    // Show Hear It only AFTER 3 wrong attempts
    if (newRetries >= 3) {
      setShowHearIt(true);
    }
  }
};

  // ------------------ NEXT WORD ------------------
const nextWord = () => {
  const next = currentIndex + 1;

  if (next < words.length) {
    setCurrentIndex(next);
    setWordData(words[next]);
  } else {
    setIsLevelComplete(true);
    setFeedback("🏆 Level Complete!");
  }

  // RESET everything correctly
  setAccuracyValue(null);
  setIsCorrect(false);
  setStars(0);
  setRetryCount(0);
  setShowHearIt(false);   // 🔥 IMPORTANT FIX
};


  // ------------------ HEAR IT ------------------
  const handleHearIt = () => {
    const u = new SpeechSynthesisUtterance(currentWord);
    u.rate = 0.6;
    speechSynthesis.speak(u);
  };

  // ------------------ TIME ATTACK END ------------------
  if (timeAttackOver) {
    return (
      <div className="App-header">
        <h1>You Win!</h1>
        <button className="next-btn" onClick={onGoToMenu}>
          Back
        </button>
      </div>
    );
  }

  // ------------------ MAIN UI ------------------
  return (
    <div className="App-header">
      {showConfetti && <Confetti width={width} height={height} />}

      {/* ------------ TOP BAR ------------ */}
      <button onClick={onGoToMenu} className="back-btn">
        ⬅ Back
      </button>

      <div className="level-header">
        <span>{levelName}</span>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width:
                words.length > 0
                  ? `${((currentIndex + 1) / words.length) * 100}%`
                  : "0%"
            }}
          ></div>
        </div>
      </div>

      {/* ------------ SPLIT LAYOUT ------------ */}
      <div className="challenge-content">
        {/* ------------ LEFT SIDE ------------ */}
        <div className="challenge-left">
          {/* Word Bubble */}
          <motion.div
            className="word-bubble"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {currentWord}
          </motion.div>

          {/* Stars */}
          <div className="star-container">
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? "star active" : "star"}>
                ⭐
              </span>
            ))}
          </div>

          {/* Visualizer */}
          {isRecording && (
            <canvas
              ref={canvasRef}
              width={200}
              height={60}
              style={{ marginTop: "10px" }}
            />
          )}

          {/* Speak */}
          <button className="mic-btn" onClick={handleMicClick}>
            {isRecording ? "🎙️ Recording..." : "🎙️ Speak"}
          </button>

          {/* Hear + Playback */}
<div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
  
  {/* Hear It — only after 3 wrong tries */}
  {showHearIt && (
    <button className="hear-btn" onClick={handleHearIt}>
      👂 Hear It
    </button>
  )}

  {/* Playback */}
  {lastRecordingURL && (
    <button
      className="playback-btn"
      onClick={() => new Audio(lastRecordingURL).play()}
    >
      🎧 Your Audio
    </button>
  )}
</div>



          {/* Feedback */}
          {feedback && <div className="feedback-banner">{feedback}</div>}

          {accuracyValue !== null && (
            <p className="accuracy subtle">Accuracy: {accuracyValue}%</p>
          )}

          {/* NEXT */}
          {!isLevelComplete && (
            <button className="next-btn" onClick={nextWord}>
              Next ⏭️
            </button>
          )}
        </div>

        {/* ------------ RIGHT SIDE (IMAGE) ------------ */}
        <div className="challenge-right">
          {isPictureRound && currentImageUrl && (
            <motion.img
              key={currentImageUrl}
              src={currentImageUrl}
              alt="pic"
              className="picture-right-image"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={
                isCorrect
                  ? { scale: [1, 1.2, 1], opacity: 1 }
                  : { scale: 1, opacity: 1 }
              }
              transition={{ duration: 0.5 }}
            />
          )}
        </div>
      </div>

      {/* ------------ LEVEL COMPLETE ------------ */}
      {isLevelComplete && (
        <div style={{ marginTop: "30px" }}>
          <h2>{feedback}</h2>

          {nextLevelId ? (
            <button
              className="next-btn"
              onClick={() => onSelectLevel(nextLevelId)}
            >
              Go to {nextLevelName} 🚀
            </button>
          ) : (
            <button className="next-btn" onClick={onGoToMenu}>
              Back to Menu
            </button>
          )}

          <button className="next-btn" onClick={onGoToProgress}>
            📊 View Progress
          </button>
        </div>
      )}
    </div>
  );
}

export default ChallengeScreen;
