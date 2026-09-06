import uuid
from urllib.parse import quote
from datetime import datetime
from app.models.link_share import LinkShare
import re
from fastapi import (
    APIRouter,
    Depends,
    File as FastAPIFile,
    UploadFile,
    HTTPException,
    Query
)

from fastapi.responses import Response

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.share import Share
from app.models.file import File
from app.models.folder import Folder
from app.models.user import User
from app.models.star import Star

from app.schemas.file import FileResponse

from app.services.storage_service import (
    upload_file,
    download_file,
    delete_file
)

from app.services.permission_service import get_file_permission


router = APIRouter(
    prefix="/files",
    tags=["Files"]
)


MAX_FILE_SIZE = 50 * 1024 * 1024


ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "text/plain",
    "application/zip",
}


# -------------------------------------------------
# UPLOAD FILE
# -------------------------------------------------

@router.post(
    "/upload",
    response_model=FileResponse
)
async def upload_cloudora_file(
    uploaded_file: UploadFile = FastAPIFile(...),
    folder_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # Validate file type

    if uploaded_file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File type is not supported"
        )

    # Validate folder

    if folder_id is not None:

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

    # Read file

    file_content = await uploaded_file.read()

    # Validate size

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 50 MB limit"
        )

    # Generate unique storage path
    def sanitize_filename(filename: str) -> str:
        filename = filename.replace(" ", "_")
        filename = filename.replace("–", "-")
        filename = filename.replace("—", "-")

        filename = re.sub(
            r"[^a-zA-Z0-9._-]",
            "",
            filename
        )

        return filename
    safe_filename = sanitize_filename(uploaded_file.filename)

    storage_path = (
    f"{current_user.id}/"
    f"{uuid.uuid4()}_"
    f"{safe_filename}"
)

    # Upload to Supabase Storage

    try:

        upload_file(
            file_content,
            storage_path,
            uploaded_file.content_type
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Storage upload failed: {str(e)}"
        )

    # Save metadata in PostgreSQL

    new_file = File(
        name=uploaded_file.filename,
        original_name=uploaded_file.filename,
        storage_path=storage_path,
        mime_type=uploaded_file.content_type,
        size=len(file_content),
        owner_id=current_user.id,
        folder_id=folder_id
    )

    db.add(new_file)
    db.commit()
    db.refresh(new_file)

    return new_file


# -------------------------------------------------
# LIST MY FILES
# -------------------------------------------------

@router.get(
    "/",
    response_model=list[FileResponse]
)
def get_my_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    files = db.query(File).filter(
        File.owner_id == current_user.id,
        File.deleted_at.is_(None)
    ).all()

    result = []

    for file in files:

        is_starred = db.query(Star).filter(
            Star.user_id == current_user.id,
            Star.file_id == file.id
        ).first() is not None

        file_data = {
            "id": file.id,
            "name": file.name,
            "original_name": file.original_name,
            "storage_path": file.storage_path,
            "mime_type": file.mime_type,
            "size": file.size,
            "owner_id": file.owner_id,
            "folder_id": file.folder_id,
            "created_at": file.created_at,
            "updated_at": file.updated_at,
            "deleted_at": file.deleted_at,
            "is_starred": is_starred
        }

        result.append(file_data)

    return result


# -------------------------------------------------
# SEARCH MY FILES
# -------------------------------------------------

@router.get(
    "/search",
    response_model=list[FileResponse]
)
def search_my_files(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    files = db.query(File).filter(
        File.owner_id == current_user.id,
        File.deleted_at.is_(None),
        File.name.ilike(f"%{q}%")
    ).all()

    result = []

    for file in files:

        is_starred = db.query(Star).filter(
            Star.user_id == current_user.id,
            Star.file_id == file.id
        ).first() is not None

        file_data = {
            "id": file.id,
            "name": file.name,
            "original_name": file.original_name,
            "storage_path": file.storage_path,
            "mime_type": file.mime_type,
            "size": file.size,
            "owner_id": file.owner_id,
            "folder_id": file.folder_id,
            "created_at": file.created_at,
            "updated_at": file.updated_at,
            "deleted_at": file.deleted_at,
            "is_starred": is_starred
        }

        result.append(file_data)

    return result


# -------------------------------------------------
# VIEW TRASH
# -------------------------------------------------

@router.get(
    "/trash",
    response_model=list[FileResponse]
)
def get_trashed_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    files = db.query(File).filter(
        File.owner_id == current_user.id,
        File.deleted_at.is_not(None)
    ).all()

    return files

@router.get("/stats")
def get_file_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    total_files = db.query(File).filter(
        File.owner_id == current_user.id,
        File.deleted_at.is_(None)
    ).count()

    trash_files = db.query(File).filter(
        File.owner_id == current_user.id,
        File.deleted_at.is_not(None)
    ).count()

    starred_files = db.query(Star).filter(
        Star.user_id == current_user.id
    ).count()

    total_shared = db.query(Share).filter(
        Share.owner_id == current_user.id
    ).count()

    active_files = db.query(File).filter(
        File.owner_id == current_user.id,
        File.deleted_at.is_(None)
    ).all()

    total_storage = sum(
        file.size or 0
        for file in active_files
    )

    return {
        "total_files": total_files,
        "total_storage": total_storage,
        "total_shared": total_shared,
        "total_starred": starred_files,
        "trash_files": trash_files
    }
# -------------------------------------------------
# DOWNLOAD FILE
# -------------------------------------------------

@router.get("/{file_id}/download")
def download_cloudora_file(
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

    # Owner has access
    if file.owner_id == current_user.id:
        permission = "owner"

    else:
        # Check whether file was shared with current user
        share = db.query(Share).filter(
            Share.file_id == file_id,
            Share.shared_with_id == current_user.id
        ).first()

        if not share:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access this file"
            )

        permission = share.permission

    # Download file from Supabase
    try:
        file_content = download_file(
            file.storage_path
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"File download failed: {str(e)}"
        )

    safe_filename = quote(file.name, safe="")

    return Response(
        content=file_content,
        media_type=file.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"
        }
    )

