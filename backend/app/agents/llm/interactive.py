"""JSON responses for visitor-initiated exercises on the island and in the courtyard."""
from urllib.parse import urlsplit


def interactive_json_chat(provider, messages):
    options = {"response_format": {"type": "json_object"}}
    config = getattr(provider, "config", {})
    # The original DashScope alias returns model_not_found. Keep custom gateways
    # and explicitly selected models on their own configuration.
    if (config.get("model") == "deepseek-v4-flash"
            and urlsplit(config.get("api_base", "")).hostname == "dashscope.aliyuncs.com"):
        options["model"] = "deepseek-v4.1-flash"
    return provider.chat(messages, **options)
