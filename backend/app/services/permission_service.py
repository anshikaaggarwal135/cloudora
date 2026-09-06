from sqlalchemy.orm import Session

from app.models.share import Share
from app.models.file import File


def get_file_permission(
    db: Session,
    file_id: int,
    user_id: int
):
    # Check if user owns the file
    file = db.query(File).filter(
        File.id == file_id,
        File.owner_id == user_id
    ).first()

    if file:
        return "owner"

    # Check if file was shared with the user
    share = db.query(Share).filter(
        Share.file_id == file_id,
        Share.shared_with_id == user_id
    ).first()

    if not share:
        return None

    return share.permission