# app.py
from fasthtml.common import *
import uvicorn
import random
import datetime
from starlette.requests import Request
from starlette.templating import Jinja2Templates
from starlette.responses import JSONResponse

templates = Jinja2Templates(directory="templates")

app = FastHTML()

# Mount static files (CSS, JS, etc.)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Example SoundCloud tracks (track URL + correct answer).
SOUNDCLOUD_TRACKS = [
    {
        "url": "https://api.soundcloud.com/tracks/1660314906",
        "answer": "harlow"  # For demo only
    },
    {
        "url": "https://api.soundcloud.com/tracks/590222589",
        "answer": "malone"
    }
]

def get_base_context(request: Request):
    return {"request": request}

def pick_daily_track():
    """
    Pick the same track for everyone on a given day.
    We do this by seeding the random generator with today's date,
    then pick one from the list.
    """
    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    random.seed(today_str)  # seed with the date so it's deterministic for everyone
    return random.choice(SOUNDCLOUD_TRACKS)

@app.get("/")
def home(request: Request):
    context = get_base_context(request)
    # Always pick the same track for the day:
    selected = pick_daily_track()
    context["soundcloud_track"] = selected["url"]
    context["answer"] = selected["answer"]

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
