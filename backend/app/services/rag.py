from pathlib import Path
from tempfile import NamedTemporaryFile

from langchain_community.document_loaders import Docx2txtLoader, PyPDFLoader
from langchain_core.documents import Document

TEXT_EXTENSIONS = frozenset({".md", ".txt"})
SUPPORTED_EXTENSIONS = frozenset({".docx", ".md", ".pdf", ".txt"})
MAX_DOCUMENT_CONTEXT_CHARACTERS = 12_000


class DocumentProcessingError(ValueError):
    pass


def extract_document_context(filename: str, content: bytes) -> tuple[str, bool]:
    documents = extract_documents(filename, content)
    text = "\n\n".join(
        document.page_content.strip()
        for document in documents
        if document.page_content.strip()
    )
    truncated = len(text) > MAX_DOCUMENT_CONTEXT_CHARACTERS

    return text[:MAX_DOCUMENT_CONTEXT_CHARACTERS].rstrip(), truncated


def extract_documents(filename: str, content: bytes) -> list[Document]:
    extension = Path(filename).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise DocumentProcessingError(
            f"Text extraction for {extension or 'files without an extension'} "
            "is not supported."
        )

    if extension in TEXT_EXTENSIONS:
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError as error:
            raise DocumentProcessingError(
                "Text documents must use UTF-8 encoding."
            ) from error

        documents = [Document(page_content=text, metadata={})]
    else:
        documents = _load_binary_document(content, extension)

    if not any(document.page_content.strip() for document in documents):
        raise DocumentProcessingError("The document does not contain readable text.")

    return documents


def _load_binary_document(content: bytes, extension: str) -> list[Document]:
    temporary_path: str | None = None

    try:
        with NamedTemporaryFile(suffix=extension, delete=False) as temporary_file:
            temporary_file.write(content)
            temporary_path = temporary_file.name

        if extension == ".pdf":
            return PyPDFLoader(temporary_path).load()

        return Docx2txtLoader(temporary_path).load()
    except (ImportError, OSError, ValueError) as error:
        raise DocumentProcessingError(
            "Garden Mind could not extract readable text from that document."
        ) from error
    finally:
        if temporary_path is not None:
            Path(temporary_path).unlink(missing_ok=True)
