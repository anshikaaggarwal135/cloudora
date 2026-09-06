from pydantic import BaseModel


class FolderCreate(BaseModel):
    name: str
    parent_id: int | None = None


class FolderUpdate(BaseModel):
    name: str


class FolderResponse(BaseModel):
    id: int
    name: str
    owner_id: int
    parent_id: int | None

    class Config:
        from_attributes = True