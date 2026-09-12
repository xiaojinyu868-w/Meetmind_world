"""Experimental MeetMind event core. Authenticate actors before supplying events."""
from .replay import DuplicateEventConflict, project_events
from .adapters import calendar_event_to_envelope, checkin_to_envelope
from .recipes import validate_recipe, apply_patch_recipe, parse_recipe, parse_patch
from .action_plans import validate_action_plan, action_calendar

__version__ = "0.1.0a1"
__all__ = [
    "DuplicateEventConflict", "project_events", "calendar_event_to_envelope",
    "checkin_to_envelope", "validate_recipe", "apply_patch_recipe", "parse_recipe",
    "parse_patch", "validate_action_plan", "action_calendar",
]
