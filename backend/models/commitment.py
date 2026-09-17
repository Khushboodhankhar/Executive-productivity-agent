from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class Commitment(BaseModel):
    """
    Represents a task or obligation in the Executive Productivity Agent.
    """

    task_id: str = Field(..., description="Unique identifier for the task")
    title: str = Field(..., description="Short descriptive title of the commitment")

    owner: Optional[str] = Field(
        None,
        description="Person responsible for the task"
    )

    counterparty: Optional[str] = Field(
        None,
        description="Other party involved"
    )

    status: str = Field(
        "open",
        description="Current status of the task (e.g., open, done)"
    )

    deadline: Optional[str] = Field(
        None,
        description="Deadline in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DD HH:MM)"
    )

    deadline_precision: Optional[str] = Field(
        None,
        description="Precision of deadline (e.g., exact, approximate, quarter)"
    )

    classification: str = Field(
        ...,
        description="MY_ACTION or WAITING_ON_OTHERS"
    )

    source_ids: List[str] = Field(
        default_factory=list,
        description="References to source documents"
    )

    confidence: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0"
    )

    ownership_unclear: bool = Field(
        False,
        description="True when no person is explicitly confirmed as owner in the source text"
    )

    @field_validator("deadline")
    @classmethod
    def validate_deadline(cls, v: Optional[str]) -> Optional[str]:
        """
        Ensures the deadline string is in ISO 8601 format
        (YYYY-MM-DD, optionally with HH:MM).
        """
        if v:
            try:
                datetime.fromisoformat(v)
            except ValueError:
                raise ValueError(
                    "Deadline must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DD HH:MM)"
                )
        return 