from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class NoteBase(BaseModel):
    title: str
    content: str
    color: Optional[str] = "#ffffff"
    position: Optional[int] = 0

class NoteCreate(NoteBase):
    pass

class NoteResponse(NoteBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class NoteReorder(BaseModel):
    id: int
    position: int
