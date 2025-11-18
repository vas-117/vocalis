// src/ChallengeScreen.js
import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import Confetti from "react-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useWindowSize } from "react-use";

function ChallengeScreen({
  onGoToMenu,
  onGoToProgress,
  selectedLevel,
  token,
  onSelectLevel,
  onShowLeaderboard,
  onStartRevisionGame,
}) {
  const { width, height } = useWindowSize();
  const canvasRef = useRef(null);

  // ------------------ STATES ------------------
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState("Loading...");

  // Picture round states
  const [isPictureRound, setIsPictureRound] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);

  const [levelName, setLevelName] = useState("");
  const [nextLevelId, setNextLevelId] = useState(null);
  const [nextLevelName, setNextLevelName] = useState(null);
  const [isLevelComplete, setIsLevelComplete] = useState(false);

  const [isTimeAttack, setIsTimeAttack] = useState(
    selectedLevel === "TIME_ATTACK"
  );
  const [timer, setTimer] = useState(60);
  const [score, setScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [botPace] = useState(11);
  const [timeAttackOver, setTimeAttackOver] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [encouragement, setEncouragement] = useState("");
  const [accuracyValue, setAccuracyValue] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showHearIt, setShowHearIt] = useState(false);
  const [isAfterHear, setIsAfterHear] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const [stars, setStars] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const [mediaStream, setMediaStream] = useState(null);

  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastRecordingURL, setLastRecordingURL] = useState(null);

  // Encouragements
  const encouragements = [
    "You’re doing great! Let’s try once more 💪",
    "Almost there — you’ve got this 🌟",
    "Keep going, I believe in you! 😊",
  ];

  // ------------------ SOUND HANDLER ------------------
  const playSound = (type) => {
    const sounds = {
      success: new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3"
      ),
      retry: new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3"
      ),
      complete: new Audio(
        "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"
      ),
      combo: new Audio(
        "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"
      ),
    };
    if (sounds[type]) {
      sounds[type].volume = 0.5;
      sounds[type].play().catch(() => {});
    }
  };

  // ------------------ VISUALIZER ------------------
  useEffect(() => {
    if (!mediaStream || !canvasRef.current) return;

    const audioCtx = new (window.AudioContext ||
      window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(mediaStream);
    const analyser = audioCtx.createAnalyser();

    analyser.fftSize = 64;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let animationFrame;

    const draw = () => {
      animationFrame = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let x = 0;
      const barWidth = (canvas.width / bufferLength) * 2.5;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;

        const gradient = ctx.createLinearGradient(
          0,
          0,
          0,
          canvas.height
        );
        gradient.addColorStop(0, "#ff7b00");
        gradient.addColorStop(1, "#ffd36b");

        ctx.fillStyle = gradient;
        ctx.fillRect(
          x,
          canvas.height - barHeight,
          barWidth,
          barHeight
        );

        x += barWidth + 2;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrame);
      audioCtx.close();
    };
  }, [mediaStream]);

  // ------------------ CONFETTI TIMER ------------------
  useEffect(() => {
    if (!showConfetti) return;
    const t = setTimeout(() => setShowConfetti(false), 2500);
    return () => clearTimeout(t);
  }, [showConfetti]);

  // ------------------ SET WORD DATA ------------------
