import os
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload


DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"]


class GoogleDriveConfigError(RuntimeError):
    pass


def _get_service_account_file() -> str:
    raw_path = os.environ.get("GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE", "").strip()
    if not raw_path:
      raise GoogleDriveConfigError(
          "GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE is not configured."
      )

    resolved_path = Path(raw_path)
    if not resolved_path.exists():
      raise GoogleDriveConfigError(
          f"Service account file not found: {resolved_path}"
      )

    return str(resolved_path)


def _get_parent_folder_id() -> str:
    folder_id = os.environ.get("GOOGLE_DRIVE_PARENT_FOLDER_ID", "").strip()
    if not folder_id:
      raise GoogleDriveConfigError(
          "GOOGLE_DRIVE_PARENT_FOLDER_ID is not configured."
      )
    return folder_id


def _build_drive_service():
    credentials = service_account.Credentials.from_service_account_file(
        _get_service_account_file(),
        scopes=DRIVE_SCOPES,
    )
    return build("drive", "v3", credentials=credentials)


def upload_file_to_drive(file_stream, filename: str, mime_type: str | None = None):
    service = _build_drive_service()
    parent_folder_id = _get_parent_folder_id()

    metadata = {
        "name": filename,
        "parents": [parent_folder_id],
    }

    media = MediaIoBaseUpload(
        file_stream,
        mimetype=mime_type or "application/octet-stream",
        resumable=False,
    )

    created = (
        service.files()
        .create(
            body=metadata,
            media_body=media,
            fields="id,name,mimeType,size,webViewLink,webContentLink",
        )
        .execute()
    )

    # Allow the app to expose uploaded files with a direct Drive link.
    service.permissions().create(
        fileId=created["id"],
        body={"type": "anyone", "role": "reader"},
    ).execute()

    refreshed = (
        service.files()
        .get(
            fileId=created["id"],
            fields="id,name,mimeType,size,webViewLink,webContentLink",
        )
        .execute()
    )

    return refreshed
