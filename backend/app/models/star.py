from sqlalchemy import Column, Integer, DateTime, ForeignKey
from datetime import datetime

from app.core.database import Base


class Star(Base):
    __tablename__ = "stars"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    file_id = Column(
        Integer,
        ForeignKey("files.id"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )