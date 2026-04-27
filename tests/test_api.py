import pytest
from apps.api.config import settings


def test_demo_scan_writes_assets_to_db(client):
    """Demo scan should create assets, events, incidents, and recommendations in the database."""
    response = client.post("/api/scans/demo")
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "demo"
    assert data["assets_discovered"] == 6
    assert data["observations_created"] == 6
    assert data["status"] == "completed"

    # Verify assets were written
    assets_resp = client.get("/api/assets/")
    assert assets_resp.status_code == 200
    assets = assets_resp.json()["items"]
    assert len(assets) == 6

    # Verify incidents were created
    incidents_resp = client.get("/api/incidents/")
    assert incidents_resp.status_code == 200
    incidents = incidents_resp.json()["items"]
    assert len(incidents) > 0

    # Verify events were created
    events_resp = client.get("/api/events/")
    assert events_resp.status_code == 200
    events = events_resp.json()["items"]
    assert len(events) > 0


def test_risk_engine_critical_unauthorized_smb_rdp_asset(client):
    """The unauthorized contractor laptop with SMB/RDP should get a critical risk score."""
    client.post("/api/scans/demo")

    assets_resp = client.get("/api/assets/")
    assets = assets_resp.json()["items"]

    # Find the contractor laptop
    laptop = next((a for a in assets if a["hostname"] == "UNKNOWN-LAPTOP-17"), None)
    assert laptop is not None

    risk_resp = client.get(f"/api/assets/{laptop['id']}/risk")
    assert risk_resp.status_code == 200
    risk = risk_resp.json()

    assert risk["risk_level"] == "critical"
    assert risk["risk_score"] >= 80
    assert any("unauthorized" in r.lower() for r in risk["triggered_rules"])
    assert risk["exposure_score"] > 0


def test_lab_scan_blocked_when_disabled(client):
    """Lab scan should be blocked when REAL_SCAN_ENABLED is false."""
    original = settings.REAL_SCAN_ENABLED
    settings.REAL_SCAN_ENABLED = False
    try:
        response = client.post("/api/scans/lab", json={"target_cidr": "192.168.1.0/24"})
        assert response.status_code == 403
    finally:
        settings.REAL_SCAN_ENABLED = original


def test_lab_scan_public_cidr_rejected(client):
    """Lab scan should reject public internet CIDRs."""
    original = settings.REAL_SCAN_ENABLED
    settings.REAL_SCAN_ENABLED = True
    try:
        response = client.post("/api/scans/lab", json={"target_cidr": "8.8.8.0/24"})
        assert response.status_code == 403
    finally:
        settings.REAL_SCAN_ENABLED = original


def test_command_endpoint_returns_db_metrics(client):
    """Command endpoint should return real database-backed metrics."""
    client.post("/api/scans/demo")

    response = client.get("/api/command/")
    assert response.status_code == 200
    data = response.json()

    assert data["kpis"]["total_assets"] == 6
    assert data["kpis"]["open_incidents"] > 0
    assert data["data_freshness"] in ["fresh", "aging", "stale"]
    assert data["highest_risk_incident"] is not None
    assert data["recommended_action"] is not None


def test_create_aether_ticket_disabled_mode(client):
    """When AETHER_ENABLED=false, creating a ticket should record a pending local link."""
    client.post("/api/scans/demo")

    # Get an incident
    incidents_resp = client.get("/api/incidents/")
    incidents = incidents_resp.json()["items"]
    assert len(incidents) > 0
    incident_id = incidents[0]["id"]

    original = settings.AETHER_ENABLED
    settings.AETHER_ENABLED = False
    try:
        response = client.post(f"/api/incidents/{incident_id}/create-aether-ticket")
        assert response.status_code == 200
        data = response.json()
        assert data["sync_status"] == "disabled"
        assert data["aether_ticket_id"] == f"pending-{incident_id}"
    finally:
        settings.AETHER_ENABLED = original


def test_create_aether_ticket_is_idempotent(client):
    """Creating an Aether ticket twice should return the existing local link."""
    client.post("/api/scans/demo")
    incident_id = client.get("/api/incidents/").json()["items"][0]["id"]

    original = settings.AETHER_ENABLED
    settings.AETHER_ENABLED = False
    try:
        first = client.post(f"/api/incidents/{incident_id}/create-aether-ticket")
        second = client.post(f"/api/incidents/{incident_id}/create-aether-ticket")
        assert first.status_code == 200
        assert second.status_code == 200
        assert first.json() == second.json()

        incident = client.get(f"/api/incidents/{incident_id}").json()
        assert incident["aether_sync_status"] == "disabled"
        assert incident["aether_ticket_id"] == f"pending-{incident_id}"
    finally:
        settings.AETHER_ENABLED = original
