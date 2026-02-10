from sqlalchemy import BigInteger, Integer, String, Date, DateTime, Text, Enum, DECIMAL, TIMESTAMP, ForeignKey, JSON, UniqueConstraint, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .db import Base

class Patient(Base):
    __tablename__="patients"
    id: Mapped[int]=mapped_column(BigInteger, primary_key=True, autoincrement=True)
    full_name: Mapped[str]=mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[str|None]=mapped_column(Date, nullable=True)
    sex: Mapped[str]=mapped_column(Enum("male","female","unknown"), nullable=False, server_default="unknown")
    no_known_allergies: Mapped[int]=mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[str]=mapped_column(TIMESTAMP, server_default=func.current_timestamp(), nullable=False)
    updated_at: Mapped[str]=mapped_column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp(), nullable=False)
    identifiers = relationship("PatientIdentifier", back_populates="patient", cascade="all, delete-orphan")
    encounters = relationship("Encounter", back_populates="patient", cascade="all, delete-orphan")

class PatientIdentifier(Base):
    __tablename__="patient_identifiers"
    __table_args__=(UniqueConstraint("id_type","id_value", name="uq_identifier"),)
    id: Mapped[int]=mapped_column(BigInteger, primary_key=True, autoincrement=True)
    patient_id: Mapped[int]=mapped_column(BigInteger, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    id_type: Mapped[str]=mapped_column(String(50), nullable=False, server_default="national_id")
    id_value: Mapped[str]=mapped_column(String(100), nullable=False)
    created_at: Mapped[str]=mapped_column(TIMESTAMP, server_default=func.current_timestamp(), nullable=False)
    patient = relationship("Patient", back_populates="identifiers")

class Encounter(Base):
    __tablename__="encounters"
    id: Mapped[int]=mapped_column(BigInteger, primary_key=True, autoincrement=True)
    patient_id: Mapped[int]=mapped_column(BigInteger, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    encounter_datetime: Mapped[str]=mapped_column(DateTime, nullable=False, server_default=func.current_timestamp())
    chief_complaint: Mapped[str|None]=mapped_column(Text, nullable=True)
    clinical_summary: Mapped[str|None]=mapped_column(Text, nullable=True)
    weight_kg: Mapped[float|None]=mapped_column(DECIMAL(5,2), nullable=True)
    pregnancy_status: Mapped[str]=mapped_column(Enum("pregnant","not_pregnant","unknown"), nullable=False, server_default="unknown")
    specialty_code: Mapped[str|None]=mapped_column(String(50), nullable=True)
    created_at: Mapped[str]=mapped_column(TIMESTAMP, server_default=func.current_timestamp(), nullable=False)
    updated_at: Mapped[str]=mapped_column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp(), nullable=False)
    patient = relationship("Patient", back_populates="encounters")
    items = relationship("EncounterItem", back_populates="encounter", cascade="all, delete-orphan")

class EncounterItem(Base):
    __tablename__="encounter_items"
    id: Mapped[int]=mapped_column(BigInteger, primary_key=True, autoincrement=True)
    encounter_id: Mapped[int]=mapped_column(BigInteger, ForeignKey("encounters.id", ondelete="CASCADE"), nullable=False)
    item_type: Mapped[str]=mapped_column(Enum("VITALS","DIAGNOSIS","PMH","MEDICATION","PLAN","OUTCOME","NOTE"), nullable=False)
    summary_text: Mapped[str|None]=mapped_column(String(255), nullable=True)
    payload_json: Mapped[dict]=mapped_column(JSON, nullable=False)
    created_at: Mapped[str]=mapped_column(TIMESTAMP, server_default=func.current_timestamp(), nullable=False)
    encounter = relationship("Encounter", back_populates="items")
