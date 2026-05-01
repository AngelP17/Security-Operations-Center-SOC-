import json

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from apps.api.models.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_uid = Column(String, unique=True, nullable=False)
    hostname = Column(String)
    ip_address = Column(String)
    mac_address = Column(String)
    site = Column(String)
    segment = Column(String)
    asset_type = Column(String)
    authorization_state = Column(String, default="unknown")
    owner = Column(String)
    status = Column(String, default="watch")
    first_seen = Column(DateTime)
    last_seen = Column(DateTime)
    open_ports_json = Column(Text, default="[]")
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    @property
    def open_ports(self):
        return json.loads(self.open_ports_json or "[]")

    @open_ports.setter
    def open_ports(self, value):
        self.open_ports_json = json.dumps(value)

    @property
    def metadata_(self):
        return json.loads(self.metadata_json or "{}")

    @metadata_.setter
    def metadata_(self, value):
        self.metadata_json = json.dumps(value)
