from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse, Response

router = APIRouter(tags=["seo"])

# EC2 production path
_SERVER_ROOT = Path("/var/www/bullslong")
# Local dev fallback (repo root)
_REPO_ROOT = Path(__file__).resolve().parents[3]


def _find_static(name: str) -> Path | None:
    candidates = [
        _SERVER_ROOT / "frontend" / "dist" / name,
        _SERVER_ROOT / "frontend" / "public" / name,
        _REPO_ROOT / "frontend" / "dist" / name,
        _REPO_ROOT / "frontend" / "public" / name,
    ]
    for path in candidates:
        if path.is_file():
            return path
    return None


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap_xml() -> Response:
    path = _find_static("sitemap.xml")
    if path is None:
        return Response(status_code=404, content="sitemap not found")
    return FileResponse(
        path,
        media_type="application/xml; charset=utf-8",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/robots.txt", include_in_schema=False)
def robots_txt() -> Response:
    path = _find_static("robots.txt")
    if path is None:
        return Response(status_code=404, content="robots not found")
    return FileResponse(
        path,
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": "public, max-age=3600"},
    )
