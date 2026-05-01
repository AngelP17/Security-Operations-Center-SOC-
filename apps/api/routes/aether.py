from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from apps.api.deps import get_db
from apps.api.schemas.incidents import AetherTicketResponse
from apps.api.services.aether_client import aether_client

router = APIRouter(prefix="/api/incidents", tags=["aether"])


@router.post("/{incident_id}/create-aether-ticket", response_model=AetherTicketResponse)
def create_aether_ticket(incident_id: int, db: Session = Depends(get_db)):
    link = aether_client.create_ticket(db, incident_id)
    return AetherTicketResponse(
        incident_id=link.incident_id,
        aether_ticket_id=link.aether_ticket_id,
        aether_ticket_url=link.aether_ticket_url,
        sync_status=link.sync_status,
    )
