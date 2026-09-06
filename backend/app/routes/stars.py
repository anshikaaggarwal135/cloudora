from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user

from app.models.star import Star
from app.models.file import File
from app.models.user import User

from app.schemas.star import StarResponse


router = APIRouter(
    prefix="/stars",
    tags=["Stars"]
)


@router.post(
    "/{file_id}",
    response_model=StarResponse
)
def star_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    file = db.query(File).filter(
    File.id == file_id,
    File.deleted_at.is_(None)
).first()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    existing_star = db.query(Star).filter(
        Star.user_id == current_user.id,
        Star.file_id == file_id
    ).first()

    if existing_star:
        raise HTTPException(
            status_code=400,
            detail="File is already starred"
        )

    new_star = Star(
        user_id=current_user.id,
        file_id=file_id
    )

    db.add(new_star)
    db.commit()
    db.refresh(new_star)

    return new_star
@router.delete("/{file_id}")
def unstar_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    star = db.query(Star).filter(
        Star.user_id == current_user.id,
        Star.file_id == file_id
    ).first()

    if not star:
        raise HTTPException(
            status_code=404,
            detail="Star not found"
        )

    db.delete(star)
    db.commit()

    return {
        "message": "File unstarred successfully"
    }
@router.get("/", response_model=list[StarResponse])
def get_starred_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    stars = db.query(Star).filter(
        Star.user_id == current_user.id
    ).all()

    return stars