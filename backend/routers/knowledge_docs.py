"""Knowledge document upload + text extraction + keyword search."""
import io
import re
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pypdf import PdfReader
from docx import Document as DocxDoc
from db import get_db
from models_phase3 import KnowledgeDoc, KnowledgeChunk
from models import _uuid, _now_iso
from security import require_tenant_user, require_tenant_owner_or_admin

router = APIRouter(prefix="/tenants/knowledge-docs", tags=["knowledge-docs"])

CHUNK = 1200  # characters per chunk


def _extract_text(filename: str, content: bytes) -> str:
    name = filename.lower()
    try:
        if name.endswith(".pdf"):
            r = PdfReader(io.BytesIO(content))
            return "\n".join([(p.extract_text() or "") for p in r.pages])
        if name.endswith(".docx"):
            d = DocxDoc(io.BytesIO(content))
            return "\n".join([p.text for p in d.paragraphs])
        return content.decode("utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(400, f"Failed to extract text: {e}")


def _chunk(text: str, size: int = CHUNK):
    # Clean whitespace and chunk by paragraph boundaries where possible
    text = re.sub(r"[\t ]+", " ", text).strip()
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    out = []
    cur = ""
    for p in paras:
        if len(cur) + len(p) + 2 <= size:
            cur = (cur + "\n\n" + p).strip()
        else:
            if cur: out.append(cur)
            if len(p) <= size:
                cur = p
            else:
                for i in range(0, len(p), size):
                    out.append(p[i:i + size])
                cur = ""
    if cur: out.append(cur)
    return out


@router.get("")
async def list_docs(user: dict = Depends(require_tenant_user)):
    db = get_db()
    return await db.knowledge_docs.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.post("")
async def upload_doc(
    file: UploadFile = File(...),
    title: str = Form(""),
    tags: str = Form(""),
    user: dict = Depends(require_tenant_owner_or_admin),
):
    db = get_db()
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "Max 10MB per file")
    text = _extract_text(file.filename, content)
    chunks = _chunk(text)
    doc = KnowledgeDoc(
        tenant_id=user["tenant_id"],
        title=(title or file.filename),
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        chunk_count=len(chunks),
        tags=[t.strip() for t in tags.split(",") if t.strip()],
    )
    doc_payload = dict(doc.model_dump())
    await db.knowledge_docs.insert_one(doc_payload)
    for i, chunk in enumerate(chunks):
        kc = KnowledgeChunk(
            tenant_id=user["tenant_id"], doc_id=doc.id, doc_title=doc.title,
            chunk_idx=i, content=chunk,
        )
        await db.knowledge_chunks.insert_one(dict(kc.model_dump()))
    return doc.model_dump()


@router.delete("/{doc_id}")
async def delete_doc(doc_id: str, user: dict = Depends(require_tenant_owner_or_admin)):
    db = get_db()
    res = await db.knowledge_docs.delete_one({"id": doc_id, "tenant_id": user["tenant_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    await db.knowledge_chunks.delete_many({"doc_id": doc_id, "tenant_id": user["tenant_id"]})
    return {"status": "ok"}


@router.get("/search")
async def search_knowledge(q: str, user: dict = Depends(require_tenant_user), limit: int = 8):
    db = get_db()
    # Simple keyword search — score by term matches
    terms = [t.lower() for t in re.findall(r"\w+", q) if len(t) > 2]
    if not terms:
        return []
    rows = await db.knowledge_chunks.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(2000)
    scored = []
    for r in rows:
        lc = r["content"].lower()
        s = sum(lc.count(t) for t in terms)
        if s > 0:
            scored.append({**r, "score": s})
    scored.sort(key=lambda x: -x["score"])
    return scored[:limit]


async def retrieve_relevant_chunks(tenant_id: str, question: str, limit: int = 5) -> list[dict]:
    """Used by the receptionist + advisor system prompts."""
    db = get_db()
    terms = [t.lower() for t in re.findall(r"\w+", question or "") if len(t) > 3]
    if not terms:
        return []
    rows = await db.knowledge_chunks.find({"tenant_id": tenant_id}, {"_id": 0, "content": 1, "doc_title": 1}).to_list(1500)
    scored = []
    for r in rows:
        lc = r["content"].lower()
        s = sum(lc.count(t) for t in terms)
        if s > 0:
            scored.append({**r, "score": s})
    scored.sort(key=lambda x: -x["score"])
    return scored[:limit]
