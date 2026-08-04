"""MVP2 asynchronous-style workflows.

The local adapter executes synchronously, while the service interfaces return job-shaped
results so a Redis/PostgreSQL worker can replace it without changing API contracts.
"""
