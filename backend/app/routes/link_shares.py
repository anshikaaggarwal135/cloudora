from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
import secrets
from fastapi.responses import Response
from datetime import datetime

from app.services.storage_service import download_file
from passlib.context import CryptContext
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.link_share import LinkShare
from app.models.file import File
from app.models.user import User
from app.schemas.link_share import LinkShareCreate, LinkShareResponse


router = APIRouter(prefix="/links", tags=["Public Links"])
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

@router.post("/", response_model=LinkShareResponse)
def create_link_share(
    link_data: LinkShareCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):


    # Check that the file belongs to the current user
    file = db.query(File).filter(
        File.id == link_data.file_id,
        File.owner_id == current_user.id,
        File.deleted_at.is_(None)
    ).first()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    # Check expiry date
    if link_data.expires_at is not None:
        if link_data.expires_at <= datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail="Expiry date must be in the future"
            )

    # Generate secure random token
    token = secrets.token_urlsafe(32)

    password_hash = None

    if link_data.password:
        password_hash = pwd_context.hash(
            link_data.password
        )


    new_link = LinkShare(
        file_id=link_data.file_id,
        token=token,
        expires_at=link_data.expires_at,
        password_hash=password_hash,
        is_active=True
    )

    db.add(new_link)
    db.commit()
    db.refresh(new_link)

    return new_link
@router.get("/{token}")
def access_public_link(
    token: str,
    password: str | None = Query(
        default=None
    ),
    db: Session = Depends(get_db)
):

    link = db.query(LinkShare).filter(
        LinkShare.token == token,
        LinkShare.is_active == True
    ).first()

    if not link:
        raise HTTPException(
            status_code=404,
            detail="Public link not found or inactive"
        )

    # Check expiration
    if link.expires_at is not None:

        if link.expires_at <= datetime.utcnow():

            link.is_active = False
            db.commit()

            raise HTTPException(
                status_code=410,
                detail="Public link has expired"
            )

    # Check password
    if link.password_hash:

        if not password:
            raise HTTPException(
                status_code=401,
                detail="Password is required"
            )

        if not pwd_context.verify(
            password,
            link.password_hash
        ):
            raise HTTPException(
                status_code=401,
                detail="Incorrect password"
            )

    # Find the file
    file = db.query(File).filter(
        File.id == link.file_id,
        File.deleted_at.is_(None)
    ).first()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    # Download from Supabase Storage
    try:

        file_content = download_file(
            file.storage_path
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"File download failed: {str(e)}"
        )

    return Response(
        content=file_content,
        media_type=file.mime_type,
        headers={
            "Content-Disposition":
            f'inline; filename="{file.original_name}"'
        }
    )
@router.delete("/{link_id}")
def disable_link_share(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    link = db.query(LinkShare).join(
        File,
        LinkShare.file_id == File.id
    ).filter(
        LinkShare.id == link_id,
        File.owner_id == current_user.id
    ).first()

    if not link:
        raise HTTPException(
            status_code=404,
            detail="Public link not found"
        )

    if not link.is_active:
        raise HTTPException(
            status_code=400,
            detail="Public link is already disabled"
        )

    link.is_active = False

    db.commit()

    return {
        "message": "Public link disabled successfully"
    }
@router.get(
    "/",
    response_model=list[LinkShareResponse]
)
def get_my_link_shares(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    links = db.query(LinkShare).join(
        File,
        LinkShare.file_id == File.id
    ).filter(
        File.owner_id == current_user.id
    ).all()

    return links
@router.put("/{link_id}/enable")
def enable_link_share(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    link = db.query(LinkShare).join(
        File,
        LinkShare.file_id == File.id
    ).filter(
        LinkShare.id == link_id,
        File.owner_id == current_user.id
    ).first()

    if not link:
        raise HTTPException(
            status_code=404,
            detail="Public link not found"
        )

    if link.is_active:
        raise HTTPException(
            status_code=400,
            detail="Public link is already active"
        )

    # Do not enable an expired link
    if link.expires_at is not None:
        if link.expires_at <= datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail="Cannot enable an expired public link"
            )

    link.is_active = True

    db.commit()

    return {
        "message": "Public link enabled successfully"
    }