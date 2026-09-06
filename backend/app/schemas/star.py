from pydantic import BaseModel
from datetime import datetime


class StarResponse(BaseModel):
    id: int
    user_id: int
    file_id: int
    created_at: datetime

    class Config:
        from_attributes = True