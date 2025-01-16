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
    const puzzleId    = document.getElementById('puzzle-id').value;  // today's puzzle ID
  
    // Progress bar
    const markersContainer = document.getElementById('markers-container');
    const unlockedBar      = document.getElementById('unlocked-bar');
    const currentBar       = document.getElementById('current-bar');
  
    // Time slices
    const TIME_SLICES = [2, 3, 5, 9, 13];
    let sliceIndex = 0;             // Which slice are we currently on?
    let unlockedDuration = 2;       // TIME_SLICES[0]
    let gameOver = false;
  
    // We'll allow a max of 6 attempts
    let attemptNumber = 1;
    const maxAttempts = 6;
  
    // This will hold all guess history for display
    // Example: [{ attempt:1, guess:"hello", status:"wrong" }, ...]
    let guessHistory = [];

    // SoundCloud widget
    const widget = SC.Widget(scIframe);
  
    // 1) Create markers
    function createMarkers() {
      const maxTime = TIME_SLICES[TIME_SLICES.length - 1];
      TIME_SLICES.forEach(sec => {
        const fraction = sec / maxTime;
        const leftPercent = fraction * 100;
  
        const marker = document.createElement('div');
        marker.classList.add('slice-marker');
        marker.style.left = leftPercent + '%';
        markersContainer.appendChild(marker);
      });
    }

    // 2) Update unlocked bar
    function updateUnlockedBar() {
      const maxTime = TIME_SLICES[TIME_SLICES.length - 1];
      const frac = unlockedDuration / maxTime;
      unlockedBar.style.width = (frac * 100) + '%';
    }

    // 3) Update current bar (playback)
    function updateCurrentBar(ms) {
      const maxTime = TIME_SLICES[TIME_SLICES.length - 1];
      const sec = ms / 1000;
      const frac = sec / maxTime;
      currentBar.style.width = Math.min(frac * 100, 100) + '%';
    }

    // 4) Fill a specific row in guess history
    function fillRow(attempt, guessText, status) {
      const rowEl = document.getElementById(`attempt-${attempt}`);
      if (rowEl) {
        rowEl.textContent = `${attempt} - ${guessText} (${status})`;
      }
    }

    // 5) End game
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

      // After the game is over, save that state so it doesn't prompt user again if they come back
      saveGameState();
    }

    // 6) Move to next slice or end
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

    // 7) Common function if user guessed incorrectly or skipped
    function markWrongAttempt(guessText) {
      // Mark the row visually
      fillRow(attemptNumber, guessText, "wrong");
      // Also store in our guessHistory array
      guessHistory.push({ attempt: attemptNumber, guess: guessText, status: "wrong" });

      attemptNumber++;
      if (attemptNumber > maxAttempts) {
        feedback.textContent = `No more attempts! The correct answer was "${answer}".`;
        endGame();
      } else {
        // Move to next slice
        goToNextSlice();
      }

      // Save current state after each wrong attempt
      saveGameState();
    }

    /* -------------------------------------------------------------------------------- */
    /* LOCAL STORAGE METHODS */
    /* -------------------------------------------------------------------------------- */

    function getStorageKey() {
      // A unique key for today's puzzle
      return `heardit-state-${puzzleId}`;
    }

    function saveGameState() {
      // Gather all the data we want to save
      const data = {
        sliceIndex,
        unlockedDuration,
        gameOver,
        attemptNumber,
        guessHistory
      };
      localStorage.setItem(getStorageKey(), JSON.stringify(data));
    }

    function loadGameState() {
      const saved = localStorage.getItem(getStorageKey());
      if (!saved) return; // no data

      try {
        const data = JSON.parse(saved);
        sliceIndex       = data.sliceIndex;
        unlockedDuration = data.unlockedDuration;
        gameOver         = data.gameOver;
        attemptNumber    = data.attemptNumber;
        guessHistory     = data.guessHistory || [];

        // Now restore the UI from guessHistory
        guessHistory.forEach(item => {
          fillRow(item.attempt, item.guess, item.status);
        });

        // If the game was already over, reflect that in the UI
        if (gameOver) {
          feedback.textContent = 'You already finished this puzzle. The answer was "' + answer + '".';
          endGame(); // calls endGame to hide guess form, show iframe, etc.
        } else {
          // If the game is not over, ensure the bars reflect the loaded slice
          updateUnlockedBar();
        }
      } catch (err) {
        console.error("Error parsing saved game data:", err);
      }
    }

    // If you want to clean out old puzzles’ data in localStorage, you can do that in
    // a separate place or by enumerating keys. But at minimum, we just use a new key daily.

    /* -------------------------------------------------------------------------------- */
    /* INIT LOGIC */
    /* -------------------------------------------------------------------------------- */

    createMarkers();
    updateUnlockedBar();

    // Try loading existing game data for today's puzzle
    loadGameState();

    // If for any reason you want to forcibly reset for a new puzzle day,
    // you can call `localStorage.removeItem(getStorageKey())` or do this in Python
    // by generating a new puzzle_id, etc.

    /* -------------------------------------------------------------------------------- */
    /* SOUND CLOUD BINDINGS & EVENT HANDLERS */
    /* -------------------------------------------------------------------------------- */

    widget.bind(SC.Widget.Events.READY, () => {
      console.log("SoundCloud Widget is ready.");
  
      widget.bind(SC.Widget.Events.PLAY_PROGRESS, (eventData) => {
        const ms = eventData.currentPosition;
        updateCurrentBar(ms);
  
        // Pause if we hit the unlocked duration
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
            // Fill row
            fillRow(attemptNumber, userGuess, "correct!");
            guessHistory.push({ attempt: attemptNumber, guess: userGuess, status: "correct!" });
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
        })
        .finally(() => {
          guessInput.value = '';
        });
      });
    });
});
