from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from .rag import (
    DocumentProcessingError,
    extract_document_context,
)

router = APIRouter()

SUPPORTED_EXTENSIONS = frozenset({".pdf", ".docx", ".md", ".txt"})
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
READ_CHUNK_SIZE_BYTES = 64 * 1024


@router.post("/documents", status_code=status.HTTP_200_OK)
async def process_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A file name is required.",
        )

    filename = Path(file.filename).name
    extension = Path(filename).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Supported files are PDF, DOCX, Markdown, and plain text.",
        )

    size_bytes = 0
    content = bytearray()

    try:
        while chunk := await file.read(READ_CHUNK_SIZE_BYTES):
            size_bytes += len(chunk)

            if size_bytes > MAX_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="Files must be 10 MB or smaller.",
                )
            content.extend(chunk)
    finally:
        await file.close()

    try:
        document_context, truncated = extract_document_context(
            filename,
            bytes(content),
        )
    except DocumentProcessingError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error

    return {
        "status": "processed",
        "filename": filename,
        "size_bytes": size_bytes,
        "context": document_context,
        "truncated": truncated,
    }
