from pydantic import BaseModel
from datetime import datetime


class LinkShareCreate(BaseModel):
    file_id: int
    expires_at: datetime | None = None
    password: str | None = None


class LinkShareResponse(BaseModel):
    id: int
    file_id: int
    token: str
    expires_at: datetime | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True