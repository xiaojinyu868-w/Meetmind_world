"""Use the working deployment alias for visitor-initiated conversations."""
from urllib.parse import urlsplit


def interactive_chat(provider, messages, **options):
    config = getattr(provider, "config", {})
    # The original DashScope alias returns model_not_found. Keep custom gateways
    # and explicitly selected models on their own configuration.
    if (config.get("model") == "deepseek-v4-flash"
            and urlsplit(config.get("api_base", "")).hostname == "dashscope.aliyuncs.com"):
        options["model"] = "deepseek-v4.1-flash"
    return provider.chat(messages, **options)


def interactive_json_chat(provider, messages):
    return interactive_chat(provider, messages, response_format={"type": "json_object"})
