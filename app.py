# app.py
from fasthtml.common import *
import uvicorn
import os
import random
import starlette
from starlette.requests import Request
from starlette.templating import Jinja2Templates


# Initialize templates
templates = Jinja2Templates(directory='templates')


app = FastHTML()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Utility function to get base context (if needed)
def get_base_context(request: Request):
    return {'request': request}

# Route for the Home/Game Page
@app.get("/")
def home(request: Request):
    context = get_base_context(request)
    
    # Select a random song snippet
    music_dir = os.path.join(os.path.dirname(__file__), 'static', 'music')
    try:
        songs = os.listdir(music_dir)
        selected_song = random.choice(songs)
        song_title = os.path.splitext(selected_song)[0].lower()  # Extract song title without extension
        context['song'] = selected_song  # Pass the selected song filename to the template
    except FileNotFoundError:
        context['error'] = "Music directory not found."
    except IndexError:
        context['error'] = "No songs available."

    return templates.TemplateResponse('home.html', context)

# API Endpoint to Handle Guesses
@app.post("/guess")
async def guess(request: Request):
    data = await request.json()
    user_guess = data.get('guess', '').strip().lower()
    selected_song = data.get('song', '').strip().lower()
    
    # Extract the actual song name from the filename (e.g., 'song1' from 'song1.mp3')
    actual_song = os.path.splitext(selected_song)[0].lower()

    # Simple verification: Check if the guess matches the song title
    if user_guess == actual_song:
        result = 'correct'
    else:
        result = 'incorrect'

    return {"result": result}

serve()