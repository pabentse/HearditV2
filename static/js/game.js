// static/js/game.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("Loaded game.js!");
  
    // Grab DOM elements
    const scIframe       = document.getElementById('sc-player');
    const playButton     = document.getElementById('play-button');
    const skipButton     = document.getElementById('skip-button');
    const guessForm      = document.getElementById('guess-form');
    const guessInput     = document.getElementById('guess-input');
    const feedback       = document.getElementById('feedback');
    const answer         = document.getElementById('correct-answer').value.trim().toLowerCase();
    const livesContainer = document.getElementById('lives-container');
  
    // Progress bar elements
    const progressContainer = document.getElementById('progress-container');
    const markersContainer  = document.getElementById('markers-container');
    const unlockedBar       = document.getElementById('unlocked-bar');
    const currentBar        = document.getElementById('current-bar');
  
    // The time slices in seconds
    const TIME_SLICES = [2, 3, 5, 9, 13];
    let sliceIndex = 0;                 // which slice are we on
    let unlockedDuration = TIME_SLICES[sliceIndex]; // in seconds
    let gameOver = false;
    let usedAttempts = 0;
  
    // Calculate total “max” time
    const MAX_TIME = TIME_SLICES[TIME_SLICES.length - 1]; // e.g., 13
  
    // Initialize the SC widget
    const widget = SC.Widget(scIframe);
  
    // Add slice markers for visual reference
    // e.g., 2s, 3s, 5s, 9s, 13s
    // We'll place a vertical line at each slice (EXCEPT 0)
    function createMarkers() {
      TIME_SLICES.forEach((sliceSeconds) => {
        // Where in % is that slice? sliceSeconds / MAX_TIME
        const fraction = sliceSeconds / MAX_TIME; 
        const leftPercent = fraction * 100;
  
        // Create a div for the line
        const marker = document.createElement('div');
        marker.classList.add('slice-marker');
        marker.style.left = leftPercent + '%';
        markersContainer.appendChild(marker);
      });
    }
    createMarkers();
  
    // Update the "lives" hearts
    function updateHearts() {
      const hearts = livesContainer.querySelectorAll('.life');
      hearts.forEach((heart, idx) => {
        heart.style.color = (idx < usedAttempts) ? '#aaa' : 'red';
      });
    }
  
    // End the game
    function endGame() {
      gameOver = true;
      feedback.textContent += ' Game over!';
      playButton.style.display = 'none';
      skipButton.style.display = 'none';
      guessForm.style.display = 'none';
  
      // Optionally show share button
      const shareBtn = document.createElement('button');
      shareBtn.textContent = 'Share result';
      shareBtn.addEventListener('click', () => {
        const text = `I just played Heardle-like! The answer was "${answer}".`;
        navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
      });
      feedback.appendChild(document.createElement('br'));
      feedback.appendChild(shareBtn);
    }
  
    // Called when skip or a wrong guess
    function handleWrongAttempt(message) {
      feedback.textContent = message;
      usedAttempts++;
      sliceIndex++;
      if (sliceIndex >= TIME_SLICES.length) {
        // No more slices => game over
        feedback.textContent = `No more lives! Correct answer was "${answer}".`;
        updateHearts();
        endGame();
        return;
      }
      unlockedDuration = TIME_SLICES[sliceIndex];
      updateHearts();
      updateUnlockedBar();
    }
  
    // Update the "unlocked" bar width (light green)
    function updateUnlockedBar() {
      const fraction = unlockedDuration / MAX_TIME; // unlocked out of total
      unlockedBar.style.width = (fraction * 100) + '%';
    }
  
    // We’ll keep updating the “currentBar” as the track plays
    function updateCurrentBar(positionMs) {
      // positionMs is current playback in ms
      const positionSec = positionMs / 1000;
      // The fraction of the total bar
      const fraction = positionSec / MAX_TIME;
      currentBar.style.width = Math.min(fraction * 100, 100) + '%';
    }
  
    // Initially set hearts & unlocked bar
    updateHearts();
    updateUnlockedBar();
  
    // Wait for the widget to be ready
    widget.bind(SC.Widget.Events.READY, () => {
      console.log("SoundCloud Widget is ready.");
  
      // Listen to PLAY_PROGRESS to move the "currentBar"
      widget.bind(SC.Widget.Events.PLAY_PROGRESS, (eventData) => {
        const ms = eventData.currentPosition;
        updateCurrentBar(ms);
  
        // If we've reached the unlocked limit, pause
        if (ms >= unlockedDuration * 1000) {
          widget.pause();
        }
      });
  
      // PLAY button
      playButton.addEventListener('click', () => {
        if (gameOver) return;
        // Start from 0 each time
        widget.seekTo(0);
        widget.play();
      });
  
      // SKIP button
      skipButton.addEventListener('click', () => {
        if (gameOver) return;
        handleWrongAttempt("You skipped!");
      });
  
      // GUESS form
      guessForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (gameOver) return;
  
        const userGuess = guessInput.value.trim().toLowerCase();
        if (!userGuess) {
          feedback.textContent = "Please enter a guess.";
          return;
        }
  
        // Check guess with server
        fetch('/guess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guess: userGuess, answer: answer }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.result === 'correct') {
              feedback.textContent = "Correct! Well done.";
              endGame();
            } else {
              handleWrongAttempt("Wrong guess!");
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
  