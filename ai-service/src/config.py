from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """This class stores AI service configuration from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = ""
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    s3_bucket_name: str = ""
    sqs_queue_url: str = ""
    qdrant_url: str = "http://qdrant:6333"
    qdrant_api_key: str = ""
    qdrant_collection: str = "warranty_chunks"
    openai_api_key: str = ""
    small_model: str = "gpt-5.4-mini"
    large_model: str = "gpt-5.5"


settings = Settings()
