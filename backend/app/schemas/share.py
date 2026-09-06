from pydantic import BaseModel
from datetime import datetime

class ShareCreate(BaseModel):
    file_id: int | None = None
    folder_id: int | None = None
    shared_with_email: str
    permission: str


class ShareResponse(BaseModel):
    id: int
    file_id: int | None
    folder_id: int | None
    owner_id: int
    shared_with_id: int
    permission: str

    file_name: str | None = None
    file_size: int | None = None
    mime_type: str | None = None
    owner_name: str | None = None

    class Config:
        from_attributes = True