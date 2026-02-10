from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from datetime import date, datetime

class PatientCreate(BaseModel):
    full_name: str
    date_of_birth: Optional[date]=None
    sex: str="unknown"
    no_known_allergies: bool=False
    national_id: Optional[str]=None

class PatientOut(BaseModel):
    id:int
    full_name:str
    date_of_birth: Optional[date]
    sex:str
    no_known_allergies: bool

class EncounterCreate(BaseModel):
    encounter_datetime: Optional[datetime]=None
    pregnancy_status: str="unknown"

class EncounterOut(BaseModel):
    id:int
    patient_id:int
    encounter_datetime: datetime
    pregnancy_status: str

class EncounterItemUpsert(BaseModel):
    payload_json: Dict[str,Any]=Field(default_factory=dict)
    summary_text: Optional[str]=None

class EncounterItemOut(BaseModel):
    id:int
    encounter_id:int
    item_type:str
    summary_text: Optional[str]
    payload_json: Dict[str,Any]
    created_at: datetime

class EncounterSheet(BaseModel):
    encounter: EncounterOut
    items: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
