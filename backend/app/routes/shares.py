from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user

from app.models.share import Share
from app.models.file import File
from app.models.folder import Folder
from app.models.user import User

from app.schemas.share import ShareCreate, ShareResponse


router = APIRouter(
    prefix="/shares",
    tags=["Sharing"]
)


@router.post("/", response_model=ShareResponse)
def create_share(
    share_data: ShareCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    if share_data.file_id is None and share_data.folder_id is None:
        raise HTTPException(
            status_code=400,
            detail="Provide either file_id or folder_id"
        )

    # Check file ownership
    if share_data.file_id is not None:

        file = db.query(File).filter(
            File.id == share_data.file_id,
            File.owner_id == current_user.id,
            File.deleted_at.is_(None)
        ).first()

        if not file:
            raise HTTPException(
                status_code=404,
                detail="File not found"
            )

    # Check folder ownership
    if share_data.folder_id is not None:

        folder = db.query(Folder).filter(
            Folder.id == share_data.folder_id,
            Folder.owner_id == current_user.id,
            Folder.deleted_at.is_(None)
        ).first()

        if not folder:
            raise HTTPException(
                status_code=404,
                detail="Folder not found"
            )

    # Check permission
    if share_data.permission not in ["viewer", "editor"]:
        raise HTTPException(
            status_code=400,
            detail="Permission must be viewer or editor"
        )

    # Check receiving user exists
    user = db.query(User).filter(
        User.email == share_data.shared_with_email
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User to share with not found"
        )

    new_share = Share(
        file_id=share_data.file_id,
        folder_id=share_data.folder_id,
        owner_id=current_user.id,
        shared_with_id=user.id,
        permission=share_data.permission
    )

    db.add(new_share)
    db.commit()
    db.refresh(new_share)

    return new_share


@router.get("/", response_model=list[ShareResponse])
def get_my_shares(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    shares = db.query(Share).filter(
        Share.owner_id == current_user.id
    ).all()

    return shares


@router.get("/received")
def get_received_shares(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    shares = db.query(Share).filter(
        Share.shared_with_id == current_user.id
    ).all()

    result = []

    for share in shares:

        file = None

        if share.file_id:
            file = db.query(File).filter(
                File.id == share.file_id,
                File.deleted_at.is_(None)
            ).first()

        owner = db.query(User).filter(
            User.id == share.owner_id
        ).first()

        if file:
            result.append({
                "id": share.id,
                "file_id": file.id,
                "folder_id": share.folder_id,
                "owner_id": share.owner_id,
                "shared_with_id": share.shared_with_id,
                "permission": share.permission,

                "file_name": file.name,
                "file_size": file.size,
                "mime_type": file.mime_type,

                "owner_name": owner.name if owner else "Unknown"
            })

    return result
@router.delete("/{share_id}")
def remove_share(
    share_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    share = db.query(Share).filter(
        Share.id == share_id
    ).first()

    if not share:
        raise HTTPException(
            status_code=404,
            detail="Share not found"
        )

    # Owner can remove the share
    if share.owner_id == current_user.id:
        db.delete(share)
        db.commit()

        return {
            "message": "File sharing removed successfully"
        }

    # Receiver can remove the file from their Shared list
    if share.shared_with_id == current_user.id:
        db.delete(share)
        db.commit()

        return {
            "message": "Shared file removed successfully"
        }

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to remove this share"
    )