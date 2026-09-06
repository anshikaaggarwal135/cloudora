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


class FileVersion(Base):
    __tablename__ = "file_versions"

    id = Column(Integer, primary_key=True, index=True)

    file_id = Column(
        Integer,
        ForeignKey("files.id"),
        nullable=False
    )

    storage_path = Column(
        String(500),
        nullable=False
    )

    size = Column(
        BigInteger,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )