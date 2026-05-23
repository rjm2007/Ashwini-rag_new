"""OpenAI Chat Completions kwargs for GPT-4 vs GPT-5 model families."""


def chat_create_kwargs(model: str, limit: int) -> dict:
    """Output limit + optional temperature (GPT-5 family omits temperature)."""
    kw = completion_limit_kw(model, limit)
    if _supports_custom_temperature(model):
        kw["temperature"] = 0
    return kw


def _supports_custom_temperature(model: str) -> bool:
    """GPT-5 / o-series only allow the default temperature."""
    m = (model or "").lower()
    return not m.startswith(("gpt-5", "o1", "o3", "o4"))


def completion_limit_kw(model: str, limit: int) -> dict:
    """
    GPT-5 / o-series models reject max_tokens; use max_completion_tokens instead.
    GPT-4o and older chat models still use max_tokens.
    """
    m = (model or "").lower()
    if m.startswith(("gpt-5", "o1", "o3", "o4")):
        return {"max_completion_tokens": limit}
    return {"max_tokens": limit}
