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
        "url": "https://soundcloud.com/jonimitchell/a-case-of-you",
        "answer": "A Case of You - Joni Mitchell",
    },
    {
        "date": "2025-01-28",
        "url": "https://soundcloud.com/ofwgkta-official/frank-ocean-biking",
        "answer": "Biking - Frank Ocean",
    },
    {
        "date": "2025-01-27",
        "url": "https://soundcloud.com/lordemusic/perfect-places",
        "answer": "Perfect Places - Lorde",
    },
    {
        "date": "2025-01-29",
        "url": "https://soundcloud.com/lana-del-rey/west-coast-1",
        "answer": "West Coast - Lana Del Rey",
    },
    {
        "date": "2025-01-31",
        "url": "https://soundcloud.com/creedence-clearwater-revival/have-you-ever-seen-the-rain-2",
        "answer": "Have You Ever Seen the Rain? - Creedence Clearwater Revival",
    },
    {
        "date": "2025-01-30",
        "url": "https://soundcloud.com/billieeilish/when-the-partys-over",
        "answer": "When the Party's Over - Billie Eilish",
    },
    {
        "date": "2025-02-01",
        "url": "https://soundcloud.com/beyonce/beyonce-texas-hold-em",
        "answer": "Texas Hold 'Em - Beyoncé",
    },
    {
        "date": "2025-02-02",
        "url": "https://soundcloud.com/al-green-official/tired-of-being-alone-3",
        "answer": "Tired of Being Alone - Al Green",
    },
    {
        "date": "2025-02-03",
        "url": "https://soundcloud.com/dualipa/houdini",
        "answer": "Houdini - Dua Lipa",
    },
    {
        "date": "2025-02-05",
        "url": "https://soundcloud.com/marvin-gaye/whats-going-on-1",
        "answer": "What's Going On - Marvin Gaye",
    },
    {
        "date": "2025-02-06",
        "url": "https://soundcloud.com/prince/purple-rain",
        "answer": "Purple Rain - Prince"
    },
    {
        "date": "2025-02-07",
        "url": "https://soundcloud.com/kendrick-lamar-music/not-like-us",
        "answer": "Not Like Us - Kendrick Lamar",
    },
    {
        "date": "2025-02-08",
        "url": "https://soundcloud.com/theweeknd/blinding-lights",
        "answer": "Blinding Lights - The Weeknd",
    },
    {
        "date": "2025-02-09",
        "url": "https://soundcloud.com/village-people/ymca",
        "answer": "YMCA - Village People",
    },
    {
        "date": "2025-02-10",
        "url": "https://soundcloud.com/jerry-lee-lewis-official/great-balls-of-fire-46",
        "answer": "Great Balls of Fire - Jerry Lee Lewis"
    },
    {
        "date": "2025-02-04",
        "url": "https://soundcloud.com/oliviarodrigo/good-4-u-1",
        "answer": "good 4 u - Olivia Rodrigo"
    },
    {
        "date": "2025-02-11",
        "url": "https://soundcloud.com/asvpxrocky/tony-tone-feat-puff-daddy",
        "answer": "Tony Tone - A$AP Rocky"
    },
    {
        "date": "2025-02-12",
        "url": "https://soundcloud.com/thechemicalbrothers/galvanize",
        "answer": "Galvanize - The Chemical Brothers"
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
    data = await request.json()
    user_guess = data.get("guess", "").strip().lower()
    correct_answer = data.get("answer", "").strip().lower()

    # Exact match wins the game
    if user_guess == correct_answer:
        return JSONResponse({"result": "correct"})

    # If not an exact match, check if the guess matches the artist.
    # We assume the correct_answer is formatted as "Song Title - Artist"
    if "-" in correct_answer:
        artist = correct_answer.split("-")[-1].strip()
        if user_guess == artist:
            return JSONResponse({"result": "artist"})
    
    return JSONResponse({"result": "incorrect"})

serve()