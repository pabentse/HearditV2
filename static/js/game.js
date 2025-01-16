// static/js/game.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Loaded game.js!");
  
    // ----- DOM Elements -----
    const scIframe    = document.getElementById('sc-player');
    const playButton  = document.getElementById('play-button');
    const skipButton  = document.getElementById('skip-button');
    const guessForm   = document.getElementById('guess-form');
    const guessInput  = document.getElementById('guess-input');
    const feedback    = document.getElementById('feedback');
    const answer      = document.getElementById('correct-answer').value.trim().toLowerCase();
  
    // Progress bar elements
    const markersContainer = document.getElementById('markers-container');
    const unlockedBar      = document.getElementById('unlocked-bar');
    const currentBar       = document.getElementById('current-bar');
  
    // The “history” area where we show each attempt (skip/wrong/correct)
    const guessHistoryEl = document.getElementById('guess-history');
  
    // ----- Time Slice Logic -----
    const TIME_SLICES = [2, 3, 5, 9, 13];  // in seconds
    let sliceIndex = 0;                   // which slice we’re on
    let unlockedDuration = TIME_SLICES[sliceIndex]; 
    let gameOver = false;
  
    // The maximum is the last slice (13s)
    const MAX_TIME = TIME_SLICES[TIME_SLICES.length - 1];
  
    // 
    // We'll keep track of attemptNumber to label each row:
    //
    let attemptNumber = 1;  
  
    // Create the SoundCloud widget
    const widget = SC.Widget(scIframe);
  
    // ----- (A) Create Markers in progress bar -----
    function createMarkers() {
      TIME_SLICES.forEach((sliceSeconds) => {
        const fraction = sliceSeconds / MAX_TIME;
        const leftPercent = fraction * 100;
  
        const marker = document.createElement('div');
        marker.classList.add('slice-marker');
        marker.style.left = leftPercent + '%';
        markersContainer.appendChild(marker);
      });
    }
    createMarkers();
  
    // ----- (B) Update Unlocked Bar -----
    function updateUnlockedBar() {
      const fraction = unlockedDuration / MAX_TIME;
      unlockedBar.style.width = (fraction * 100) + '%';
    }
  
    // ----- (C) Update Current Playback Bar -----
    function updateCurrentBar(positionMs) {
      const positionSec = positionMs / 1000;
      const fraction = positionSec / MAX_TIME;
      currentBar.style.width = Math.min(fraction * 100, 100) + '%';
    }
  
    // ----- (D) Add a row to Guess History -----
    function addHistoryRow(guessText, status) {
      // Format: "1 - mozart (wrong)" or "2 - malone (correct!)"
      // or "3 - Skipped (wrong)"
      const p = document.createElement('p');
      p.textContent = `${attemptNumber} - ${guessText} (${status})`;
      guessHistoryEl.appendChild(p);
  
      // Increase attempt number for the next time
      attemptNumber++;
    }
  
    // ----- (E) End Game -----
    function endGame() {
      gameOver = true;
      feedback.textContent += ' Game over!';
      // Hide main controls
      playButton.style.display = 'none';
      skipButton.style.display = 'none';
      guessForm.style.display = 'none';
  
      // Reveal the SoundCloud iframe
      scIframe.style.display = 'block';
  
      // Optionally, share button
      const shareBtn = document.createElement('button');
      shareBtn.textContent = 'Share result';
      shareBtn.addEventListener('click', () => {
        const text = `I just played Heardle-like! The answer was "${answer}".`;
        navigator.clipboard.writeText(text)
          .then(() => alert('Copied to clipboard!'))
          .catch(() => alert('Failed to copy.'));
      });
      feedback.appendChild(document.createElement('br'));
      feedback.appendChild(shareBtn);
    }
  
    // ----- (F) Handle Wrong/Skip Attempt -----
    function handleWrongAttempt(userGuessOrSkipped) {
      // userGuessOrSkipped might be "Skipped" or an actual guess string
      feedback.textContent = "Wrong guess!";  // or "You skipped!" if you prefer
  
      // Add to guess history
      addHistoryRow(userGuessOrSkipped, "wrong");
  
      // Next slice
      sliceIndex++;
      if (sliceIndex >= TIME_SLICES.length) {
        // Out of slices => game over
        feedback.textContent = `No more slices! The correct answer was "${answer}".`;
        endGame();
        return;
      }
      unlockedDuration = TIME_SLICES[sliceIndex];
      updateUnlockedBar();
    }
  
    // Initialize the unlocked bar
    updateUnlockedBar();
  
    // ----- (G) Widget Ready -----
    widget.bind(SC.Widget.Events.READY, () => {
      console.log("SoundCloud Widget is ready.");
  
      // Track the playing position to move currentBar
      widget.bind(SC.Widget.Events.PLAY_PROGRESS, (eventData) => {
        const ms = eventData.currentPosition;
        updateCurrentBar(ms);
  
        // If we reached unlocked limit, pause
        if (ms >= unlockedDuration * 1000) {
          widget.pause();
        }
      });
  
      // (1) PLAY button
      playButton.addEventListener('click', () => {
        if (gameOver) return;
        widget.seekTo(0);
        widget.play();
      });
  
      // (2) SKIP button
      skipButton.addEventListener('click', () => {
        if (gameOver) return;
        addHistoryRow("Skipped", "wrong"); // Mark attempt
        // Also increment attemptNumber
        sliceIndex++;
        if (sliceIndex >= TIME_SLICES.length) {
          feedback.textContent = `No more slices! The correct answer was "${answer}".`;
          endGame();
          return;
        }
        unlockedDuration = TIME_SLICES[sliceIndex];
        updateUnlockedBar();
        feedback.textContent = "You skipped!";
      });
  
      // (3) GUESS form
      guessForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (gameOver) return;
  
        const userGuess = guessInput.value.trim().toLowerCase();
        if (!userGuess) {
          feedback.textContent = "Please enter a guess.";
          return;
        }
  
        // We'll do a fetch to server
        fetch('/guess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guess: userGuess, answer: answer }),
        })
        .then(res => res.json())
        .then(data => {
          if (data.result === 'correct') {
            addHistoryRow(userGuess, "correct!");
            feedback.textContent = "Correct! Well done.";
            endGame();
          } else {
            // Not correct => record a row "userGuess (wrong)"
            addHistoryRow(userGuess, "wrong");
            // Next slice
            sliceIndex++;
            if (sliceIndex >= TIME_SLICES.length) {
              feedback.textContent = `No more slices! The correct answer was "${answer}".`;
              endGame();
              return;
            }
            unlockedDuration = TIME_SLICES[sliceIndex];
            updateUnlockedBar();
            feedback.textContent = "Wrong guess!";
          }
        })
        .catch(err => {
          console.error(err);
          feedback.textContent = "Error checking guess.";
        });
  
        guessInput.value = '';
      });
    });
  });
  