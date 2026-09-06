from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    BigInteger
)
from datetime import datetime

from app.core.database import Base


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(255), nullable=False)

    original_name = Column(String(255), nullable=False)

    storage_path = Column(String(500), nullable=False)

    mime_type = Column(String(100), nullable=True)

    size = Column(BigInteger, nullable=False)

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    folder_id = Column(
        Integer,
        ForeignKey("folders.id"),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    deleted_at = Column(
        DateTime,
        nullable=True
    )