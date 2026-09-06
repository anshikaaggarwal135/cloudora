from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user

from app.models.folder import Folder
from app.models.user import User

from app.schemas.folder import (
    FolderCreate,
    FolderUpdate,
    FolderResponse
)


router = APIRouter(
    prefix="/folders",
    tags=["Folders"]
)


@router.post(
    "/",
    response_model=FolderResponse
)
def create_folder(
    data: FolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # If parent folder is provided,
    # check that it exists and belongs to the user
    if data.parent_id is not None:

        parent_folder = db.query(Folder).filter(
            Folder.id == data.parent_id,
            Folder.owner_id == current_user.id,
            Folder.deleted_at.is_(None)
        ).first()

        if not parent_folder:
            raise HTTPException(
                status_code=404,
                detail="Parent folder not found"
            )

    folder = Folder(
        name=data.name,
        owner_id=current_user.id,
        parent_id=data.parent_id
    )

    db.add(folder)
    db.commit()
    db.refresh(folder)

    return folder


@router.get(
    "/",
    response_model=list[FolderResponse]
)
def get_folders(
    parent_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    folders = db.query(Folder).filter(
        Folder.owner_id == current_user.id,
        Folder.parent_id == parent_id,
        Folder.deleted_at.is_(None)
    ).all()

    return folders

@router.get("/stats")
def get_folder_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    total_folders = db.query(Folder).filter(
        Folder.owner_id == current_user.id,
        Folder.deleted_at.is_(None)
    ).count()

    trash_folders = db.query(Folder).filter(
        Folder.owner_id == current_user.id,
        Folder.deleted_at.is_not(None)
    ).count()

    return {
        "total_folders": total_folders,
        "trash_folders": trash_folders
    }
@router.get(
    "/{folder_id}",
    response_model=FolderResponse
)
def get_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.owner_id == current_user.id,
        Folder.deleted_at.is_(None)
    ).first()

    if not folder:
        raise HTTPException(
            status_code=404,
            detail="Folder not found"
        )

    return folder


@router.put(
    "/{folder_id}",
    response_model=FolderResponse
)
def rename_folder(
    folder_id: int,
    data: FolderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.owner_id == current_user.id,
        Folder.deleted_at.is_(None)
    ).first()

    if not folder:
        raise HTTPException(
            status_code=404,
            detail="Folder not found"
        )

    folder.name = data.name

    db.commit()
    db.refresh(folder)

    return folder


@router.delete(
    "/{folder_id}"
)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.owner_id == current_user.id,
        Folder.deleted_at.is_(None)
    ).first()

    if not folder:
        raise HTTPException(
            status_code=404,
            detail="Folder not found"
        )

    from datetime import datetime

    folder.deleted_at = datetime.utcnow()

    db.commit()

    return {
        "message": "Folder moved to trash"
    }