// ------------------ SET WORD DATA (FIXED) ------------------
const setWordData = (wordData) => {

  // TRUE PICTURE ROUND ONLY IF BACKEND SENDS: type: "picture"
  const isTruePictureRound =
    typeof wordData === "object" &&
    wordData !== null &&
    wordData.type === "picture";

  if (isTruePictureRound) {
    setIsPictureRound(true);
    setCurrentWord(wordData.text);
    setCurrentImageUrl(wordData.image);
  } else {
    // NORMAL LEVEL (word + image both visible)
    setIsPictureRound(false);
    setCurrentWord(wordData.text || wordData); // handles string OR object
    setCurrentImageUrl(wordData.image || null);
  }
};


  // ------------------ LEVEL LOADING ------------------
  useEffect(() => {
    const loadLevel = async () => {
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
      setIsCorrect(false);
      setShowHearIt(false);
      setAccuracyValue(null);

      setIsTimeAttack(selectedLevel === "TIME_ATTACK");

      try {
        if (selectedLevel === "PRACTICE_DECK") {
          setFeedback("Loading your practice words...");
          setIsTimeAttack(false);

          const res = await fetch(
            "http://localhost:3001/api/progress/practice",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const practiceWords = await res.json();

          if (!practiceWords || practiceWords.length === 0) {
            setFeedback("You've mastered all your words!");
            setWords([]);
            setWordData("-");
            setIsLevelComplete(true);
          } else {
            setLevelName("Practice Deck");
            setWords(practiceWords);
            setCurrentIndex(0);
            setWordData(practiceWords[0]);
            setFeedback("");
          }
        } else if (selectedLevel === "TIME_ATTACK") {
          setFeedback("Get ready! Say the word!");

          const res = await fetch(
            "http://localhost:3001/api/level/TIME_ATTACK"
          );
          const data = await res.json();

          const list = data.words || [];
          setWords(list);

          const randomWord =
            list.length > 0
              ? list[Math.floor(Math.random() * list.length)]
              : "No words";

          setWordData(randomWord);
          setLevelName("Time Attack");
        } else {
          // Normal level
          const res = await fetch(
            `http://localhost:3001/api/level/${selectedLevel}`
          );
          const data = await res.json();

          if (!data.words || data.words.length === 0)
            throw new Error("Level has no words");

          setLevelName(data.name);
          setNextLevelId(data.nextLevelId);
          setNextLevelName(data.nextLevelName);

          setWords(data.words);
          setCurrentIndex(0);
          setWordData(data.words[0]);
        }
      } catch (err) {
        setFeedback("Error loading level. Go back to menu.");
      }
    };

    loadLevel();
  }, [selectedLevel, token]);
// src/ChallengeScreen.js



// ---------- FILE PART 2 / 5 ----------
// (Deepgram + Accuracy + Mic Handler + Result Handling + Next logic)

  // ------------------ ACCURACY / DEEPGRAM ------------------
  const computeAccuracy = (spoken, expected) => {
    spoken = (spoken || "").toUpperCase().replace(/[^A-Z ]/g, "");
    expected = (expected || "").toUpperCase().replace(/[^A-Z ]/g, "");
    if (!spoken) return 0;
    if (spoken === expected) return 100;
    let match = 0;
    const len = Math.max(spoken.length, expected.length);
    for (let i = 0; i < expected.length; i++) if (spoken[i] === expected[i]) match++;
    const raw = Math.round((match / len) * 100);
    if (raw >= 70 && Math.abs(spoken.length - expected.length) <= 1) return Math.min(100, raw + 20);
    return raw;
  };

  const sendToDeepgram = async (audioBlob) => {
    if (timeAttackOver) return;
    try {
      const formData = new FormData();
      formData.append("audioBlob", audioBlob, "speech.webm");
      formData.append("text", currentWord);
      const res = await fetch("http://localhost:3001/api/check-speech", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const alt =
        (data &&
          data.results &&
          data.results.channels &&
          data.results.channels[0] &&
          data.results.channels[0].alternatives &&
          data.results.channels[0].alternatives[0]) ||
        {};
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

  // ------------------ MIC HANDLER ------------------
  const handleMicClick = async () => {
    if (isRecording || timeAttackOver || words.length === 0 || isLevelComplete) return;
    setIsRecording(true);
    setFeedback(`🎙️ Listening...`);
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

        // stop tracks & cleanup
        stream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);

        setFeedback("Analyzing...");
        await sendToDeepgram(audioBlob);
        setIsRecording(false);
      };

      recorder.start();
      // record for 2s
      setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 2000);
    } catch (err) {
      console.error("Mic access error", err);
      setFeedback("🎤 Microphone not accessible.");
      setIsRecording(false);
    }
  };

  // ------------------ HANDLE RESULT ------------------
  const handleResult = (acc) => {
    if (timeAttackOver) return;

    if (acc >= 80) {
      // Correct
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
        // picture rounds: show checkmark and animate image
        setIsCorrect(true);
        setEncouragement("");
        setShowConfetti(true);
        // keep the correct state visible a short while and then go next
        setTimeout(() => {
          nextWord();
        }, 1200);
      }
    } else {
      // Wrong attempt
      playSound("retry");
      setFeedback("💬 Try again!");
      setStars(acc > 50 ? 2 : acc > 0 ? 1 : 0);
      setCombo(0);
      setIsCorrect(false);
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

  // ------------------ LOAD NEXT WORD (Time Attack) ------------------
  const loadNextWord = () => {
    if (timeAttackOver) return;
    const next = words.length ? words[Math.floor(Math.random() * words.length)] : "No words";
    setWordData(next);
    setFeedback("Say the new word!");
    setStars(0);
    setAccuracyValue(null);
    setLastRecordingURL(null);
    setIsCorrect(false);
  };

  // ------------------ NEXT WORD (Normal Mode) ------------------
  const nextWord = () => {
    const next = currentIndex + 1;

    if (next < words.length) {
      setCurrentIndex(next);
      setWordData(words[next]);
    } else {
      playSound("complete");
      setShowConfetti(true);
      setIsLevelComplete(true);

      if (nextLevelId && nextLevelId !== "null" && nextLevelName && nextLevelName !== "null") {
        setFeedback(`🏁 Level Complete!`);
      } else if (selectedLevel === "PRACTICE_DECK") {
        setFeedback("🏆 Practice complete! Great job!");
      } else {
        setFeedback("🏆 You’ve mastered this series! Amazing job!");
      }
    }

    // Reset fields for next
    setRetryCount(0);
    setStars(0);
    setAccuracyValue(null);
    setShowHearIt(false);
    setIsAfterHear(false);
    setLastRecordingURL(null);
    setIsCorrect(false);
  };
// ---------- FILE PART 3 / 5 ----------
// (Timer, Leaderboard submit, Save progress, HearIt, and UI render start)

  // ------------------ TIMER (Time Attack) ------------------
  useEffect(() => {
    if (!isTimeAttack || timeAttackOver) return;
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

  // ------------------ SUBMIT SCORE ON GAME OVER ------------------
  useEffect(() => {
    if (timeAttackOver && isTimeAttack) {
      const submitScore = async () => {
        try {
          await fetch("http://localhost:3001/api/leaderboard", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              score,
              maxCombo,
            }),
          });
        } catch (err) {
          console.error("Failed to submit score", err);
        }
      };
      submitScore();
    }
  }, [timeAttackOver, isTimeAttack, score, maxCombo, token]);

  // ------------------ SAVE PROGRESS ------------------
  const saveProgress = async (word, accuracy) => {
    if (!token) return;
    const mastered = accuracy >= 80;
    const entry = {
      word,
      accuracy,
      mastered,
      level: selectedLevel,
      date: new Date().toISOString(),
    };
    try {
      const res = await fetch("http://localhost:3001/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(entry),
      });
      if (!res.ok) console.error("Progress save failed:", await res.text());
    } catch (err) {
      console.error("Error saving progress:", err);
    }
  };

  // ------------------ HEAR IT ------------------
  const handleHearIt = () => {
    const utter = new SpeechSynthesisUtterance(
      // For picture rounds we still speak the word (but don't show it until correct)
      currentWord
    );
    utter.rate = 0.55;
    utter.pitch = 0.9;
    utter.lang = "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
    setFeedback("🔊 Listen carefully...");
    setIsAfterHear(true);
  };

  // ------------------ TIME ATTACK SCREEN ------------------
  if (timeAttackOver) {
    const didWin = score > botScore;
    return (
      <div className="App-header">
        {didWin ? (
          <h1 style={{ color: "#00c896" }}>🎉 You Win! 🎉</h1>
        ) : (
          <h1 style={{ color: "#d90429" }}>🤖 Try Again!</h1>
        )}
        <p style={{ fontSize: "1.5rem", margin: "10px" }}>Your Final Score:</p>
        <div
          style={{
            fontSize: "4rem",
            fontWeight: "bold",
            color: didWin ? "#00c896" : "#333",
          }}
        >
          {score}
        </div>
        <p style={{ fontSize: "1.2rem" }}>Bot's Score: {botScore}</p>
        <p>You got a {maxCombo}-word combo!</p>

        <motion.div
          style={{ display: "flex", gap: "15px", marginTop: "30px" }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button className="next-btn" onClick={onGoToMenu} style={{ background: "#ffb84d" }}>
            🏠 Back to Menu
          </button>
          <button className="next-btn leaderboard-btn" onClick={onShowLeaderboard}>
            🏆 View Leaderboard
          </button>
        </motion.div>
      </div>
    );
  }

  // ------------------ MAIN UI START (Top bar + layout) ------------------
  return (
    <div className="game-wrapper">
      {showConfetti && !isTimeAttack && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={150}
          gravity={0.3}
          tweenDuration={6000}
          recycle={false}
        />
      )}

      <header className="App-header">
        <div className="top-bar">
          <button onClick={onGoToMenu} className="back-btn">
            ⬅ Back
          </button>

          {isTimeAttack ? (
            <div className="time-attack-hud">
              <div>
                Your Score: <span>{score}</span>
              </div>
              <div>
                Time: <span>{timer}s</span>
              </div>
            </div>
          ) : (
            <div className="level-header">
              <span>{levelName}</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: isLevelComplete
                      ? "100%"
                      : words.length > 0
                      ? `${((currentIndex + 1) / words.length) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          )}
        </div>

{/* ---------- TWO-COLUMN LAYOUT ---------- */}
<div
  className="challenge-content"
  style={{
    display: "flex",
    width: "100%",
    gap: "20px",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: "20px",
  }}
>

  {/* ---------- LEFT SIDE CONTENT ---------- */}
  <div
    className="challenge-left"
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}
  >

    {/* WORD OR QUESTION BUBBLE */}
    {isPictureRound ? (
      // Picture round → show ? or Checkmark
      <motion.div
        className="word-bubble-small"
        key={isCorrect ? "check" : "question"}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        {isCorrect ? "✅" : "?"}
      </motion.div>
    ) : (
      // NORMAL LEARNING → show actual word
      <motion.div
        className="word-bubble"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        {currentWord}
      </motion.div>
    )}

    {/* COMBO DISPLAY */}
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

    {/* STARS */}
    {!isTimeAttack && (
      <div className="star-container" style={{ marginBottom: "8px" }}>
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={s <= stars ? "star active" : "star"}
          >
            ⭐
          </span>
        ))}
      </div>
    )}

    {/* VISUALIZER */}
    {isRecording && (
      <canvas
        ref={canvasRef}
        width={200}
        height={60}
        style={{ margin: "10px 0" }}
      />
    )}

    {/* MIC BUTTON */}
    <button
      className="mic-btn"
      onClick={handleMicClick}
      disabled={isRecording || words.length === 0}
      style={{ marginTop: "8px" }}
    >
      {isRecording
        ? "🛑 Recording..."
        : isAfterHear
        ? "🎙️ Try Again"
        : "🎙️ Speak"}
    </button>

    {/* HEAR IT + PLAYBACK */}
    <div
      className="button-row"
      style={{ display: "flex", gap: "15px", marginTop: "12px" }}
    >
      {!isTimeAttack && showHearIt && (
        <motion.button
          onClick={handleHearIt}
          className="hear-btn"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          👂 Hear It
        </motion.button>
      )}

      {!isTimeAttack && lastRecordingURL && (
        <motion.button
          onClick={() => new Audio(lastRecordingURL).play()}
          className="playback-btn"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🎧 Play My Audio
        </motion.button>
      )}
    </div>

    {/* FEEDBACK */}
    {feedback && (
      <motion.div
        className="feedback-banner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginTop: "12px" }}
      >
        {feedback}
      </motion.div>
    )}

    {/* ENCOURAGEMENT */}
    {encouragement && (
      <motion.p
        className="encouragement"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ marginTop: "8px" }}
      >
        {encouragement}
      </motion.p>
    )}

    {/* ACCURACY */}
    {accuracyValue !== null && (
      <motion.p
        className="accuracy subtle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ marginTop: "8px" }}
      >
        Accuracy: {accuracyValue}%
      </motion.p>
    )}

    {/* NEXT BUTTON */}
    {!isRecording && !isTimeAttack && (
      <button className="next-btn" onClick={nextWord} style={{ marginTop: "12px" }}>
        Next ⏭️
      </button>
    )}
  </div>

  {/* ---------- RIGHT SIDE IMAGE (ALWAYS SHOW IF IMAGE EXISTS) ---------- */}
  <div
    className="challenge-right"
    style={{
      flex: 1,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    {/* Show image for BOTH normal learning & picture round */}
    {currentImageUrl && (
      <motion.img
        key={currentImageUrl + (isCorrect ? "-correct" : "-normal")}
        src={currentImageUrl}
        alt="learning"
        className="picture-right-image"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={
          isCorrect
            ? { scale: [1, 1.2, 1], opacity: 1 }
            : { scale: 1, opacity: 1 }
        }
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: "100%",
          maxHeight: "380px",
          borderRadius: "16px",
          boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
        }}
      />
    )}
  </div>

</div>



        {/* ---------- LEVEL COMPLETE SCREEN ---------- */}
        {isLevelComplete && !isTimeAttack && (
          <div
            style={{
              width: "100%",
              marginTop: "40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Confetti */}
            {showConfetti && (
              <Confetti
                width={width}
                height={height}
                numberOfPieces={200}
                gravity={0.3}
                recycle={false}
              />
            )}

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                background: "#fff5da",
                padding: "20px 40px",
                borderRadius: "20px",
                fontSize: "2rem",
                fontWeight: "700",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                marginBottom: "20px",
              }}
            >
              🏁 Level Complete!
            </motion.h1>

            {/* Optional encouragement */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                fontSize: "1.2rem",
                color: "#ff7b00",
                marginBottom: "35px",
              }}
            >
              Great job! You're getting better every time 🌟
            </motion.p>

            {/* Buttons */}
            <motion.div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "20px",
                width: "100%",
              }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Revision Game */}
              <button
                className="next-btn"
                onClick={() => onStartRevisionGame(words)}
                style={{
                  background: "#9b59b6",
                  color: "white",
                  minWidth: "240px",
                  fontSize: "1.1rem",
                }}
              >
                Play Revision Game 👾
              </button>

              {/* Next Level / Back */}
              {nextLevelId && nextLevelName ? (
                <button
                  className="next-btn"
                  onClick={() => onSelectLevel(nextLevelId)}
                  style={{
                    background: "#007cff",
                    color: "#fff",
                    minWidth: "240px",
                    fontSize: "1.1rem",
                  }}
                >
                  Go to {nextLevelName} 🚀
                </button>
              ) : (
                <button
                  className="next-btn"
                  onClick={onGoToMenu}
                  style={{
                    background: "#ffb84d",
                    minWidth: "240px",
                    fontSize: "1.1rem",
                  }}
                >
                  🏠 Back to Menu
                </button>
              )}

              {/* Progress */}
              <button
                className="next-btn"
                onClick={onGoToProgress}
                style={{
                  background: "#00c896",
                  color: "#fff",
                  minWidth: "240px",
                  fontSize: "1.1rem",
                }}
              >
                View My Progress 📊
              </button>
            </motion.div>
          </div>
        )}

      </header>
    </div>
  );
}

export default ChallengeScreen;
