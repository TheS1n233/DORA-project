# -*- coding: utf-8 -*-
# fhir.py
# Minimal FHIR Observation/Bundle mapping for blood pressure.

from datetime import datetime
from typing import List, Dict

def bp_observation(user_id: str, device_id: str, ts: datetime, systolic: float, diastolic: float, pulse: float | None):
    # Minimal FHIR R4 Observation for BP
    # Note: This is a simplified subset suitable for initial integration.
    return {
        "resourceType": "Observation",
        "status": "final",
        "category": [{"coding": [{"system":"http://terminology.hl7.org/CodeSystem/observation-category","code":"vital-signs"}]}],
        "code": {"coding": [{"system":"http://loinc.org","code":"85354-9","display":"Blood pressure panel with all children optional"}]},
        "subject": {"reference": f"Patient/{user_id}"},
        "effectiveDateTime": ts.isoformat(),
        "device": {"reference": f"Device/{device_id}"},
        "component": [
            {
                "code": {"coding":[{"system":"http://loinc.org","code":"8480-6","display":"Systolic blood pressure"}]},
                "valueQuantity": {"value": systolic, "unit": "mmHg", "system":"http://unitsofmeasure.org","code":"mm[Hg]"}
            },
            {
                "code": {"coding":[{"system":"http://loinc.org","code":"8462-4","display":"Diastolic blood pressure"}]},
                "valueQuantity": {"value": diastolic, "unit": "mmHg", "system":"http://unitsofmeasure.org","code":"mm[Hg]"}
            }
        ] + (
            [{
                "code": {"coding":[{"system":"http://loinc.org","code":"8867-4","display":"Heart rate"}]},
                "valueQuantity": {"value": pulse, "unit": "beats/minute", "system":"http://unitsofmeasure.org","code":"/min"}
            }] if pulse is not None else []
        )
    }

def bundle(observations: List[Dict]):
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [{"resource": obs} for obs in observations]
    }