# -------------------------------------------------
# VIEW FILE
# -------------------------------------------------
@router.get("/{file_id}/view")
def view_cloudora_file(
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

    # Owner
    if file.owner_id == current_user.id:
        has_access = True

    else:
        share = db.query(Share).filter(
            Share.file_id == file_id,
            Share.shared_with_id == current_user.id
        ).first()

        if not share:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to view this file"
            )

        # Both viewer and editor can view
        has_access = True

    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this file"
        )

    try:

        file_content = download_file(
            file.storage_path
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"File download failed: {str(e)}"
        )

    safe_filename = quote(file.name, safe="")

    return Response(
        content=file_content,
        media_type=file.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{safe_filename}"
        }
    )
@router.put(
    "/{file_id}/edit",
    response_model=FileResponse
)
async def edit_cloudora_file(
    file_id: int,
    uploaded_file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # Find file
    file = db.query(File).filter(
        File.id == file_id,
        File.deleted_at.is_(None)
    ).first()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    # Check permission
    permission = get_file_permission(
        db,
        file_id,
        current_user.id
    )

    if permission not in ["owner", "editor"]:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to edit this file"
        )

    # Validate file type
    if uploaded_file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File type is not supported"
        )

    # Read new file
    file_content = await uploaded_file.read()

    # Validate size
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 50 MB limit"
        )

    # Upload new version
    try:

        upload_file(
            file_content,
            file.storage_path,
            uploaded_file.content_type
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Storage update failed: {str(e)}"
        )

    # Update metadata
    file.name = uploaded_file.filename
    file.original_name = uploaded_file.filename
    file.mime_type = uploaded_file.content_type
    file.size = len(file_content)
    file.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(file)

    return file
# -------------------------------------------------
# DELETE FILE → MOVE TO TRASH
# -------------------------------------------------

@router.delete("/{file_id}")
def delete_cloudora_file(
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

    permission = get_file_permission(
        db,
        file_id,
        current_user.id
    )

    if permission not in ["owner", "editor"]:

        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this file"
        )

    file.deleted_at = datetime.utcnow()

    db.commit()

    return {
        "message": "File moved to trash successfully"
    }


# -------------------------------------------------
# RESTORE FILE
# -------------------------------------------------

@router.put(
    "/{file_id}/restore"
)
def restore_cloudora_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    file = db.query(File).filter(
        File.id == file_id,
        File.owner_id == current_user.id,
        File.deleted_at.is_not(None)
    ).first()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found in trash"
        )

    file.deleted_at = None

    db.commit()

    return {
        "message": "File restored successfully"
    }
# -------------------------------------------------
# PERMANENTLY DELETE FILE
# -------------------------------------------------

@router.delete("/{file_id}/permanent")
def permanently_delete_cloudora_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # Find file in trash belonging to current user
    file = db.query(File).filter(
        File.id == file_id,
        File.owner_id == current_user.id,
        File.deleted_at.is_not(None)
    ).first()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found in trash"
        )

    # Save storage path before deleting database record
    storage_path = file.storage_path

    # -------------------------------------------------
    # DELETE RELATED DATABASE RECORDS FIRST
    # -------------------------------------------------

    try:

        # Delete link shares/public links
        db.query(LinkShare).filter(
            LinkShare.file_id == file.id
        ).delete(
            synchronize_session=False
        )

        # Delete user shares
        db.query(Share).filter(
            Share.file_id == file.id
        ).delete(
            synchronize_session=False
        )

        # Delete stars
        db.query(Star).filter(
            Star.file_id == file.id
        ).delete(
            synchronize_session=False
        )

        # Delete file record
        db.delete(file)

        db.commit()

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Database deletion failed: {str(e)}"
        )

    # -------------------------------------------------
    # DELETE FILE FROM SUPABASE STORAGE
    # -------------------------------------------------

    try:

        delete_file(storage_path)

    except Exception as e:

        # Database record is already deleted.
        # Storage deletion failure should not restore
        # the database record.
        print(
            f"WARNING: Database deleted but storage deletion failed: {str(e)}"
        )

        return {
            "message": "File permanently deleted from database, "
                       "but storage cleanup failed."
        }

    return {
        "message": "File permanently deleted successfully"
    }