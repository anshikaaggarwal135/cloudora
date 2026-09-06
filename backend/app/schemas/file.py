from pydantic import BaseModel
from datetime import datetime


class FileResponse(BaseModel):
    id: int
    name: str
    original_name: str
    storage_path: str
    mime_type: str | None
    size: int
    owner_id: int
    folder_id: int | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None
    is_starred: bool = False

    class Config:
        from_attributes = True