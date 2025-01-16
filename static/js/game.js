// static/js/game.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Loaded game.js!");
  
    // DOM Elements
    const scIframe    = document.getElementById('sc-player');
    const playButton  = document.getElementById('play-button');
    const skipButton  = document.getElementById('skip-button');
    const guessForm   = document.getElementById('guess-form');
    const guessInput  = document.getElementById('guess-input');
    const feedback    = document.getElementById('feedback');
    const answer      = document.getElementById('correct-answer').value.trim().toLowerCase();
  
    // Progress bar
    const markersContainer = document.getElementById('markers-container');
    const unlockedBar      = document.getElementById('unlocked-bar');
    const currentBar       = document.getElementById('current-bar');
  
    // Time slices
    const TIME_SLICES = [2, 3, 5, 9, 13];
    let sliceIndex = 0;
    let unlockedDuration = TIME_SLICES[sliceIndex];
    let gameOver = false;
  
    // Maximum slice time
    const MAX_TIME = TIME_SLICES[TIME_SLICES.length - 1];
  
    // We'll allow a max of 6 attempts
    let attemptNumber = 1;
    const maxAttempts = 6;
  
    // SoundCloud widget
    const widget = SC.Widget(scIframe);
  
    // (A) Create markers
    function createMarkers() {
      TIME_SLICES.forEach((sec) => {
        const fraction = sec / MAX_TIME;
        const leftPercent = fraction * 100;
  
        const marker = document.createElement('div');
        marker.classList.add('slice-marker');
        marker.style.left = leftPercent + '%';
        markersContainer.appendChild(marker);
      });
    }
    createMarkers();
  
    // (B) Update unlocked bar
    function updateUnlockedBar() {
      const frac = unlockedDuration / MAX_TIME;
      unlockedBar.style.width = (frac * 100) + '%';
    }
  
    // (C) Update current bar (playback)
    function updateCurrentBar(ms) {
      const sec = ms / 1000;
      const frac = sec / MAX_TIME;
      currentBar.style.width = Math.min(frac * 100, 100) + '%';
    }
  
    // (D) Fill a specific row in guess history
    // e.g., fillRow(1, "mozart", "wrong") => "1 - mozart (wrong)"
    // inside your handleWrongAttempt or fillRow function:
        function fillRow(attempt, guessText, status) {
            const rowEl = document.getElementById(`attempt-${attempt}`);
            if (rowEl) {
            rowEl.textContent = `${attempt} - ${guessText} (${status})`;
            }
        }
  
  
    // (E) End game
    function endGame() {
      gameOver = true;
      feedback.textContent += ' Game over!';
      playButton.style.display = 'none';
      skipButton.style.display = 'none';
      guessForm.style.display = 'none';
  
      // Show SoundCloud iframe
      scIframe.style.display = 'block';
  
      // Optional share button
      const shareBtn = document.createElement('button');
      shareBtn.textContent = 'Share result';
      shareBtn.addEventListener('click', () => {
        const text = `I just played Heardle-like! The answer was "${answer}".`;
        navigator.clipboard.writeText(text)
          .then(() => alert('Copied to clipboard!'));
      });
      feedback.appendChild(document.createElement('br'));
      feedback.appendChild(shareBtn);
    }
  
    // (F) Next slice or end
    function goToNextSlice() {
      sliceIndex++;
      if (sliceIndex >= TIME_SLICES.length) {
        feedback.textContent = `No more slices! The correct answer was "${answer}".`;
        endGame();
        return false;
      }
      unlockedDuration = TIME_SLICES[sliceIndex];
      updateUnlockedBar();
      return true;
    }
  
    // (G) Common function if user guessed incorrectly or skipped
    function markWrongAttempt(guessText) {
      // Mark the row with: attemptNumber, guessText, "wrong"
      fillRow(attemptNumber, guessText, "wrong");
      attemptNumber++;
      // If we exceeded max attempts, also end game
      if (attemptNumber > maxAttempts) {
        feedback.textContent = `No more attempts! The correct answer was "${answer}".`;
        endGame();
        return;
      }
      // Move to next slice
      goToNextSlice();
    }
  
    // Initialize
    updateUnlockedBar();
  
    // (H) Bind widget events
    widget.bind(SC.Widget.Events.READY, () => {
      console.log("SoundCloud Widget is ready.");
  
      widget.bind(SC.Widget.Events.PLAY_PROGRESS, (eventData) => {
        const ms = eventData.currentPosition;
        updateCurrentBar(ms);
  
        if (ms >= unlockedDuration * 1000) {
          widget.pause();
        }
      });
  
      // PLAY
      playButton.addEventListener('click', () => {
        if (gameOver) return;
        widget.seekTo(0);
        widget.play();
      });
  
      // SKIP
      skipButton.addEventListener('click', () => {
        if (gameOver) return;
        feedback.textContent = "You skipped!";
        markWrongAttempt("Skipped");
      });
  
      // GUESS
      guessForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (gameOver) return;
  
        const userGuess = guessInput.value.trim().toLowerCase();
        if (!userGuess) {
          feedback.textContent = "Please enter a guess.";
          return;
        }
  
        // Check with server
        fetch('/guess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guess: userGuess, answer: answer }),
        })
        .then(res => res.json())
        .then(data => {
          if (data.result === 'correct') {
            // Fill row with "correct!"
            fillRow(attemptNumber, userGuess, "correct!");
            feedback.textContent = "Correct! Well done.";
            endGame();
          } else {
            // Wrong guess
            feedback.textContent = "Wrong guess!";
            markWrongAttempt(userGuess);
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
  