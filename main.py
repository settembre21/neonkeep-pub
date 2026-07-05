from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import List

import models, schemas, auth
from database import SessionLocal, engine

# Auto-create tables (SQLite)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="NEON KEEP // SECURE")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Page Routing
@app.get("/", response_class=HTMLResponse)
def read_root(request: Request, db: Session = Depends(get_db)):
    # Check if any user exists in the database
    users_count = db.query(models.User).count()
    if users_count == 0:
        # First boot: redirect to initial admin registration screen
        return RedirectResponse(url="/setup", status_code=status.HTTP_303_SEE_OTHER)

    try:
        auth.get_current_user_id(request)
        # Authenticated: render main kept notes board
        return templates.TemplateResponse(request=request, name="index.html")
    except HTTPException:
        # Not authenticated: redirect to login page
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

@app.get("/login", response_class=HTMLResponse)
def get_login_page(request: Request, db: Session = Depends(get_db)):
    # If no users exist, force redirect to setup
    if db.query(models.User).count() == 0:
        return RedirectResponse(url="/setup", status_code=status.HTTP_303_SEE_OTHER)
    
    # If already logged in, redirect to home
    try:
        auth.get_current_user_id(request)
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    except HTTPException:
        return templates.TemplateResponse(request=request, name="login.html")

@app.get("/setup", response_class=HTMLResponse)
def get_setup_page(request: Request, db: Session = Depends(get_db)):
    # Setup only allowed if zero users exist in system
    if db.query(models.User).count() > 0:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    return templates.TemplateResponse(request=request, name="setup.html")

# Authentication API
@app.post("/auth/register")
def register_initial_admin(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Block registration if database already has a user
    if db.query(models.User).count() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is locked. Admin account already exists."
        )
    
    hashed_pwd = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_pwd)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"status": "ok", "message": "Admin user registered successfully."}

@app.post("/auth/login")
def login(response: Response, user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Generate JWT
    token = auth.create_access_token(data={"user_id": db_user.id})
    
    # Set as HTTPOnly Cookie (Secure cookie session)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=60 * 24 * 7 * 60, # 7 days
        samesite="lax",
        secure=False # In production, set to True if HTTPS is used
    )
    return {"status": "ok", "message": "Successfully logged in."}

@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"status": "ok", "message": "Successfully logged out."}

# Secured Notes API
@app.get("/notes", response_model=List[schemas.NoteResponse])
def get_notes(
    request: Request,
    db: Session = Depends(get_db),
    user_id: int = Depends(auth.get_current_user_id)
):
    return db.query(models.Note).filter(models.Note.user_id == user_id).order_by(models.Note.position.asc()).all()

@app.post("/notes", response_model=schemas.NoteResponse)
def create_note(
    note: schemas.NoteCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(auth.get_current_user_id)
):
    # Set position to end of list
    last_note = db.query(models.Note).filter(models.Note.user_id == user_id).order_by(models.Note.position.desc()).first()
    position = (last_note.position + 1) if last_note else 0

    db_note = models.Note(
        title=note.title,
        content=note.content,
        color=note.color,
        position=position,
        user_id=user_id
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@app.put("/notes/reorder")
def reorder_notes(
    items: List[schemas.NoteReorder],
    db: Session = Depends(get_db),
    user_id: int = Depends(auth.get_current_user_id)
):
    # Update positions of user's notes
    for item in items:
        db_note = db.query(models.Note).filter(
            models.Note.id == item.id,
            models.Note.user_id == user_id
        ).first()
        if db_note:
            db_note.position = item.position
    db.commit()
    return {"status": "ok"}

@app.put("/notes/{note_id}", response_model=schemas.NoteResponse)
def update_note(
    note_id: int,
    note: schemas.NoteCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(auth.get_current_user_id)
):
    db_note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.user_id == user_id
    ).first()
    
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    db_note.title = note.title
    db_note.content = note.content
    db_note.color = note.color
    # Do not overwrite position column during normal update edit
    
    db.commit()
    db.refresh(db_note)
    return db_note

@app.delete("/notes/{note_id}")
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(auth.get_current_user_id)
):
    db_note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.user_id == user_id
    ).first()

    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(db_note)
    db.commit()
    return {"status": "ok", "message": "Note deleted"}
