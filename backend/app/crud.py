from sqlalchemy.orm import Session
from sqlalchemy import select
from .models import Patient, PatientIdentifier, Encounter, EncounterItem
from .schemas import PatientCreate, EncounterCreate
from datetime import datetime

def create_patient(db: Session, data: PatientCreate) -> Patient:
    p=Patient(full_name=data.full_name, date_of_birth=data.date_of_birth, sex=data.sex, no_known_allergies=1 if data.no_known_allergies else 0)
    db.add(p); db.flush()
    if data.national_id:
        db.add(PatientIdentifier(patient_id=p.id, id_type="national_id", id_value=data.national_id))
    db.commit(); db.refresh(p); return p

def search_patients(db: Session, q: str):
    p1=db.execute(select(Patient).where(Patient.full_name.like(f"%{q}%"))).scalars().all()
    p2=db.execute(select(Patient).join(PatientIdentifier).where(PatientIdentifier.id_value.like(f"%{q}%"))).scalars().all()
    by={p.id:p for p in p1}
    for p in p2: by[p.id]=p
    return list(by.values())

def get_patient(db: Session, patient_id:int): return db.get(Patient, patient_id)
def create_encounter(db: Session, patient_id:int, data: EncounterCreate)->Encounter:
    e=Encounter(patient_id=patient_id, encounter_datetime=data.encounter_datetime or datetime.utcnow(), pregnancy_status=data.pregnancy_status)
    db.add(e); db.commit(); db.refresh(e); return e
def get_encounter(db: Session, encounter_id:int): return db.get(Encounter, encounter_id)

def upsert_item(db: Session, encounter_id:int, item_type:str, payload:dict, summary_text:str|None=None):
    ex=db.execute(select(EncounterItem).where(EncounterItem.encounter_id==encounter_id, EncounterItem.item_type==item_type)).scalars().first()
    if ex:
        ex.payload_json=payload; ex.summary_text=summary_text; db.commit(); db.refresh(ex); return ex
    it=EncounterItem(encounter_id=encounter_id, item_type=item_type, payload_json=payload, summary_text=summary_text)
    db.add(it); db.commit(); db.refresh(it); return it

def sheet_items(db: Session, encounter_id:int):
    items=db.execute(select(EncounterItem).where(EncounterItem.encounter_id==encounter_id)).scalars().all()
    return {i.item_type:i.payload_json for i in items}

def get_patient_export_bundle(db: Session, patient_id: int):
    """Return patient + encounters + items for export."""
    p = db.get(Patient, patient_id)
    if not p:
        return None
    # identifiers
    ids = db.execute(select(PatientIdentifier).where(PatientIdentifier.patient_id==patient_id)).scalars().all()
    encs = db.execute(select(Encounter).where(Encounter.patient_id==patient_id).order_by(Encounter.encounter_datetime.desc())).scalars().all()
    enc_items = {}
    for e in encs:
        items = db.execute(select(EncounterItem).where(EncounterItem.encounter_id==e.id)).scalars().all()
        enc_items[e.id] = items
    return {"patient": p, "identifiers": ids, "encounters": encs, "items": enc_items}
