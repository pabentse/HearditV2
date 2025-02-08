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
    const resultsBox  = document.getElementById("autocomplete-list");
  
    let songsData = []; // We'll load the JSON data here.

    // 1) Set the play button to a loading state initially.
    playButton.classList.add("loading");
    playButton.disabled = true;
  
    // Progress bar
    const markersContainer = document.getElementById('markers-container');
    const unlockedBar      = document.getElementById('unlocked-bar');
    const currentBar       = document.getElementById('current-bar');
  
    // Time slices
    const TIME_SLICES = [2, 3, 5, 11, 20];
    let sliceIndex = 0;
    let unlockedDuration = 2;  // TIME_SLICES[0]
    let gameOver = false;
    let gameWon  = false;      // track if puzzle was solved
    
    // We'll allow a max of 6 attempts
    let attemptNumber = 1;
    const maxAttempts = 5;
  
    // Guess history
    // Example: [{ attempt:1, guess:"hello", status:"wrong" }, ...]
    let guessHistory = [];
  
    // SoundCloud widget
    const widget = SC.Widget(scIframe);

    // Fetch the JSON data
    fetch("/static/data/songsWithLinks.json")
      .then((response) => response.json())
      .then((data) => {
        songsData = data; // store globally for filtering
        console.log("Loaded songs data:", songsData);
      })
      .catch((error) => console.error("Error loading songs JSON:", error));

    // Autocomplete logic
    guessInput.addEventListener("input", onSearchInput);

    function onSearchInput() {
      const query = guessInput.value.toLowerCase().trim();
      resultsBox.innerHTML = "";
      if (!query) return;
  
      const filtered = songsData.filter(song => {
        const ans = (typeof song.answer === "string") ? song.answer.toLowerCase() : "";
        const art = (typeof song.artist === "string") ? song.artist.toLowerCase() : "";
        return ans.includes(query) || art.includes(query);
      });
  
      filtered.slice(0, 6).forEach((song) => {
        const itemDiv = document.createElement("div");
        itemDiv.textContent = song.answer;
        itemDiv.addEventListener("click", () => {
          guessInput.value = song.answer; // fill the form field
          resultsBox.innerHTML = "";
        });
        resultsBox.appendChild(itemDiv);
      });
    }
  
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
  
    // 4) Fill a specific row in guess history with nicer format
    function fillRow(attempt, guessText, status) {
      const rowEl = document.getElementById(`attempt-${attempt}`);
      if (!rowEl) return;
      
      let prefix = "🟥"; // default for wrong
      if (status === "correct!") prefix = "🟩";
      else if (status === "artist") prefix = "🟨"; // artist-only guess
      if (guessText.toLowerCase() === "skipped") prefix = "⬛";
    
      // If not skipped, try to show a nicer title from songsData.
      if (guessText.toLowerCase() !== "skipped") {
        const match = songsData.find(s =>
          s.answer && s.answer.toLowerCase() === guessText.toLowerCase()
        );
        if (match) {
          rowEl.textContent = `${prefix} ${match.answer} `;
          return;
        }
      }
      rowEl.textContent = `${prefix} ${guessText}`;
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
  
      // Create share button
      createShareButton();
  
      // Save final state
      saveGameState();
    }
  
    // 6) Move to next slice or end
    function goToNextSlice() {
      sliceIndex++;
      if (sliceIndex >= TIME_SLICES.length) {
        feedback.textContent = `No more tries!`;
        endGame();
        return false;
      }
      unlockedDuration = TIME_SLICES[sliceIndex];
      updateUnlockedBar();
      return true;
    }
  
    // 7) Mark a wrong attempt
    function markWrongAttempt(guessText) {
      fillRow(attemptNumber, guessText, "wrong");
      guessHistory.push({ attempt: attemptNumber, guess: guessText, status: "wrong" });
      attemptNumber++;
  
      if (attemptNumber > maxAttempts) {
        feedback.textContent = `No more attempts! `;
        endGame();
      } else {
        goToNextSlice();
      }
      saveGameState();
    }
  
    /* -------------------------------------------------------------------------------- */
    /* LOCAL STORAGE METHODS */
    /* -------------------------------------------------------------------------------- */
  
    function getStorageKey() {
      return `heardit-state-${puzzleId}`; // A unique key for today's puzzle
    }
  
    function saveGameState() {
      const data = {
        sliceIndex,
        unlockedDuration,
        gameOver,
        gameWon,
        attemptNumber,
        guessHistory
      };
      localStorage.setItem(getStorageKey(), JSON.stringify(data));
    }
  
    function loadGameState() {
      const saved = localStorage.getItem(getStorageKey());
      if (!saved) return;
      try {
        const data = JSON.parse(saved);
        sliceIndex       = data.sliceIndex;
        unlockedDuration = data.unlockedDuration;
        gameOver         = data.gameOver;
        gameWon          = data.gameWon || false;
        attemptNumber    = data.attemptNumber;
        guessHistory     = data.guessHistory || [];
  
        // Restore from guessHistory
        guessHistory.forEach(item => {
          fillRow(item.attempt, item.guess, item.status);
        });
  
        if (gameOver) {
          feedback.textContent = 'You already finished this puzzle.';
          endGame();
        } else {
          updateUnlockedBar();
        }
      } catch (err) {
        console.error("Error parsing saved game data:", err);
      }
    }
  
  
    function buildBlockString() {
      // Build a 6-character string for the 6 attempts
      let blockArray = [];
      for (let i = 1; i <= maxAttempts; i++) {
        const attemptInfo = guessHistory.find(g => g.attempt === i);
        if (!attemptInfo) {
          blockArray.push("⬜"); // unused
        } else {
          if (attemptInfo.guess.toLowerCase() === "skipped") {
            blockArray.push("⬛");
          } else if (attemptInfo.status === "correct!") {
            blockArray.push("🟩");
          } else {
            blockArray.push("🟥");
          }
        }
      }
      return blockArray.join("");
    }
  
    // Helper function to show toast
    function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.className = 'toast show';
      // Hide the toast after 2 seconds
      setTimeout(() => {
        toast.className = toast.className.replace('show', '');
      }, 3000);
    } else {
      console.warn('Toast element not found');
    }
    }
  
  // Updated copyToClipboard function using toast
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy');
      });
  }
  
  /* -------------------------------------------------------------------------------- */
  function createShareButton() {
    const shareBtn = document.createElement('button');
    shareBtn.textContent = 'Share Result';
    shareBtn.classList.add('share-button'); // Add a class for styling if needed
  
    shareBtn.addEventListener('click', () => {
      const blocks = buildBlockString();
      const shareText = `${blocks}\n🔊 https://www.heardit.eu 🔊`;
      copyToClipboard(shareText);
    });
  
    // Assuming 'feedback' is a DOM element where you want to place the button
    const feedback = document.getElementById('feedback'); // Ensure this ID exists in your HTML
    if (feedback) {
      feedback.appendChild(document.createElement('br'));
      feedback.appendChild(shareBtn);
    } else {
      console.warn('Feedback element not found');
    }
  }
  
    /* -------------------------------------------------------------------------------- */
    /* INIT LOGIC */
    /* -------------------------------------------------------------------------------- */
  
    createMarkers();
    updateUnlockedBar();
    loadGameState();
  
    /* -------------------------------------------------------------------------------- */
    /* SOUND CLOUD BINDINGS & EVENT HANDLERS */
    /* -------------------------------------------------------------------------------- */
  

    // 2) When widget is ready, remove the loading state
    widget.bind(SC.Widget.Events.READY, () => {
        console.log("SoundCloud Widget is ready.");
  
        // The widget is ready, so we remove the spinner and enable the button
        playButton.classList.remove("loading");
        playButton.classList.add("ready");
        playButton.disabled = false;
  
        // 3) Bind events to switch between playing and paused/finished states
        widget.bind(SC.Widget.Events.PLAY, () => {
          // Switch to dancing bars or playing animation
          playButton.classList.remove("ready");
          playButton.classList.add("playing");
        });
  
        widget.bind(SC.Widget.Events.PAUSE, () => {
          // Return to normal play icon
          playButton.classList.remove("playing");
          playButton.classList.add("ready");
        });
  
        widget.bind(SC.Widget.Events.FINISH, () => {
          // Also show normal play icon again
          playButton.classList.remove("playing");
          playButton.classList.add("ready");
        });
  
        // 4) Also track play progress as you did before
        widget.bind(SC.Widget.Events.PLAY_PROGRESS, (eventData) => {
          const ms = eventData.currentPosition;
          updateCurrentBar(ms);
          if (ms >= unlockedDuration * 1000) {
            widget.pause();
          }
        });
      });
  
      // PLAY button on-click
      playButton.addEventListener('click', () => {
        if (gameOver) return;
        // Seek to start & play
        widget.seekTo(0);
        widget.play();
      });
  
      // SKIP
      skipButton.addEventListener('click', () => {
        if (gameOver) return;
        feedback.textContent = "You skipped!";
        fillRow(attemptNumber, "Skipped", "wrong");
        guessHistory.push({ attempt: attemptNumber, guess: "Skipped", status: "wrong" });
        attemptNumber++;
  
        if (attemptNumber > maxAttempts) {
          feedback.textContent = `No more attempts! `;
          endGame();
        } else {
          goToNextSlice();
        }
        saveGameState();
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
    
        // Ensure the guess is valid (exists in songsData)
        const validGuess = songsData.some(song =>
          (typeof song.answer === "string") && song.answer.toLowerCase() === userGuess
        );
        if (!validGuess) {
          feedback.textContent = "Please choose a valid song from the list.";
          return;
        }
    
        fetch('/guess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guess: userGuess, answer: answer }),
        })
        .then(res => res.json())
        .then(data => {
          if (data.result === 'correct') {
            gameWon = true;
            fillRow(attemptNumber, userGuess, "correct!");
            guessHistory.push({ attempt: attemptNumber, guess: userGuess, status: "correct!" });
            feedback.textContent = "Correct! Well done.";
            endGame();
          } else if (data.result === 'artist') {
            // Artist is correct, but not the song
            fillRow(attemptNumber, userGuess, "artist");
            guessHistory.push({ attempt: attemptNumber, guess: userGuess, status: "artist" });
            feedback.textContent = "Right artist, but wrong song!";
            markWrongAttempt(userGuess);
          } else {
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