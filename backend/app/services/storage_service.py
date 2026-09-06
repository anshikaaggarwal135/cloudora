import os

from dotenv import load_dotenv
from supabase import create_client


load_dotenv()


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

BUCKET_NAME = "cloudora-files"


supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY
)


def upload_file(
    file_content: bytes,
    storage_path: str,
    content_type: str
):

    result = supabase.storage.from_(
        BUCKET_NAME
    ).upload(
        storage_path,
        file_content,
        {
            "content-type": content_type,
            "upsert": "false"
        }
    )

    return result


def delete_file(storage_path: str):

    return supabase.storage.from_(
        BUCKET_NAME
    ).remove([
        storage_path
    ])

def download_file(storage_path: str):
    return supabase.storage.from_(BUCKET_NAME).download(storage_path)