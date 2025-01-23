# app.py
from fasthtml.common import *
import uvicorn
import random
import datetime
from starlette.requests import Request
from starlette.templating import Jinja2Templates
from starlette.responses import JSONResponse
from starlette.staticfiles import StaticFiles  # Make sure to import StaticFiles

templates = Jinja2Templates(directory="templates")

app = FastHTML()

# Mount static files (CSS, JS, etc.)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Predefined SoundCloud tracks with optional dates
# If 'date' is provided, the track is assigned to that date
# Otherwise, it can be used as a fallback random track
SOUNDCLOUD_TRACKS = [
    {
        "date": "2025-01-20",
        "url": "https://soundcloud.com/nelly-official/dilemma",
        "answer": "Dilemma - Nelly ft. Kelly Rowland"
    },
    {
        "date": "2025-01-21",
        "url": "https://soundcloud.com/eminemofficial/lose-yourself",
        "answer": "Lose Yourself - Eminem"
    },
    {
        "date": "2025-01-22",
        "url": "https://soundcloud.com/red-hot-chili-peppers-official/snow-hey-oh",
        "answer": "Snow (Hey Oh) - Red Hot Chili Peppers"
    },
    {
        "date": "2025-01-23",
        "url": "https://soundcloud.com/arethafranklin/aretha-franklin-you-make-me",
        "answer": "(You Make Me Feel Like) A Natural Woman - Aretha Franklin"
    },
    {
        "date": "2025-01-24",
        "url": "https://soundcloud.com/spice-girls-official/say-youll-be-there-single-mix",
        "answer": "Say You'll Be There - Spice Girls"
    },
    {
        "date": "2025-01-25",
        "url": "https://soundcloud.com/maggierogers/alaska",
        "answer": "Alaska - Maggie Rogers"
    },
    {
        "date": "2025-01-26",
        "url": "https://soundcloud.com/ofwgkta-official/frank-ocean-biking",
        "answer": "Biking - Frank Ocean",
    },
    {
        "date": "2025-01-27",
        "url": "https://soundcloud.com/mozart/requiem-in-d-minor-k-626-1",
        "answer": "Requiem in D minor, K. 626 Lacrimosa - Wolfgang Amadeus Mozart"
    }
]

def get_base_context(request: Request):
    return {"request": request}

def pick_daily_track():
    """
    Pick the track assigned to today if it exists.
    Otherwise, pick a random track from the list of tracks without a specific date.
    """
    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    
    # First, try to find a track assigned to today
    for track in SOUNDCLOUD_TRACKS:
        if track.get("date") == today_str:
            return track
    
    # If no track is assigned to today, select a random track without a specific date
    random_tracks = [track for track in SOUNDCLOUD_TRACKS if "date" not in track]
    if random_tracks:
        print("used random")
        return random.choice(random_tracks)
    else:
        # Fallback in case there are no random tracks
        return None

@app.get("/")
def home(request: Request):
    context = get_base_context(request)
    # Pick the track based on today's date or random
    selected = pick_daily_track()
    
    if selected:
        context["soundcloud_track"] = selected["url"]
        context["answer"] = selected["answer"]
    else:
        context["soundcloud_track"] = ""
        context["answer"] = "No track available for today."
    
    # Also provide a "puzzle_id" = today's date
    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    context["puzzle_id"] = today_str

    return templates.TemplateResponse("home.html", context)

@app.post("/guess")
async def guess(request: Request):
    """Check if the user's guess is correct."""
    data = await request.json()
    user_guess = data.get("guess", "").strip().lower()
    correct_answer = data.get("answer", "").strip().lower()

    if user_guess == correct_answer:
        return JSONResponse({"result": "correct"})
    else:
        return JSONResponse({"result": "incorrect"})

serve()