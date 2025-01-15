// static/js/game.js

document.addEventListener('DOMContentLoaded', () => {
    const guessForm = document.getElementById('guess-form');
    const guessInput = document.getElementById('guess-input');
    const feedback = document.getElementById('feedback');
    const selectedSongInput = document.getElementById('selected-song');

    if (guessForm) {
        guessForm.addEventListener('submit', (e) => {
            e.preventDefault();  // Prevent the form from submitting traditionally

            const userGuess = guessInput.value.trim();
            const selectedSong = selectedSongInput.value.trim().toLowerCase();  // Ensure consistency

            if (userGuess === "") {
                feedback.textContent = "Please enter a guess.";
                feedback.style.color = "red";
                return;
            }

            // Send the guess to the server
            fetch('/guess', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ guess: userGuess, song: selectedSong }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.result === 'correct') {
                    feedback.textContent = "🎉 Correct! Well done.";
                    feedback.style.color = "green";
                    // Optionally, you can reload the page or load a new song
                } else {
                    feedback.textContent = "❌ Incorrect. Try again!";
                    feedback.style.color = "red";
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                feedback.textContent = "An error occurred. Please try again.";
                feedback.style.color = "red";
            });

            // Clear the input field for the next guess
            guessInput.value = "";
        });
    }
});
