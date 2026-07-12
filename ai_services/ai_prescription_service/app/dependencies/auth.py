from fastapi import Request, HTTPException, status

async def get_current_user(request: Request):
    """
    Placeholder dependency for user authentication.
    Currently returns a mock user as authorization is disabled for the MVP.
    """
    return {"user_id": "mock_doctor_123", "role": "doctor"}
